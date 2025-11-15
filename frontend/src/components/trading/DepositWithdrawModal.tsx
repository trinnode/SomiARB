'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { VaultTokenOption } from '../../hooks/useContracts';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
  tokenSymbol?: string;
  walletBalanceDisplay?: number;
  vaultBalanceDisplay?: number;
  tokens?: VaultTokenOption[];
  activeToken?: VaultTokenOption | null;
  onSelectToken?: (address: string) => void;
  isPending?: boolean;
  onDeposit?: (amount: string, tokenAddress?: string) => Promise<void> | void;
  onWithdraw?: (amount: string, tokenAddress?: string) => Promise<void> | void;
  isWalletConnected?: boolean;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  isOpen,
  onClose,
  type,
  tokenSymbol = 'STT',
  walletBalanceDisplay = 0,
  vaultBalanceDisplay = 0,
  tokens = [],
  activeToken,
  onSelectToken,
  isPending = false,
  onDeposit,
  onWithdraw,
  isWalletConnected = false,
}) => {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const walletBalanceFormatted = useMemo(() => (
    Number.isFinite(walletBalanceDisplay) ? walletBalanceDisplay : 0
  ), [walletBalanceDisplay]);

  const resolvedTokenSymbol = useMemo(() => (
    activeToken?.symbol || tokenSymbol
  ), [activeToken?.symbol, tokenSymbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      if (type === 'deposit') {
        await onDeposit?.(amount, activeToken?.address);
      } else {
        await onWithdraw?.(amount, activeToken?.address);
      }
      setAmount('');
    } catch (error) {
      console.error(`${type} failed:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxAmount = type === 'deposit'
    ? walletBalanceFormatted
    : (Number.isFinite(vaultBalanceDisplay) ? vaultBalanceDisplay : 0);

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="p-6 bg-slate-900/95 backdrop-blur border border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white capitalize">
                    {type} {resolvedTokenSymbol}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {tokens.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select Token
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {tokens.map((token) => {
                          const isActive = activeToken?.address === token.address;
                          return (
                            <Button
                              key={token.address}
                              type="button"
                              variant={isActive ? 'glow' : 'outline'}
                              size="sm"
                              className="px-3"
                              onClick={() => onSelectToken?.(token.address)}
                              disabled={!isWalletConnected}
                            >
                              {token.symbol}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.000001"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none disabled:opacity-40"
                        disabled={!isWalletConnected}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {resolvedTokenSymbol}
                      </div>
                    </div>
                    
                    {/* Balance Info */}
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-slate-400">
                        Available: {maxAmount.toFixed(4)} {resolvedTokenSymbol}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAmount(maxAmount.toString())}
                        className="text-sky-400 hover:text-sky-300 px-2 py-1"
                        disabled={!isWalletConnected}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  {/* Transaction Info */}
                  {amount && parseFloat(amount) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 p-4 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Amount</span>
                        <span className="text-white">{amount} {resolvedTokenSymbol}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Transaction Fee</span>
                        <span className="text-white">~0.001 {resolvedTokenSymbol}</span>
                      </div>
                      <hr className="border-slate-600" />
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-300">
                          {type === 'deposit' ? 'You will deposit' : 'You will receive'}
                        </span>
                        <span className="text-white">{amount} {resolvedTokenSymbol}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="glow"
                      className="flex-1"
                      disabled={!amount || parseFloat(amount) <= 0 || isSubmitting || isPending || !isWalletConnected}
                    >
                      {isSubmitting || isPending ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{isPending ? 'Confirming...' : 'Processing...'}</span>
                        </div>
                      ) : (
                        `${type === 'deposit' ? 'Deposit' : 'Withdraw'} ${resolvedTokenSymbol}`
                      )}
                    </Button>
                  </div>
                </form>

                {!isWalletConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-500">⚠️</span>
                      <span className="text-sm text-amber-200">
                        Connect your wallet on Somnia to enable vault transactions.
                      </span>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DepositWithdrawModal;