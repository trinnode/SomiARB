import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AgentRealtimeEvent } from '../types';

export const AGENT_EVENT_CHANNEL = 'somiarb:agent-event';
const AGENT_EVENT_NAME = AGENT_EVENT_CHANNEL;
const DEFAULT_WS_PORT = process.env.NEXT_PUBLIC_AGENT_WS_PORT || '3011';
const DEFAULT_WS_PATH = process.env.NEXT_PUBLIC_AGENT_WS_PATH || '/';

interface AgentState {
  // Connection status
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat: number;
  autoReconnect: boolean;
  
  // Agent metrics
  agentMetrics: {
    uptime: number;
    totalOpportunities: number;
    successfulTrades: number;
    errorCount: number;
    avgResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  // Real-time data
  marketData: {
    timestamp: number;
    prices: Record<string, number>;
    volumes: Record<string, number>;
    spreads: Record<string, number>;
  };
  
  // Agent configuration
  config: {
    minProfitThreshold: number;
    maxSlippage: number;
    gasLimit: number;
    enableRiskManagement: boolean;
    maxPositionSize: number;
    refreshInterval: number;
  };
  
  // WebSocket connection
  wsUrl: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  socket?: WebSocket;
  shouldUseMock: boolean;
  
  // Error handling
  errors: Array<{
    id: string;
    timestamp: number;
    type: 'connection' | 'execution' | 'data' | 'system';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  
  // Actions
  actions: {
    // Connection management
    connect: (url?: string, options?: { resetAttempts?: boolean }) => Promise<boolean>;
    disconnect: () => void;
    reconnect: () => Promise<boolean>;
    setConnectionStatus: (status: AgentState['connectionStatus']) => void;
    
    // Agent metrics
    updateMetrics: (metrics: Partial<AgentState['agentMetrics']>) => void;
    updateHeartbeat: () => void;
    
    // Market data
    updateMarketData: (data: Partial<AgentState['marketData']>) => void;
    updatePrice: (token: string, price: number) => void;
    updateVolume: (pair: string, volume: number) => void;
    updateSpread: (pair: string, spread: number) => void;
    
    // Configuration
    updateConfig: (config: Partial<AgentState['config']>) => void;
    resetConfig: () => void;
    
    // Error handling
    addError: (error: Omit<AgentState['errors'][0], 'id' | 'timestamp'>) => void;
    clearErrors: (type?: AgentState['errors'][0]['type']) => void;
    removeError: (id: string) => void;
    
    // Utility
    reset: () => void;
    getHealthStatus: () => 'healthy' | 'warning' | 'critical' | 'offline';
    handleMessage: (message: AgentRealtimeEvent) => void;
  };
}

const defaultConfig: AgentState['config'] = {
  minProfitThreshold: 0.1, // 0.1%
  maxSlippage: 0.5, // 0.5%
  gasLimit: 500000,
  enableRiskManagement: true,
  maxPositionSize: 1000, // ETH
  refreshInterval: 1000, // 1 second
};

const defaultMetrics: AgentState['agentMetrics'] = {
  uptime: 0,
  totalOpportunities: 0,
  successfulTrades: 0,
  errorCount: 0,
  avgResponseTime: 0,
  memoryUsage: 0,
  cpuUsage: 0,
};

const normalizePath = (path: string) => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const appendAuthToken = (url: string) => {
  const token = process.env.NEXT_PUBLIC_AGENT_WS_TOKEN;
  if (!token) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('token', token);
    return parsed.toString();
  } catch {
    return url.includes('?') ? `${url}&token=${token}` : `${url}?token=${token}`;
  }
};

const resolveWsProtocol = () => {
  const forced = process.env.NEXT_PUBLIC_AGENT_WS_SECURE;
  if (forced === 'true') return 'wss';
  if (forced === 'false') return 'ws';
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'wss';
  }
  return 'ws';
};

const resolveWsUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_AGENT_WS_URL;
  if (explicit) {
    return appendAuthToken(explicit);
  }

  const path = normalizePath(process.env.NEXT_PUBLIC_AGENT_WS_PATH || DEFAULT_WS_PATH);

  if (typeof window === 'undefined') {
    return appendAuthToken(`ws://127.0.0.1:${DEFAULT_WS_PORT}${path}`);
  }

  const protocol = resolveWsProtocol();
  const hostname = process.env.NEXT_PUBLIC_AGENT_WS_HOST || window.location.hostname;
  const isLocal = ['localhost', '127.0.0.1'].includes(hostname);
  const portFromEnv = process.env.NEXT_PUBLIC_AGENT_WS_PORT;
  const derivedPort = isLocal
    ? (portFromEnv || DEFAULT_WS_PORT)
    : (portFromEnv || window.location.port || (protocol === 'wss' ? '443' : '80'));

  const portSegment = derivedPort && !['80', '443'].includes(derivedPort)
    ? `:${derivedPort}`
    : (derivedPort && ['80', '443'].includes(derivedPort) ? '' : '');

  return appendAuthToken(`${protocol}://${hostname}${portSegment}${path}`);
};

