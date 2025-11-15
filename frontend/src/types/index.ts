export interface ArbitrageOpportunity {
  id: string;
  tokenA: string;
  tokenB: string;
  buyPlatform: 'quickswap' | 'standardclob';
  sellPlatform: 'quickswap' | 'standardclob';
  buyPrice: bigint;
  sellPrice: bigint;
  expectedProfit: number;
  estimatedGasCost: number;
  slippageCost: number;
  confidence: number;
  timestamp: number;
  expiresAt: number;
  volume: bigint;
  route: string[];
}

export interface MarketEvent {
  id: string;
  type: 'priceUpdate' | 'trade' | 'liquidityChange' | 'orderbook';
  platform: 'quickswap' | 'standardclob';
  tokenA: string;
  tokenB: string;
  price?: bigint;
  volume?: bigint;
  liquidity?: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash?: string;
  data?: Record<string, unknown>;
}

export interface PriceData {
  token: string;
  price: bigint;
  volume24h: bigint;
  liquidity: bigint;
  timestamp: number;
  source: string;
}

export interface PortfolioStats {
  totalDeposited: bigint;
  currentBalance: bigint;
  totalProfit: number;
  profitPercentage: number;
  totalTrades: number;
  successfulTrades: number;
  averageProfit: number;
}

export interface UserPosition {
  user: string;
  balance: bigint;
  depositedAt: number;
  lastActivity: number;
}

export interface TradeExecution {
  id: string;
  opportunityId: string;
  user: string;
  amountIn: bigint;
  amountOut: bigint;
  profit: number;
  gasUsed: number;
  status: 'pending' | 'completed' | 'failed';
  executedAt: number;
  transactionHash?: string;
}

export interface SystemMetrics {
  totalValueLocked: bigint;
  activeOpportunities: number;
  totalArbitrages: number;
  systemUptime: number;
  avgExecutionTime: number;
  successRate: number;
}

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UIState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  activeTab: string;
  notifications: NotificationData[];
  isLoading: boolean;
  error: string | null;
}

export interface AgentConnection {
  connected: boolean;
  lastHeartbeat: number;
  latency: number;
  reconnectAttempts: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  change24h?: number;
}

export interface TradingPair {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  platforms: ('quickswap' | 'standardclob')[];
  liquidity: {
    quickswap?: bigint;
    standardclob?: bigint;
  };
  volume24h: {
    quickswap?: bigint;
    standardclob?: bigint;
  };
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  label?: string;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    SomiArbVault: string;
    QuickSwapRouter: string;
    StandardCLOB: string;
  };
}

export interface MetricsData {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  averageProfit: number;
  gasSpent: number;
  uptime: number;
  errorRate: number;
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
  riskMetrics: {
    riskScore: number;
    exposureLevel: number;
    emergencyStops: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  transactionHash: string;
  actualProfit: number;
  gasUsed: number;
  executionTime: number;
  error?: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdate: number;
  errorCount: number;
  latency: number;
  message?: string;
}

export interface HealthStatus {
  healthy: boolean;
  uptime: number;
  lastCheck: number;
  issues: string[];
  components: {
    dataStreams: ComponentHealth;
    arbitrageEngine: ComponentHealth;
    riskManager: ComponentHealth;
    blockchain: ComponentHealth;
  };
}

export type SerializedArbitrageOpportunity = Omit<ArbitrageOpportunity, 'buyPrice' | 'sellPrice' | 'volume'> & {
  buyPrice: string;
  sellPrice: string;
  volume: string;
};

export type SerializedMarketEvent = Omit<MarketEvent, 'price' | 'volume' | 'liquidity'> & {
  price?: string;
  volume?: string;
  liquidity?: string;
};

export interface AgentStatusSnapshot {
  isRunning: boolean;
  uptime: number;
  environment: string;
  version: string;
  timestamp: number;
}

export interface AgentLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export type AgentRealtimeEvent =
  | { type: 'agent:heartbeat'; payload: { timestamp: number; uptime: number } }
  | { type: 'agent:status'; payload: AgentStatusSnapshot }
  | { type: 'agent:metrics'; payload: MetricsData & { timestamp: number } }
  | { type: 'agent:opportunity'; payload: SerializedArbitrageOpportunity }
  | { type: 'agent:market-event'; payload: SerializedMarketEvent }
  | { type: 'agent:trade-success'; payload: ExecutionResult }
  | { type: 'agent:trade-failed'; payload: { error: string; opportunityId?: string; timestamp: number } }
  | { type: 'agent:health'; payload: HealthStatus }
  | { type: 'agent:log'; payload: AgentLogEntry }
  | { type: 'agent:command-response'; payload: AgentCommandResponse };

export type AgentCommandType =
  | 'agent:start'
  | 'agent:stop'
  | 'agent:status:get'
  | 'agent:config:update'
  | 'trade:execute'
  | 'agent:ping';

export interface AgentCommand<TPayload = unknown> {
  id: string;
  type: AgentCommandType;
  payload?: TPayload;
  issuedAt: number;
}

export interface AgentCommandResponse<TData = unknown> {
  commandId: string;
  status: 'accepted' | 'rejected' | 'error';
  message?: string;
  data?: TData;
  timestamp: number;
}

export type AgentRealtimeInboundMessage =
  | { type: 'client:hello'; payload?: { clientId?: string; version?: string } }
  | { type: 'client:ping'; payload?: { timestamp?: number } }
  | { type: 'client:command'; payload: AgentCommand };