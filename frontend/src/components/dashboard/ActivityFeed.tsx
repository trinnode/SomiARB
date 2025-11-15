'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useActiveExecutions, useExecutionHistory } from '../../stores/arbitrageStore';
import { useAgentConnection } from '../../stores/agentStore';
import { formatEther, timeAgo } from '../../lib/utils';

export const ActivityFeed: React.FC = () => {
  const activeExecutions = useActiveExecutions();
  const executionHistory = useExecutionHistory();
  const agentConnection = useAgentConnection();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      case 'executing':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      case 'executing':
        return '⚡';
      default:
        return '📋';
    }
  };

  const allActivities = [
    ...activeExecutions.map(exec => ({ ...exec, type: 'execution' as const, timestamp: exec.executedAt })),
    ...executionHistory.slice(0, 10).map(exec => ({ ...exec, type: 'history' as const, timestamp: exec.executedAt }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Activity Feed
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agentConnection.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-slate-400">
              {agentConnection.isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📈</div>
            <p className="text-slate-400">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {allActivities.map((activity, index) => (
                <motion.div
                  key={`${activity.id}-${activity.type}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                >
                  <div className="text-lg">
                    {getStatusIcon(activity.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-200">
                        {activity.opportunityId}
                      </span>
                      <Badge 
                        variant={getStatusColor(activity.status)}
                        size="sm"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>
                        Amount: {formatEther(activity.amountIn)}
                      </span>
                      {activity.profit !== undefined && (
                        <span className={activity.profit > 0 ? 'text-green-400' : 'text-red-400'}>
                          Profit: ${activity.profit.toFixed(4)}
                        </span>
                      )}
                      <span>
                        {timeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  
                  {activity.transactionHash && (
                    <div className="text-xs text-slate-400 font-mono">
                      {activity.transactionHash.slice(0, 8)}...
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const QuickStats: React.FC = () => {
  const activeExecutions = useActiveExecutions();
  const executionHistory = useExecutionHistory();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'Active Trades',
      value: activeExecutions.length,
      icon: '⚡',
      color: 'text-blue-400',
    },
    {
      label: 'Completed Today',
      value: executionHistory.filter(exec => 
        now - exec.executedAt < 24 * 60 * 60 * 1000
      ).length,
      icon: '✅',
      color: 'text-green-400',
    },
    {
      label: 'Success Rate',
      value: `${Math.round((executionHistory.filter(exec => exec.status === 'completed').length / Math.max(executionHistory.length, 1)) * 100)}%`,
      icon: '🎯',
      color: 'text-purple-400',
    },
    {
      label: 'Avg Profit',
      value: `$${(executionHistory.reduce((sum, exec) => sum + (exec.profit || 0), 0) / Math.max(executionHistory.length, 1)).toFixed(2)}`,
      icon: '💰',
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="glass" size="sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {stat.label}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};