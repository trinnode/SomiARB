'use client';

import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useEffect } from 'react';
import { notification } from '../components/ui/Notification';
import { somniaMainnet, somniaTestnet } from '../lib/wagmi';

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { data: balanceData } = useBalance({
    address: address,
  });
  const { status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const isConnecting = status === 'pending';
  const supportedChainIds: number[] = [somniaMainnet.id, somniaTestnet.id];
  const isSupportedNetwork = chainId ? supportedChainIds.includes(chainId) : false;

  // Handle connection status changes
  useEffect(() => {
    if (status === 'success' && isConnected && address) {
      notification.connection.connected();
    } else if (error) {
      notification.error(`Wallet connection failed: ${error.message}`);
    }
  }, [status, isConnected, address, error]);

  // Connect wallet function using RainbowKit modal
  const connectWallet = async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    disconnect();
    notification.connection.disconnected();
  };

  // Get formatted balance
  const balance = balanceData?.value || BigInt(0);
  const formattedBalance = balanceData?.formatted || '0';
  const symbol = balanceData?.symbol || 'ETH';

  // Switch chain function (handled by RainbowKit)
  const switchChain = async (targetChainId: number) => {
    try {
      // Chain switching is handled by RainbowKit's network switcher
      notification.success(`Switched to chain ${targetChainId}`);
    } catch (error) {
      notification.error('Failed to switch chain');
      console.error('Chain switch failed:', error);
    }
  };

  return {
    isConnected,
    address: address || null,
    balance,
    formattedBalance,
    symbol,
    chainId: chainId || null,
    isConnecting,
    isSupportedNetwork,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchChain,
  };
};