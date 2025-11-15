'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useArbitrageActions } from '../stores/arbitrageStore';
import { useAgentActions, useAgentStore, AGENT_EVENT_CHANNEL } from '../stores/agentStore';
import type { AgentRealtimeEvent, ArbitrageOpportunity } from '../types';

export const useArbitrageEngine = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { addOpportunity, addMarketEvent } = useArbitrageActions();
  const { updateMetrics, updateMarketData, connect } = useAgentActions();
  const shouldUseMock = useAgentStore((state) => state.shouldUseMock);
  const mockCleanupRef = useRef<(() => void) | null>(null);

  // Mock arbitrage opportunities generator
  const generateMockOpportunity = useCallback((): ArbitrageOpportunity => {
    const tokens = ['ETH', 'USDC', 'DAI', 'USDT', 'WBTC'];
    const platforms = ['quickswap', 'standardclob'] as const;
    
    const tokenA = tokens[Math.floor(Math.random() * tokens.length)];
    const tokenB = tokens.filter(t => t !== tokenA)[Math.floor(Math.random() * (tokens.length - 1))];
    const buyPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    const sellPlatform = platforms.filter(p => p !== buyPlatform)[0] || platforms[0];
    
    const buyPrice = BigInt(Math.floor(Math.random() * 2000 + 1000) * 1e18); // 1000-3000 USD
    const sellPrice = buyPrice + BigInt(Math.floor(Math.random() * 50 + 10) * 1e18); // 10-60 USD higher
    const expectedProfit = Math.random() * 50 + 5; // $5-55 profit
    
    return {
      id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tokenA,
      tokenB,
      buyPlatform,
      sellPlatform,
      buyPrice,
      sellPrice,
      expectedProfit,
      estimatedGasCost: Math.random() * 10 + 2, // $2-12
      slippageCost: Math.random() * 5 + 1, // $1-6
      confidence: Math.floor(Math.random() * 40 + 60), // 60-100%
      timestamp: Date.now(),
      expiresAt: Date.now() + (Math.random() * 300000 + 60000), // 1-5 minutes
      volume: BigInt(Math.floor(Math.random() * 10 + 1) * 1e18), // 1-10 ETH
      route: [buyPlatform, sellPlatform],
    };
  }, []);

  const startMockMode = useCallback(() => {
    const opportunityInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const opportunity = generateMockOpportunity();
        addOpportunity(opportunity);
        addMarketEvent({
          id: `event-${Date.now()}`,
          type: 'trade',
          platform: 'quickswap',
          tokenA: opportunity.tokenA,
          tokenB: opportunity.tokenB,
          timestamp: Date.now(),
          blockNumber: Date.now(),
          data: { opportunityId: opportunity.id },
        });
      }
    }, 5000);

    const metricsInterval = setInterval(() => {
      updateMetrics({
        uptime: Date.now(),
        cpuUsage: Math.random() * 60 + 20,
        memoryUsage: Math.random() * 50 + 30,
        avgResponseTime: Math.floor(Math.random() * 200 + 50),
        totalOpportunities: Math.floor(Math.random() * 100 + 50),
      });

      const tokens = ['ETH', 'USDC', 'DAI', 'USDT', 'WBTC'];
      const prices: Record<string, number> = {};
      tokens.forEach(token => {
        prices[token] = Math.random() * 1000 + 500;
      });

      updateMarketData({
        timestamp: Date.now(),
        prices,
        volumes: Object.fromEntries(tokens.map(t => [t, Math.random() * 1000000])),
        spreads: Object.fromEntries(tokens.map(t => [t, Math.random() * 0.01])),
      });
    }, 2000);

    mockCleanupRef.current = () => {
      clearInterval(opportunityInterval);
      clearInterval(metricsInterval);
    };
  }, [addMarketEvent, addOpportunity, generateMockOpportunity, updateMarketData, updateMetrics]);

  const stopMockMode = useCallback(() => {
    mockCleanupRef.current?.();
    mockCleanupRef.current = null;
  }, []);

  const handleRealtimeEvent = useCallback((event: AgentRealtimeEvent) => {
    switch (event.type) {
      case 'agent:opportunity':
        addOpportunity({
          ...event.payload,
          buyPrice: BigInt(event.payload.buyPrice),
          sellPrice: BigInt(event.payload.sellPrice),
          volume: BigInt(event.payload.volume),
        });
        break;
      case 'agent:market-event':
        addMarketEvent({
          ...event.payload,
          price: event.payload.price ? BigInt(event.payload.price) : undefined,
          volume: event.payload.volume ? BigInt(event.payload.volume) : undefined,
          liquidity: event.payload.liquidity ? BigInt(event.payload.liquidity) : undefined,
        });
        break;
      case 'agent:metrics':
        updateMetrics(event.payload);
        break;
      default:
        break;
    }
  }, [addMarketEvent, addOpportunity, updateMetrics]);

  const startEngine = useCallback(async () => {
    setIsRunning(true);
    await connect();
  }, [connect]);

  const stopEngine = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Auto-start engine when hook is used
  useEffect(() => {
    let active = true;

    (async () => {
      await startEngine();
      if (!active) {
        stopEngine();
      }
    })();

    return () => {
      active = false;
      mockCleanupRef.current?.();
      mockCleanupRef.current = null;
      stopEngine();
    };
  }, [startEngine, stopEngine]);

  useEffect(() => {
    if (shouldUseMock) {
      if (!mockCleanupRef.current) {
        startMockMode();
      }
    } else {
      stopMockMode();
    }
  }, [shouldUseMock, startMockMode, stopMockMode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AgentRealtimeEvent>).detail;
      if (detail) {
        handleRealtimeEvent(detail);
      }
    };

    window.addEventListener(AGENT_EVENT_CHANNEL, handler as EventListener);
    return () => {
      window.removeEventListener(AGENT_EVENT_CHANNEL, handler as EventListener);
    };
  }, [handleRealtimeEvent]);

  return {
    isRunning,
    startEngine,
    stopEngine,
  };
};