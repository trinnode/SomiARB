'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type TimeframeKey = '24h' | '7d' | '30d' | '90d';

const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('7d');

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

  // Mock data for charts
  const profitData = [
    { date: '2024-01-01', profit: 450, volume: 12000 },
    { date: '2024-01-02', profit: 780, volume: 15000 },
    { date: '2024-01-03', profit: 320, volume: 9000 },
    { date: '2024-01-04', profit: 1200, volume: 18000 },
    { date: '2024-01-05', profit: 890, volume: 14000 },
    { date: '2024-01-06', profit: 1450, volume: 22000 },
    { date: '2024-01-07', profit: 650, volume: 11000 },
  ];

  const opportunityData = [
    { exchange: 'QuickSwap', count: 45, profit: 2500 },
    { exchange: 'Uniswap', count: 32, profit: 1800 },
    { exchange: 'SushiSwap', count: 28, profit: 1200 },
    { exchange: 'Balancer', count: 15, profit: 800 },
    { exchange: 'Curve', count: 12, profit: 600 },
  ];

  const tokenDistribution = [
    { name: 'USDC', value: 35, color: '#3b82f6' },
    { name: 'WETH', value: 28, color: '#8b5cf6' },
    { name: 'WMATIC', value: 20, color: '#06d6a0' },
    { name: 'DAI', value: 10, color: '#f59e0b' },
    { name: 'Others', value: 7, color: '#ef4444' },
  ];

  const performanceMetrics = [
    { metric: 'Total Profit', value: '$8,640', change: '+12.5%', positive: true },
    { metric: 'Win Rate', value: '78.3%', change: '+2.1%', positive: true },
    { metric: 'Avg Profit/Trade', value: '$45.20', change: '-1.8%', positive: false },
    { metric: 'Total Trades', value: '432', change: '+8.7%', positive: true },
  ];

  const timeframes: Array<{ key: TimeframeKey; label: string }> = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
  ];

  return (
    <motion.div
      className="p-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <Button
              key={tf.key}
              variant={timeframe === tf.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeframe(tf.key)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-400">{metric.metric}</p>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className={`text-sm ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                {metric.change}
              </p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Profit & Volume Chart */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Profit & Volume Trends</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitData}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [
                    `$${value}`,
                    name === 'profit' ? 'Profit' : 'Volume'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exchange Performance */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Exchange Performance</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opportunityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="exchange" 
                    stroke="#9ca3af"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="Opportunities" />
                  <Bar dataKey="profit" fill="#8b5cf6" name="Profit ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Token Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Token Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tokenDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tokenDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [`${value}%`, 'Percentage']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {tokenDistribution.map((token, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: token.color }}
                  />
                  <span className="text-sm text-slate-300">{token.name}</span>
                  <span className="text-sm text-slate-400">{token.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analytics Table */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Arbitrage Opportunities</h2>
            <Button variant="outline" size="sm">
              Export Data
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="pb-3 text-sm font-medium text-slate-300">Time</th>
                  <th className="pb-3 text-sm font-medium text-slate-300">Token Pair</th>
                  <th className="pb-3 text-sm font-medium text-slate-300">Exchanges</th>
                  <th className="pb-3 text-sm font-medium text-slate-300">Profit</th>
                  <th className="pb-3 text-sm font-medium text-slate-300">Status</th>
                  <th className="pb-3 text-sm font-medium text-slate-300">APY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {[
                  {
                    time: '14:32',
                    pair: 'USDC/WETH',
                    exchanges: 'QuickSwap → Uniswap',
                    profit: '+$124.50',
                    status: 'Executed',
                    apy: '15.2%'
                  },
                  {
                    time: '14:28',
                    pair: 'WMATIC/DAI',
                    exchanges: 'SushiSwap → Balancer',
                    profit: '+$89.30',
                    status: 'Executed',
                    apy: '12.8%'
                  },
                  {
                    time: '14:25',
                    pair: 'USDC/USDT',
                    exchanges: 'Curve → QuickSwap',
                    profit: '+$45.20',
                    status: 'Missed',
                    apy: '8.7%'
                  },
                  {
                    time: '14:20',
                    pair: 'WETH/WMATIC',
                    exchanges: 'Uniswap → SushiSwap',
                    profit: '+$234.80',
                    status: 'Executed',
                    apy: '18.5%'
                  }
                ].map((row, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-sm text-slate-300">{row.time}</td>
                    <td className="py-3 text-sm text-white font-medium">{row.pair}</td>
                    <td className="py-3 text-sm text-slate-300">{row.exchanges}</td>
                    <td className="py-3 text-sm text-green-400 font-medium">{row.profit}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.status === 'Executed' 
                          ? 'bg-green-900/30 text-green-300' 
                          : 'bg-red-900/30 text-red-300'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-blue-400 font-medium">{row.apy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Performance Summary */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Performance Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Best Performing Pairs</h3>
              <div className="space-y-2">
                {[
                  { pair: 'USDC/WETH', profit: '$1,245', trades: 15 },
                  { pair: 'WMATIC/DAI', profit: '$890', trades: 12 },
                  { pair: 'USDT/USDC', profit: '$567', trades: 8 }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{item.pair}</p>
                      <p className="text-xs text-slate-400">{item.trades} trades</p>
                    </div>
                    <p className="text-green-400 font-medium">{item.profit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Top Exchanges</h3>
              <div className="space-y-2">
                {[
                  { exchange: 'QuickSwap', volume: '$45,230', share: '35%' },
                  { exchange: 'Uniswap', volume: '$32,180', share: '28%' },
                  { exchange: 'SushiSwap', volume: '$18,900', share: '20%' }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{item.exchange}</p>
                      <p className="text-xs text-slate-400">{item.share} share</p>
                    </div>
                    <p className="text-blue-400 font-medium">{item.volume}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Risk Metrics</h3>
              <div className="space-y-2">
                {[
                  { metric: 'Max Drawdown', value: '2.3%', status: 'Low' },
                  { metric: 'Volatility', value: '4.8%', status: 'Medium' },
                  { metric: 'Sharpe Ratio', value: '2.14', status: 'Good' }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{item.metric}</p>
                      <p className="text-xs text-slate-400">{item.status}</p>
                    </div>
                    <p className="text-purple-400 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsPage;