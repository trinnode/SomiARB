'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { usePortfolio } from '../../stores/arbitrageStore';
import { useAgentMetrics } from '../../stores/agentStore';
import { formatEther, formatPercentage } from '../../lib/utils';

export const PortfolioOverview: React.FC = () => {
  const portfolio = usePortfolio();

  const stats = [
    {
      label: 'Total Balance',
      value: formatEther(portfolio.currentBalance),
      change: portfolio.profitPercentage,
      icon: '💰',
      color: 'text-green-400',
    },
    {
      label: 'Total Profit',
      value: `$${portfolio.totalProfit.toFixed(2)}`,
      change: portfolio.profitPercentage,
      icon: '📈',
      color: 'text-blue-400',
    },
    {
      label: 'Success Rate',
      value: formatPercentage(portfolio.successfulTrades / Math.max(portfolio.totalTrades, 1)),
      change: 0,
      icon: '🎯',
      color: 'text-purple-400',
    },
    {
      label: 'Total Trades',
      value: portfolio.totalTrades.toString(),
      change: 0,
      icon: '⚡',
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="glass" className="hover:border-blue-500/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  {stat.change !== 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-xs ${stat.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stat.change > 0 ? '+' : ''}{stat.change.toFixed(2)}%
                      </span>
                      <Badge 
                        variant={stat.change > 0 ? 'success' : 'error'}
                        size="sm"
                      >
                        {stat.change > 0 ? '↗' : '↘'}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="text-3xl opacity-50">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export const SystemMetrics: React.FC = () => {
  const agentMetrics = useAgentMetrics();
  
  return (
    <Card variant="glass" className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🖥️</span>
          System Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">CPU Usage</span>
                <span className="text-sm font-medium text-slate-200">
                  {agentMetrics.cpuUsage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={agentMetrics.cpuUsage}
                variant={agentMetrics.cpuUsage > 80 ? 'error' : agentMetrics.cpuUsage > 60 ? 'warning' : 'success'}
                animated
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Memory Usage</span>
                <span className="text-sm font-medium text-slate-200">
                  {agentMetrics.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={agentMetrics.memoryUsage}
                variant={agentMetrics.memoryUsage > 80 ? 'error' : agentMetrics.memoryUsage > 60 ? 'warning' : 'success'}
                animated
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Uptime</span>
              <span className="text-sm font-medium text-slate-200">
                {Math.floor(agentMetrics.uptime / 3600)}h {Math.floor((agentMetrics.uptime % 3600) / 60)}m
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Avg Response Time</span>
              <span className="text-sm font-medium text-slate-200">
                {agentMetrics.avgResponseTime}ms
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Error Count</span>
              <Badge variant={agentMetrics.errorCount > 10 ? 'error' : agentMetrics.errorCount > 5 ? 'warning' : 'success'}>
                {agentMetrics.errorCount}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Total Opportunities</span>
              <span className="text-sm font-medium text-green-400">
                {agentMetrics.totalOpportunities}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Successful Trades</span>
              <span className="text-sm font-medium text-blue-400">
                {agentMetrics.successfulTrades}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Success Rate</span>
              <Badge variant="success">
                {formatPercentage(agentMetrics.successfulTrades / Math.max(agentMetrics.totalOpportunities, 1))}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};