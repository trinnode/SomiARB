'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useOpportunities, useArbitrageActions } from '../../stores/arbitrageStore';
import { notification } from '../ui/Notification';
import { formatEther, timeAgo } from '../../lib/utils';

export const OpportunityList: React.FC = () => {
  const opportunities = useOpportunities();
  const { selectOpportunity } = useArbitrageActions();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleExecute = async (opportunity: typeof opportunities[0]) => {
    setExecutingId(opportunity.id);
    selectOpportunity(opportunity);

    try {
      notification.arbitrage.executionStarted();
      
      // Simulate execution (replace with actual logic)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      notification.arbitrage.executionSuccess(formatEther(BigInt(opportunity.expectedProfit)));
    } catch (error) {
      console.error('Arbitrage execution failed:', error);
      notification.arbitrage.executionFailed('Insufficient liquidity');
    } finally {
      setExecutingId(null);
      selectOpportunity(null);
    }
  };

  const getProfitColor = (profit: number) => {
    const profitNumber = profit;
    if (profitNumber > 1) return 'text-green-400';
    if (profitNumber > 0.5) return 'text-yellow-400';
    return 'text-blue-400';
  };

  if (opportunities.length === 0) {
    return (
      <Card variant="glass" className="text-center py-12">
        <CardContent>
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            No Opportunities Found
          </h3>
          <p className="text-slate-400">
            The agent is actively scanning for arbitrage opportunities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">
          Active Opportunities ({opportunities.length})
        </h2>
        <Badge variant="glow" pulse>
          Live
        </Badge>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {opportunities.map((opportunity, index) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              layout
            >
              <Card 
                variant="glass" 
                className="hover:border-blue-500/30 transition-all duration-300 cursor-pointer"
                onClick={() => selectOpportunity(opportunity)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {opportunity.tokenA} → {opportunity.tokenB}
                        </h3>
                        <Badge
                          variant={opportunity.confidence > 80 ? 'success' : opportunity.confidence > 60 ? 'warning' : 'default'}
                          size="sm"
                        >
                          {opportunity.confidence}% confidence
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Profit</span>
                          <p className={`font-semibold ${getProfitColor(Number(opportunity.expectedProfit))}`}>
                            ${opportunity.expectedProfit.toFixed(4)}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-slate-400">ROI</span>
                          <p className="font-semibold text-green-400">
                            {((opportunity.expectedProfit / 100) * 100).toFixed(2)}%
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-slate-400">Route</span>
                          <p className="font-semibold text-slate-200">
                            {opportunity.route?.join(' → ') || `${opportunity.buyPlatform} → ${opportunity.sellPlatform}`}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-slate-400">Expires</span>
                          <p className="font-semibold text-slate-200">
                            {timeAgo(opportunity.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6">
                      <Button
                        variant="glow"
                        size="lg"
                        loading={executingId === opportunity.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecute(opportunity);
                        }}
                        disabled={executingId !== null}
                        className="min-w-[120px]"
                      >
                        {executingId === opportunity.id ? 'Executing' : 'Execute'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress bar for expiration */}
                  <div className="mt-4">
                    <motion.div
                      className="h-1 bg-slate-700 rounded-full overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-yellow-500"
                        initial={{ width: '100%' }}
                        animate={{ 
                          width: `${Math.max(0, (opportunity.expiresAt - currentTime) / (5 * 60 * 1000) * 100)}%` 
                        }}
                        transition={{ duration: 1 }}
                      />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};