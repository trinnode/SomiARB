'use client';

import { useReadContract, useWriteContract, useAccount, useBalance, usePublicClient } from 'wagmi';
import { erc20Abi, formatEther, formatUnits, parseEther, parseUnits } from 'viem';
import { SomiArbVaultABI, getContractAddresses } from '../lib/contracts';
import { notification } from '../components/ui/Notification';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
  WETH: { symbol: 'WETH', decimals: 18 },
  USDC: { symbol: 'USDC', decimals: 6 },
  USDT: { symbol: 'USDT', decimals: 6 },
  DAI: { symbol: 'DAI', decimals: 18 },
  STT: { symbol: 'STT', decimals: 18 },
};

export interface VaultTokenOption {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

// SomiArb Vault Contract Hook
export const useSomiArbVault = () => {
  const { address: userAddress, chainId } = useAccount();
  const publicClient = usePublicClient();
  const contractAddresses = getContractAddresses(chainId || 50312);
  const vaultAddress = contractAddresses.SomiArbVault as `0x${string}`;

  const supportedTokens = useMemo<VaultTokenOption[]>(() => {
    return Object.entries(TOKEN_META)
      .map(([key, meta]) => {
        const address = (contractAddresses as Record<string, string | undefined>)[key];
        if (!address || address === ZERO_ADDRESS) {
          return null;
        }
        return {
          symbol: meta.symbol,
          decimals: meta.decimals,
          address: address as `0x${string}`,
        } satisfies VaultTokenOption;
      })
      .filter((token): token is VaultTokenOption => token !== null);
  }, [contractAddresses]);

  const [activeToken, setActiveToken] = useState<VaultTokenOption | null>(null);

  useEffect(() => {
    if (!activeToken && supportedTokens.length > 0) {
      setActiveToken(supportedTokens[0]);
      return;
    }

    if (activeToken && !supportedTokens.some(token => token.address === activeToken.address)) {
      setActiveToken(supportedTokens[0] ?? null);
    }
  }, [supportedTokens, activeToken]);

  const selectToken = useCallback((address: string) => {
    const nextToken = supportedTokens.find(token => token.address.toLowerCase() === address.toLowerCase());
    setActiveToken(nextToken ?? supportedTokens[0] ?? null);
  }, [supportedTokens]);

  const resolveToken = useCallback((tokenAddress?: string | null) => {
    if (tokenAddress) {
      return supportedTokens.find(token => token.address.toLowerCase() === tokenAddress.toLowerCase()) ?? null;
    }
    return activeToken ?? supportedTokens[0] ?? null;
  }, [activeToken, supportedTokens]);

  const { data: userBalanceRaw, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    address: vaultAddress,
    abi: SomiArbVaultABI,
    functionName: 'getUserBalance',
    args: userAddress && activeToken ? [userAddress, activeToken.address] : undefined,
  });

  const { data: userSharesRaw, isLoading: sharesLoading, refetch: refetchShares } = useReadContract({
    address: vaultAddress,
    abi: SomiArbVaultABI,
    functionName: 'getUserShares',
    args: userAddress && activeToken ? [userAddress, activeToken.address] : undefined,
  });

  const { data: totalAssetsRaw, isLoading: totalAssetsLoading, refetch: refetchTotalAssets } = useReadContract({
    address: vaultAddress,
    abi: SomiArbVaultABI,
    functionName: 'totalDeposits',
    args: activeToken ? [activeToken.address] : undefined,
  });

  const { data: paused, isLoading: pausedLoading } = useReadContract({
    address: vaultAddress,
    abi: SomiArbVaultABI,
    functionName: 'paused',
  });

  const { data: walletTokenBalanceData, isLoading: walletBalanceLoading, refetch: refetchWalletBalance } = useBalance({
    address: userAddress,
    token: activeToken?.address,
    query: {
      enabled: Boolean(userAddress && activeToken),
    },
  });

  const { writeContractAsync } = useWriteContract();
  const [txPending, setTxPending] = useState(false);

