'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useArbitrageOpportunities } from '../../hooks/useContracts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const OpportunitiesPage: React.FC = () => {
  const { opportunities, isLoading, refetch } = useArbitrageOpportunities();

  const lastUpdated = useMemo(() => {
    if (!opportunities.length) return null;
    const latest = Math.max(...opportunities.map((op) => op.lastUpdated || 0));
    return new Date(latest);
  }, [opportunities]);

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">Arbitrage Opportunities</h1>
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 space-y-6 relative z-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Arbitrage Opportunities</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Last updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="glow"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6">
        {opportunities.map((opportunity) => (
          <motion.div key={opportunity.id} variants={itemVariants}>
            <Card className="p-6 hover:bg-slate-800/50 transition-all duration-300 border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {opportunity.tokenPair}
                  </h3>
                  <div className="flex gap-3 text-sm text-slate-400">
                    <span>{opportunity.exchange1}</span>
                    <span>→</span>
                    <span>{opportunity.exchange2}</span>
                  </div>
                </div>
                <Badge variant={opportunity.confidence > 80 ? 'success' : 'warning'}>
                  {opportunity.confidence}% confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Price A</div>
                  <div className="text-lg font-semibold text-white">${opportunity.priceA}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Price B</div>
                  <div className="text-lg font-semibold text-white">${opportunity.priceB}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Spread</div>
                  <div className="text-lg font-semibold text-green-400">{opportunity.spread}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Est. Profit</div>
                  <div className="text-lg font-semibold text-green-400">
                    ${opportunity.profit} ({opportunity.profitPercent})
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-slate-400">
                  Range: ${opportunity.minAmount} - ${opportunity.maxAmount} | 
                  Gas: ~{opportunity.gasEstimate} ETH
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    Analyze
                  </Button>
                  <Button variant="glow" size="sm">
                    Execute
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {opportunities.length === 0 && !isLoading && (
        <motion.div variants={itemVariants}>
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Opportunities Found</h3>
            <p className="text-slate-400">
              We&apos;re constantly scanning for profitable arbitrage opportunities. Check back soon!
            </p>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default OpportunitiesPage;