const emitAgentEvent = (event: AgentRealtimeEvent) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AgentRealtimeEvent>(AGENT_EVENT_NAME, { detail: event }));
};

const buildClientMetadata = () => ({
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  href: typeof window !== 'undefined' ? window.location.href : 'server',
  version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev'
});

export const useAgentStore = create<AgentState>()(
  immer((set, get) => ({
    // Initial state
    isConnected: false,
    connectionStatus: 'disconnected',
    lastHeartbeat: 0,
    autoReconnect: true,
    agentMetrics: defaultMetrics,
    marketData: {
      timestamp: 0,
      prices: {},
      volumes: {},
      spreads: {},
    },
    config: defaultConfig,
    wsUrl: resolveWsUrl(),
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    shouldUseMock: false,
    errors: [],

    actions: {
      connect: async (url, options) => {
        const state = get();
        const resolvedUrl = url || resolveWsUrl();
        const resetAttempts = options?.resetAttempts !== false;
        
        set((draft) => {
          draft.connectionStatus = 'connecting';
          draft.wsUrl = resolvedUrl;
          if (resetAttempts) {
            draft.reconnectAttempts = 0;
          }
        });

        try {
            const socket = new WebSocket(resolvedUrl);

            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                socket.close();
                reject(new Error('Connection timeout'));
              }, 5000);

              socket.addEventListener('open', () => {
                clearTimeout(timeout);
                socket.send(JSON.stringify({
                  type: 'client:hello',
                  payload: buildClientMetadata()
                }));
                resolve();
              });

              socket.addEventListener('error', (event) => {
                clearTimeout(timeout);
                reject(event instanceof ErrorEvent ? event.error : new Error('WebSocket error'));
              });
            });

            socket.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                if (typeof data?.type !== 'string') {
                  return;
                }
                state.actions.handleMessage(data as AgentRealtimeEvent);
              } catch (err) {
                console.error('Failed to parse agent message', err);
              }
            });

            socket.addEventListener('close', (event) => {
              set((draft) => {
                draft.isConnected = false;
                draft.connectionStatus = 'disconnected';
                draft.socket = undefined;
                draft.lastHeartbeat = Date.now();
              });
              const shouldRetry = get().autoReconnect && event.code !== 1000 && event.code !== 1001;
              if (shouldRetry) {
                state.actions.reconnect();
              }
            });

            set((draft) => {
              draft.isConnected = true;
              draft.connectionStatus = 'connected';
              draft.lastHeartbeat = Date.now();
              draft.wsUrl = resolvedUrl;
              draft.socket = socket;
              draft.shouldUseMock = false;
              draft.autoReconnect = true;
            });
          
            return true;
        } catch (error) {
          set((draft) => {
            draft.isConnected = false;
            draft.connectionStatus = 'error';
              draft.shouldUseMock = true;
            draft.errors.push({
              id: `error-${Date.now()}`,
              timestamp: Date.now(),
              type: 'connection',
              message: error instanceof Error ? error.message : 'Connection failed',
              severity: 'high',
            });
          });
          
          return false;
        }
      },

      disconnect: () => set((draft) => {
        draft.isConnected = false;
        draft.connectionStatus = 'disconnected';
        draft.lastHeartbeat = 0;
        draft.socket?.close();
        draft.socket = undefined;
        draft.autoReconnect = false;
      }),

      reconnect: async () => {
        const state = get();
        if (state.reconnectAttempts >= state.maxReconnectAttempts) {
          set((draft) => {
            draft.connectionStatus = 'error';
            draft.errors.push({
              id: `error-${Date.now()}`,
              timestamp: Date.now(),
              type: 'connection',
              message: 'Max reconnection attempts exceeded',
              severity: 'critical',
            });
          });
          return false;
        }

        set((draft) => {
          draft.reconnectAttempts += 1;
        });

        return state.actions.connect(undefined, { resetAttempts: false });
      },

      setConnectionStatus: (status) => set((draft) => {
        draft.connectionStatus = status;
      }),

      updateMetrics: (metrics) => set((draft) => {
        Object.assign(draft.agentMetrics, metrics);
      }),

      updateHeartbeat: () => set((draft) => {
        draft.lastHeartbeat = Date.now();
      }),

      updateMarketData: (data) => set((draft) => {
        Object.assign(draft.marketData, data);
        if (!data.timestamp) {
          draft.marketData.timestamp = Date.now();
        }
      }),

      updatePrice: (token, price) => set((draft) => {
        draft.marketData.prices[token] = price;
        draft.marketData.timestamp = Date.now();
      }),

      updateVolume: (pair, volume) => set((draft) => {
        draft.marketData.volumes[pair] = volume;
        draft.marketData.timestamp = Date.now();
      }),

      updateSpread: (pair, spread) => set((draft) => {
        draft.marketData.spreads[pair] = spread;
        draft.marketData.timestamp = Date.now();
      }),

      updateConfig: (config) => set((draft) => {
        Object.assign(draft.config, config);
      }),

      resetConfig: () => set((draft) => {
        draft.config = { ...defaultConfig };
      }),

      addError: (error) => set((draft) => {
        const newError = {
          ...error,
          id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        
        draft.errors.unshift(newError);
        draft.agentMetrics.errorCount += 1;
        
        // Keep only last 50 errors
        if (draft.errors.length > 50) {
          draft.errors = draft.errors.slice(0, 50);
        }
      }),

      clearErrors: (type) => set((draft) => {
        if (type) {
          draft.errors = draft.errors.filter(error => error.type !== type);
        } else {
          draft.errors = [];
        }
      }),

      removeError: (id) => set((draft) => {
        draft.errors = draft.errors.filter(error => error.id !== id);
      }),

      reset: () => set((draft) => {
        draft.isConnected = false;
        draft.connectionStatus = 'disconnected';
        draft.lastHeartbeat = 0;
        draft.autoReconnect = true;
        draft.agentMetrics = { ...defaultMetrics };
        draft.marketData = {
          timestamp: 0,
          prices: {},
          volumes: {},
          spreads: {},
        };
        draft.config = { ...defaultConfig };
        draft.reconnectAttempts = 0;
        draft.errors = [];
        draft.socket?.close();
        draft.socket = undefined;
        draft.shouldUseMock = false;
      }),

      getHealthStatus: () => {
        const state = get();
        const now = Date.now();
        const timeSinceHeartbeat = now - state.lastHeartbeat;
        
        if (!state.isConnected) return 'offline';
        if (timeSinceHeartbeat > 30000) return 'critical'; // 30s
        if (state.agentMetrics.errorCount > 10) return 'critical';
        if (timeSinceHeartbeat > 10000) return 'warning'; // 10s
        if (state.agentMetrics.cpuUsage > 80) return 'warning';
        if (state.agentMetrics.memoryUsage > 80) return 'warning';
        
        return 'healthy';
      },

      handleMessage: (message: AgentRealtimeEvent) => {
        const { type, payload } = message || {};
        const actions = get().actions;

        switch (type) {
          case 'agent:heartbeat':
            set((draft) => {
              draft.lastHeartbeat = payload?.timestamp || Date.now();
              draft.connectionStatus = 'connected';
            });
            break;
          case 'agent:metrics':
            if (payload) {
              actions.updateMetrics(payload);
            }
            break;
          case 'agent:market-event':
            if (payload) {
              const prices = payload.price
                ? { ...get().marketData.prices, [payload.tokenA]: Number(payload.price) }
                : get().marketData.prices;
              actions.updateMarketData({
                timestamp: payload.timestamp ?? Date.now(),
                prices,
              });
            }
            break;
          case 'agent:opportunity':
          case 'agent:status':
          case 'agent:command-response':
            break;
          default:
            break;
        }

        if (type) {
          emitAgentEvent(message as AgentRealtimeEvent);
        }
      }
    },
  }))
);