  const refreshVaultState = useCallback(async () => {
    await Promise.all([
      refetchBalance?.(),
      refetchShares?.(),
      refetchTotalAssets?.(),
      refetchWalletBalance?.(),
    ]);
  }, [refetchBalance, refetchShares, refetchTotalAssets, refetchWalletBalance]);

  const parseAmount = useCallback((value: string, decimals: number): bigint | null => {
    try {
      const sanitized = value.trim();
      if (!sanitized) return null;
      const parsed = parseUnits(sanitized, decimals);
      return parsed > 0n ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  const deposit = useCallback(async (amount: string, tokenAddress?: string) => {
    if (!userAddress) {
      notification.error('Please connect your wallet first');
      return;
    }
    if (!publicClient) {
      notification.error('Wallet client unavailable');
      return;
    }
    if (!vaultAddress || vaultAddress === ZERO_ADDRESS) {
      notification.error('Vault contract not configured');
      return;
    }

    const token = resolveToken(tokenAddress);
    if (!token) {
      notification.error('No supported vault token found');
      return;
    }

    const amountBigInt = parseAmount(amount, token.decimals);
    if (!amountBigInt) {
      notification.error('Enter a valid amount');
      return;
    }

    try {
      setTxPending(true);
      const allowance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, vaultAddress],
      });

      if (allowance < amountBigInt) {
        const approvalHash = await writeContractAsync({
          address: token.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, amountBigInt],
        });
        notification.info('Approval submitted...');
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      const depositHash = await writeContractAsync({
        address: vaultAddress,
        abi: SomiArbVaultABI,
        functionName: 'deposit',
        args: [token.address, amountBigInt],
      });

      notification.info('Deposit submitted...');
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      notification.success('Deposit confirmed');
      await refreshVaultState();
    } catch (error) {
      console.error('Deposit error:', error);
      notification.error('Deposit failed');
    } finally {
      setTxPending(false);
    }
  }, [publicClient, userAddress, vaultAddress, resolveToken, parseAmount, writeContractAsync, refreshVaultState]);

  const withdraw = useCallback(async (amount: string, tokenAddress?: string) => {
    if (!userAddress) {
      notification.error('Please connect your wallet first');
      return;
    }
    if (!publicClient) {
      notification.error('Wallet client unavailable');
      return;
    }
    if (!vaultAddress || vaultAddress === ZERO_ADDRESS) {
      notification.error('Vault contract not configured');
      return;
    }

    const token = resolveToken(tokenAddress);
    if (!token) {
      notification.error('No supported vault token found');
      return;
    }

    const balance = (userBalanceRaw as bigint | undefined) ?? 0n;
    const shares = (userSharesRaw as bigint | undefined) ?? 0n;

    if (balance === 0n || shares === 0n) {
      notification.error('No vault balance to withdraw');
      return;
    }

    let requestedAmount = parseAmount(amount, token.decimals);
    if (!requestedAmount) {
      notification.error('Enter a valid amount');
      return;
    }

    if (requestedAmount > balance) {
      requestedAmount = balance;
    }

    const sharesToRedeem = (shares * requestedAmount) / balance;
    if (sharesToRedeem === 0n) {
      notification.error('Amount below minimum redeemable threshold');
      return;
    }

    try {
      setTxPending(true);
      const withdrawHash = await writeContractAsync({
        address: vaultAddress,
        abi: SomiArbVaultABI,
        functionName: 'withdraw',
        args: [token.address, sharesToRedeem],
      });

      notification.info('Withdrawal submitted...');
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      notification.success('Withdrawal confirmed');
      await refreshVaultState();
    } catch (error) {
      console.error('Withdraw error:', error);
      notification.error('Withdrawal failed');
    } finally {
      setTxPending(false);
    }
  }, [publicClient, userAddress, vaultAddress, resolveToken, parseAmount, userBalanceRaw, userSharesRaw, writeContractAsync, refreshVaultState]);

  const balanceFormatted = activeToken ? formatUnits((userBalanceRaw as bigint | undefined) ?? 0n, activeToken.decimals) : '0';
  const totalAssetsFormatted = activeToken ? formatUnits((totalAssetsRaw as bigint | undefined) ?? 0n, activeToken.decimals) : '0';
  const walletBalanceFormatted = activeToken ? formatUnits(walletTokenBalanceData?.value ?? 0n, activeToken.decimals) : '0';

