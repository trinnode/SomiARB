import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  ArbitrageOpportunity, 
  MarketEvent, 
  PortfolioStats, 
  TradeExecution,
  SystemMetrics 
} from '../types';

interface ArbitrageState {
  // Opportunities
  opportunities: ArbitrageOpportunity[];
  selectedOpportunity: ArbitrageOpportunity | null;
  
  // Market data
  marketEvents: MarketEvent[];
  prices: Record<string, number>;
  
  // Trading
  activeExecutions: TradeExecution[];
  executionHistory: TradeExecution[];
  
  // Portfolio
  portfolio: PortfolioStats;
  
  // System metrics
  systemMetrics: SystemMetrics;
  
  // Loading states
  isLoadingOpportunities: boolean;
  isExecutingTrade: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  actions: {
    // Opportunities
    addOpportunity: (opportunity: ArbitrageOpportunity) => void;
    removeOpportunity: (id: string) => void;
    selectOpportunity: (opportunity: ArbitrageOpportunity | null) => void;
    clearExpiredOpportunities: () => void;
    
    // Market events
    addMarketEvent: (event: MarketEvent) => void;
    updatePrice: (token: string, price: number) => void;
    
    // Trading
    startExecution: (execution: TradeExecution) => void;
    updateExecution: (id: string, updates: Partial<TradeExecution>) => void;
    completeExecution: (id: string, result: { success: boolean; transactionHash?: string }) => void;
    
    // Portfolio
    updatePortfolio: (stats: Partial<PortfolioStats>) => void;
    
    // System
    updateSystemMetrics: (metrics: Partial<SystemMetrics>) => void;
    
    // Utility
    setLoading: (key: 'opportunities' | 'trade', loading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
  };
}

const initialPortfolio: PortfolioStats = {
  totalDeposited: BigInt(0),
  currentBalance: BigInt(0),
  totalProfit: 0,
  profitPercentage: 0,
  totalTrades: 0,
  successfulTrades: 0,
  averageProfit: 0
};

const initialSystemMetrics: SystemMetrics = {
  totalValueLocked: BigInt(0),
  activeOpportunities: 0,
  totalArbitrages: 0,
  systemUptime: 0,
  avgExecutionTime: 0,
  successRate: 0
};

export const useArbitrageStore = create<ArbitrageState>()(
  subscribeWithSelector(
    immer((set) => ({
      // Initial state
      opportunities: [],
      selectedOpportunity: null,
      marketEvents: [],
      prices: {},
      activeExecutions: [],
      executionHistory: [],
      portfolio: initialPortfolio,
      systemMetrics: initialSystemMetrics,
      isLoadingOpportunities: false,
      isExecutingTrade: false,
      error: null,

      actions: {
        addOpportunity: (opportunity) => set((state) => {
          state.opportunities.push(opportunity);
          state.systemMetrics.activeOpportunities = state.opportunities.length;
        }),

        removeOpportunity: (id) => set((state) => {
          state.opportunities = state.opportunities.filter(op => op.id !== id);
          state.systemMetrics.activeOpportunities = state.opportunities.length;
          if (state.selectedOpportunity?.id === id) {
            state.selectedOpportunity = null;
          }
        }),

        selectOpportunity: (opportunity) => set((state) => {
          state.selectedOpportunity = opportunity;
        }),

        clearExpiredOpportunities: () => set((state) => {
          const now = Date.now();
          state.opportunities = state.opportunities.filter(op => op.expiresAt > now);
          state.systemMetrics.activeOpportunities = state.opportunities.length;
        }),

        addMarketEvent: (event) => set((state) => {
          state.marketEvents.unshift(event);
          if (state.marketEvents.length > 100) {
            state.marketEvents = state.marketEvents.slice(0, 100);
          }
        }),

        updatePrice: (token, price) => set((state) => {
          state.prices[token] = price;
        }),

        startExecution: (execution) => set((state) => {
          state.activeExecutions.push(execution);
          state.isExecutingTrade = true;
        }),

        updateExecution: (id, updates) => set((state) => {
          const index = state.activeExecutions.findIndex(ex => ex.id === id);
          if (index !== -1) {
            Object.assign(state.activeExecutions[index], updates);
          }
        }),

        completeExecution: (id, result) => set((state) => {
          const index = state.activeExecutions.findIndex(ex => ex.id === id);
          if (index !== -1) {
            const execution = state.activeExecutions[index];
            execution.status = result.success ? 'completed' : 'failed';
            if (result.transactionHash) {
              execution.transactionHash = result.transactionHash;
            }
            
            // Move to history
            state.executionHistory.unshift(execution);
            state.activeExecutions.splice(index, 1);
            
            // Update portfolio stats
            if (result.success) {
              state.portfolio.totalTrades++;
              state.portfolio.successfulTrades++;
              state.systemMetrics.totalArbitrages++;
            }
            
            // Update loading state
            if (state.activeExecutions.length === 0) {
              state.isExecutingTrade = false;
            }
          }
        }),

        updatePortfolio: (stats) => set((state) => {
          Object.assign(state.portfolio, stats);
        }),

        updateSystemMetrics: (metrics) => set((state) => {
          Object.assign(state.systemMetrics, metrics);
        }),

        setLoading: (key, loading) => set((state) => {
          if (key === 'opportunities') {
            state.isLoadingOpportunities = loading;
          } else if (key === 'trade') {
            state.isExecutingTrade = loading;
          }
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        reset: () => set((state) => {
          state.opportunities = [];
          state.selectedOpportunity = null;
          state.marketEvents = [];
          state.prices = {};
          state.activeExecutions = [];
          state.executionHistory = [];
          state.portfolio = initialPortfolio;
          state.systemMetrics = initialSystemMetrics;
          state.isLoadingOpportunities = false;
          state.isExecutingTrade = false;
          state.error = null;
        })
      }
    }))
  )
);

// Selectors for performance optimization
export const useOpportunities = () => useArbitrageStore(state => state.opportunities);
export const useSelectedOpportunity = () => useArbitrageStore(state => state.selectedOpportunity);
export const usePortfolio = () => useArbitrageStore(state => state.portfolio);
export const useSystemMetrics = () => useArbitrageStore(state => state.systemMetrics);
export const useMarketEvents = () => useArbitrageStore(state => state.marketEvents);
export const useActiveExecutions = () => useArbitrageStore(state => state.activeExecutions);
export const useExecutionHistory = () => useArbitrageStore(state => state.executionHistory);
export const useArbitrageActions = () => useArbitrageStore(state => state.actions);

// Auto-cleanup expired opportunities every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    useArbitrageStore.getState().actions.clearExpiredOpportunities();
  }, 10000);
}