// Selectors with SSR safety
export const useAgentConnection = () => {
  const isConnected = useAgentStore(state => state.isConnected)
  const status = useAgentStore(state => state.connectionStatus)
  const lastHeartbeat = useAgentStore(state => state.lastHeartbeat)
  
  return { isConnected, status, lastHeartbeat }
};

export const useAgentMetrics = () => useAgentStore(state => state.agentMetrics);
export const useMarketData = () => useAgentStore(state => state.marketData);
export const useAgentConfig = () => useAgentStore(state => state.config);
export const useAgentErrors = () => useAgentStore(state => state.errors);
export const useAgentActions = () => useAgentStore(state => state.actions);

// Health monitoring
if (typeof window !== 'undefined') {
  // Heartbeat checker
  setInterval(() => {
    const state = useAgentStore.getState();
    const healthStatus = state.actions.getHealthStatus();
    
    if (healthStatus === 'offline' && state.isConnected) {
      state.actions.addError({
        type: 'connection',
        message: 'Agent heartbeat timeout',
        severity: 'high',
      });
      state.actions.disconnect();
    }
  }, 5000);

  // Auto-reconnect
  useAgentStore.subscribe(
    (state) => {
      if (state.connectionStatus === 'error') {
        setTimeout(() => {
          if (state.reconnectAttempts < state.maxReconnectAttempts) {
            state.actions.reconnect();
          }
        }, 2000 + (state.reconnectAttempts * 1000)); // Exponential backoff
      }
    }
  );
}