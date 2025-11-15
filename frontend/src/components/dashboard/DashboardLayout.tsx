'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PortfolioOverview, SystemMetrics } from './PortfolioOverview';
import { OpportunityList } from './OpportunityList';
import { ActivityFeed, QuickStats } from './ActivityFeed';
import { useArbitrageEngine } from '../../hooks/useArbitrageEngine';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export const DashboardLayout: React.FC = () => {
  const { isRunning } = useArbitrageEngine(); // Auto-start the engine

  return (
    /* Main Dashboard Content */
    <main className="flex-1 p-6 space-y-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Welcome Section */}
        <motion.div variants={itemVariants}>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 mb-4">
              Welcome to SomiARB
            </h1>
            <p className="text-xl text-slate-300">
              Next-generation arbitrage trading on Somnia Network
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-sm text-slate-400">
                Engine {isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
        </motion.div>
        
        {/* Quick Stats */}
        <motion.div variants={itemVariants}>
          <QuickStats />
        </motion.div>
        
        {/* Portfolio Overview */}
        <motion.div variants={itemVariants}>
          <PortfolioOverview />
        </motion.div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Opportunities List */}
          <motion.div variants={itemVariants} className="xl:col-span-2">
            <OpportunityList />
          </motion.div>
          
          {/* Activity Feed */}
          <motion.div variants={itemVariants}>
            <ActivityFeed />
          </motion.div>
        </div>
        
        {/* System Metrics */}
        <motion.div variants={itemVariants}>
          <SystemMetrics />
        </motion.div>
      </motion.div>
    </main>
  );
};