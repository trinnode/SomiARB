'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useWallet } from '../../hooks/useWallet';
import { useSomiArbVault } from '../../hooks/useContracts';
import { DepositWithdrawModal } from '../../components/trading/DepositWithdrawModal';
import { ComingSoonTooltip } from '../../components/ui/ComingSoonTooltip';

const PortfolioPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdraw'>('deposit');
  const {
    formattedBalance,
    symbol,
    isConnecting,
    isConnected,
    isSupportedNetwork,
  } = useWallet();
  const {
    balance: vaultBalance,
    totalAssets,
    walletBalanceFormatted,
    tokens,
    activeToken,
    selectToken,
    isLoading: isVaultLoading,
    deposit,
    withdraw,
    isTransactionLoading,
  } = useSomiArbVault();

  const parseNumeric = (value?: string) => {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const walletTokenBalance = parseNumeric(walletBalanceFormatted || formattedBalance);
  const vaultBalanceValue = parseNumeric(vaultBalance);
  const totalValue = walletTokenBalance + vaultBalanceValue;
  const totalVaultAssets = parseNumeric(totalAssets);
  const resolvedTokenSymbol = activeToken?.symbol || symbol;
  const hasTokenOptions = tokens.length > 0;

  const isLoading = isVaultLoading || isConnecting;
  const walletReady = isConnected && isSupportedNetwork;

  const handleOpenModal = (type: 'deposit' | 'withdraw') => {
    setModalType(type);
    setModalOpen(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const portfolioData = useMemo(() => ({
    totalValue,
    walletBalance: walletTokenBalance,
    vaultBalance: vaultBalanceValue,
    totalReturns: 1247.83,
    totalReturnsPercentage: 12.4,
    dailyPnL: 45.67,
    dailyPnLPercentage: 0.8,
    totalVaultAssets,
  }), [totalValue, walletTokenBalance, vaultBalanceValue, totalVaultAssets]);

  const handleDeposit = useCallback((amount: string, tokenAddress?: string) => {
    return deposit(amount, tokenAddress);
  }, [deposit]);

  const handleWithdraw = useCallback((amount: string, tokenAddress?: string) => {
    return withdraw(amount, tokenAddress);
  }, [withdraw]);

  const handleSelectToken = useCallback((address: string) => {
    selectToken(address);
  }, [selectToken]);

  const positions = [
    {
      pair: 'ETH/USDC',
      amount: '2.45 ETH',
      value: '$7,986.50',
      pnl: '+$324.67',
      pnlPercent: '+4.2%',
      status: 'active'
    },
    {
      pair: 'DAI/USDC', 
      amount: '5,000 DAI',
      value: '$5,002.50',
      pnl: '+$2.50',
      pnlPercent: '+0.05%',
      status: 'active'
    },
    {
      pair: 'WETH/MATIC',
      amount: '1.2 WETH',
      value: '$3,912.00',
      pnl: '-$45.23',
      pnlPercent: '-1.1%',
      status: 'closed'
    }
  ];

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Portfolio Overview</h1>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button
            variant="glow"
            size="sm"
            onClick={() => handleOpenModal('deposit')}
            disabled={!walletReady}
          >
            Deposit
          </Button>
        </div>
      </motion.div>

      {!walletReady && (
        <motion.div variants={itemVariants}>
          <Card className="p-4 border border-amber-400/30 bg-amber-500/5">
            <div className="flex flex-col gap-1 text-sm text-amber-200">
              <span className="font-semibold">Wallet in read-only mode</span>
              <span>Connect to Somnia Mainnet or Testnet to enable deposits and withdrawals.</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Token Selector */}
      {hasTokenOptions && (
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">Vault Asset</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-semibold text-white">{resolvedTokenSymbol}</h2>
                  <span className="text-xs text-slate-500">select to switch balances & flows</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tokens.map((token) => (
                  <Button
                    key={token.address}
                    variant={activeToken?.address === token.address ? 'glow' : 'outline'}
                    size="sm"
                    onClick={() => handleSelectToken(token.address)}
                  >
                    {token.symbol}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Wallet Balance</p>
                <p className="text-2xl font-semibold text-white">{walletTokenBalance.toFixed(4)} {resolvedTokenSymbol}</p>
              </div>
              <div>
                <p className="text-slate-500">Vault Balance</p>
                <p className="text-2xl font-semibold text-white">{vaultBalanceValue.toFixed(4)} {resolvedTokenSymbol}</p>
              </div>
              <div>
                <p className="text-slate-500">Protocol TVL</p>
                <p className="text-2xl font-semibold text-white">{totalVaultAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })} {resolvedTokenSymbol}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <p className="text-2xl font-semibold text-white">{walletReady ? 'Ready' : 'Connect wallet'}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Portfolio Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Portfolio Value',
            accent: 'bg-green-400',
            primary: `$${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            secondary: `+$${portfolioData.totalReturns.toFixed(2)} (${portfolioData.totalReturnsPercentage}%)`,
            secondaryClass: 'text-green-400',
          },
          {
            title: 'Wallet Balance',
            accent: 'bg-blue-400',
            primary: `${portfolioData.walletBalance.toFixed(4)} ${resolvedTokenSymbol}`,
            secondary: 'Available to deposit',
            secondaryClass: 'text-slate-400',
          },
          {
            title: 'Vault Balance',
            accent: 'bg-purple-400',
            primary: `${portfolioData.vaultBalance.toFixed(4)} ${resolvedTokenSymbol}`,
            secondary: `Protocol TVL: ${portfolioData.totalVaultAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${resolvedTokenSymbol}`,
            secondaryClass: 'text-slate-400',
          },
          {
            title: '24h P&L',
            accent: portfolioData.dailyPnL > 0 ? 'bg-green-400' : 'bg-red-400',
            primary: `$${portfolioData.dailyPnL.toFixed(2)}`,
            secondary: `${portfolioData.dailyPnLPercentage > 0 ? '+' : ''}${portfolioData.dailyPnLPercentage}%`,
            secondaryClass: portfolioData.dailyPnL > 0 ? 'text-green-400' : 'text-red-400',
          },
        ].map((card) => (
          <Card key={card.title} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">{card.title}</h3>
              <div className={`w-2 h-2 rounded-full ${card.accent}`}></div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {isLoading ? (
                <div className="h-6 bg-slate-800/80 rounded animate-pulse" />
              ) : (
                card.primary
              )}
            </div>
            <div className={`text-sm ${card.secondaryClass}`}>
              {isLoading ? <div className="h-4 bg-slate-800/50 rounded animate-pulse" /> : card.secondary}
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Active Positions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Active Positions</h2>
        <div className="grid gap-4">
          {positions.map((position, index) => (
            <Card key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{position.pair}</h3>
                    <p className="text-sm text-slate-400">{position.amount}</p>
                  </div>
                  <Badge variant={position.status === 'active' ? 'success' : 'default'}>
                    {position.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-white">{position.value}</div>
                  <div className={`text-sm ${position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {position.pnl} ({position.pnlPercent})
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                {position.status === 'active' && (
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                    Close Position
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Performance Chart Placeholder */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Chart</h3>
          <div className="h-64 bg-slate-800/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-slate-400">Chart coming soon</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="glow" 
              className="h-16 flex flex-col items-center justify-center"
              onClick={() => handleOpenModal('deposit')}
              disabled={!walletReady}
            >
              <span className="text-lg mb-1">💰</span>
              <span>Deposit Funds</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center"
              onClick={() => handleOpenModal('withdraw')}
              disabled={!walletReady}
            >
              <span className="text-lg mb-1">💸</span>
              <span>Withdraw</span>
            </Button>
            <ComingSoonTooltip message="Auto-rebalancing feature coming soon!">
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center" disabled={!walletReady}>
                <span className="text-lg mb-1">🔄</span>
                <span>Rebalance</span>
              </Button>
            </ComingSoonTooltip>
          </div>
        </Card>
      </motion.div>
      
      {/* Deposit/Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        tokenSymbol={resolvedTokenSymbol}
        walletBalanceDisplay={walletTokenBalance}
        vaultBalanceDisplay={vaultBalanceValue}
        tokens={tokens}
        activeToken={activeToken}
        onSelectToken={handleSelectToken}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        isPending={isTransactionLoading}
        isWalletConnected={walletReady}
      />
    </motion.div>
  );
};

export default PortfolioPage;