  return {
    balance: balanceFormatted,
    totalAssets: totalAssetsFormatted,
    totalSupply: totalAssetsFormatted,
    paused: Boolean(paused),
    walletBalanceFormatted,
    balanceRaw: (userBalanceRaw as bigint | undefined) ?? 0n,
    totalAssetsRaw: (totalAssetsRaw as bigint | undefined) ?? 0n,
    walletBalanceRaw: walletTokenBalanceData?.value ?? 0n,
    tokens: supportedTokens,
    activeToken,
    selectToken,
    isLoading: balanceLoading || totalAssetsLoading || pausedLoading || sharesLoading || walletBalanceLoading,
    isTransactionLoading: txPending,
    deposit,
    withdraw,
    refetchBalance: refreshVaultState,
  };
};

// Token allowance and approval hook
export const useTokenAllowance = (tokenAddress: string, spenderAddress: string) => {
  const { address: userAddress } = useAccount();
  
  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
  });

  const { writeContract, isPending } = useWriteContract();

  const approve = useCallback(async (amount: string) => {
    if (!userAddress) {
      notification.error('Please connect your wallet first');
      return;
    }

    try {
      const amountBigInt = parseEther(amount);
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'approve',
        args: [spenderAddress, amountBigInt],
      });
      notification.info('Approval submitted...');
    } catch (error) {
      console.error('Approval error:', error);
      notification.error('Approval failed');
    }
  }, [writeContract, userAddress, tokenAddress, spenderAddress]);

  return {
    allowance: allowance ? formatEther(allowance as bigint) : '0',
    isLoading,
    isPending,
    approve,
    refetch,
  };
};

interface OpportunityPreview {
  id: string;
  tokenPair: string;
  exchange1: string;
  exchange2: string;
  priceA: string;
  priceB: string;
  spread: string;
  profit: string;
  profitPercent: string;
  minAmount: string;
  maxAmount: string;
  gasEstimate: string;
  confidence: number;
  lastUpdated: number;
}

// Arbitrage opportunities hook with real-time updates
export const useArbitrageOpportunities = () => {
  const { chainId } = useAccount();
  const [opportunities, setOpportunities] = useState<OpportunityPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);

    // Simulate API call or contract reads for arbitrage opportunities
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockOpportunities = [
      {
        id: `${chainId || 1}-1`,
        tokenPair: 'WETH/USDC',
        exchange1: 'QuickSwap',
        exchange2: 'StandardCLOB',
        priceA: '3250.50',
        priceB: '3255.80',
        spread: '0.16%',
        profit: '152.30',
        profitPercent: '4.69%',
        minAmount: '0.1',
        maxAmount: '10.0',
        gasEstimate: '0.015',
        confidence: 85,
        lastUpdated: Date.now(),
      },
      {
        id: `${chainId || 1}-2`,
        tokenPair: 'DAI/USDC',
        exchange1: 'QuickSwap',
        exchange2: 'StandardCLOB',
        priceA: '1.0025',
        priceB: '1.0078',
        spread: '0.53%',
        profit: '425.80',
        profitPercent: '2.14%',
        minAmount: '100',
        maxAmount: '50000',
        gasEstimate: '0.012',
        confidence: 92,
        lastUpdated: Date.now(),
      },
    ];

    setOpportunities(mockOpportunities);
    setIsLoading(false);
  }, [chainId]);

  // Mock arbitrage opportunity detection (replace with real implementation)
  useEffect(() => {
    const kickOff = setTimeout(() => {
      void fetchOpportunities();
    }, 0);

    // Refresh opportunities every 30 seconds
    const interval = setInterval(fetchOpportunities, 30000);

    return () => {
      clearTimeout(kickOff);
      clearInterval(interval);
    };
  }, [fetchOpportunities]);

  return {
    opportunities,
    isLoading,
    refetch: fetchOpportunities,
  };
};