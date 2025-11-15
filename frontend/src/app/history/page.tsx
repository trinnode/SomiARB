'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const HistoryPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'successful' | 'failed'>('all');

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

  const transactions = [
    {
      id: '1',
      type: 'arbitrage',
      pair: 'ETH/USDC',
      timestamp: '2025-11-14T10:30:00Z',
      amount: '2.5 ETH',
      profit: '+$125.67',
      status: 'successful',
      exchanges: ['QuickSwap', 'StandardCLOB'],
      gasUsed: '0.012 ETH',
      txHash: '0x1234...5678'
    },
    {
      id: '2', 
      type: 'deposit',
      pair: 'ETH',
      timestamp: '2025-11-14T09:15:00Z',
      amount: '5.0 ETH',
      profit: '',
      status: 'successful',
      exchanges: [],
      gasUsed: '0.003 ETH',
      txHash: '0x2345...6789'
    },
    {
      id: '3',
      type: 'arbitrage',
      pair: 'DAI/USDC',
      timestamp: '2025-11-14T08:45:00Z',
      amount: '10,000 DAI',
      profit: '+$45.23',
      status: 'successful',
      exchanges: ['QuickSwap', 'StandardCLOB'],
      gasUsed: '0.015 ETH',
      txHash: '0x3456...7890'
    },
    {
      id: '4',
      type: 'arbitrage',
      pair: 'WETH/MATIC',
      timestamp: '2025-11-14T07:20:00Z',
      amount: '1.2 WETH',
      profit: '-$12.34',
      status: 'failed',
      exchanges: ['QuickSwap', 'StandardCLOB'],
      gasUsed: '0.008 ETH',
      txHash: '0x4567...8901'
    },
    {
      id: '5',
      type: 'withdraw',
      pair: 'ETH',
      timestamp: '2025-11-13T16:30:00Z',
      amount: '1.5 ETH',
      profit: '',
      status: 'successful',
      exchanges: [],
      gasUsed: '0.005 ETH',
      txHash: '0x5678...9012'
    }
  ];

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'arbitrage': return '🔄';
      case 'deposit': return '💰';
      case 'withdraw': return '💸';
      default: return '📊';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const summary = {
    totalTransactions: transactions.length,
    successful: transactions.filter(tx => tx.status === 'successful').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
    totalProfit: transactions
      .filter(tx => tx.profit && tx.profit.startsWith('+'))
      .reduce((sum, tx) => sum + parseFloat(tx.profit.replace(/[+$,]/g, '')), 0),
    totalLoss: transactions
      .filter(tx => tx.profit && tx.profit.startsWith('-'))
      .reduce((sum, tx) => sum + parseFloat(tx.profit.replace(/[-$,]/g, '')), 0)
  };

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Transaction History</h1>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
          <Button variant="ghost" size="sm">
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Total Transactions</h3>
          <div className="text-2xl font-bold text-white">{summary.totalTransactions}</div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Success Rate</h3>
          <div className="text-2xl font-bold text-green-400">
            {((summary.successful / summary.totalTransactions) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-slate-400">{summary.successful}/{summary.totalTransactions}</div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Total Profit</h3>
          <div className="text-2xl font-bold text-green-400">
            +${summary.totalProfit.toFixed(2)}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Total Loss</h3>
          <div className="text-2xl font-bold text-red-400">
            -${summary.totalLoss.toFixed(2)}
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-3">
        <Button
          variant={filter === 'all' ? 'glow' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({transactions.length})
        </Button>
        <Button
          variant={filter === 'successful' ? 'glow' : 'outline'}
          size="sm"
          onClick={() => setFilter('successful')}
        >
          Successful ({summary.successful})
        </Button>
        <Button
          variant={filter === 'failed' ? 'glow' : 'outline'}
          size="sm"
          onClick={() => setFilter('failed')}
        >
          Failed ({summary.failed})
        </Button>
      </motion.div>

      {/* Transactions List */}
      <motion.div variants={itemVariants} className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="p-6 hover:bg-slate-800/50 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-4">
                <div className="text-2xl">{getTypeIcon(transaction.type)}</div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {transaction.type}
                    </h3>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <div className="text-slate-400 text-sm">
                    {formatTime(transaction.timestamp)}
                  </div>
                  {transaction.exchanges.length > 0 && (
                    <div className="text-slate-400 text-sm mt-1">
                      {transaction.exchanges.join(' → ')}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-white mb-1">
                  {transaction.amount}
                </div>
                {transaction.profit && (
                  <div className={`text-sm font-medium ${
                    transaction.profit.startsWith('+') ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {transaction.profit}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  Gas: {transaction.gasUsed}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                TX: {transaction.txHash}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  View on Explorer
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {filteredTransactions.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Transactions Found</h3>
            <p className="text-slate-400">
              {filter === 'all' 
                ? "You haven't made any transactions yet. Start trading to see your history here!"
                : `No ${filter} transactions found. Try adjusting your filters.`
              }
            </p>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HistoryPage;