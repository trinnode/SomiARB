import { BigNumberish } from 'ethers';

// Core types for the arbitrage system

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
    data: any;
}

export interface PriceData {
    token: string;
    price: bigint;
    volume24h: bigint;
    liquidity: bigint;
    timestamp: number;
    source: string;
}

export interface RiskAssessment {
    safe: boolean;
    approved: boolean;
    reason?: string;
    riskScore: number;
    maxExposure: bigint;
    gasLimit: bigint;
    slippageTolerance: number;
}

export interface ExecutionResult {
    success: boolean;
    transactionHash: string;
    actualProfit: number;
    gasUsed: number;
    executionTime: number;
    error?: string;
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

export interface ComponentHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastUpdate: number;
    errorCount: number;
    latency: number;
    message?: string;
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

export interface TradeConfig {
    enabled: boolean;
    maxSlippage: number;
    minProfitThreshold: number;
    maxGasPrice: bigint;
    maxPositionSize: bigint;
    riskTolerance: number;
    executionTimeout: number;
}

export interface DataStreamConfig {
    useMock: boolean;
    quickswap: {
        endpoint: string;
        apiKey?: string;
        subscriptions: string[];
        reconnectDelay: number;
        maxReconnects: number;
    };
    standardclob: {
        endpoint: string;
        apiKey?: string;
        subscriptions: string[];
        reconnectDelay: number;
        maxReconnects: number;
    };
    priceFeeds: {
        endpoint: string;
        updateInterval: number;
        tokens: string[];
    };
}

export interface BlockchainConfig {
    networkName: string;
    chainId: number;
    rpcUrl: string;
    wsUrl?: string;
    gasStation?: string;
    contracts: {
        vault: string;
        quickswapRouter: string;
        standardCLOB: string;
    };
    tokens: {
        [symbol: string]: string;
    };
}

export interface RealtimeConfig {
    enabled: boolean;
    host: string;
    port: number;
    heartbeatInterval: number;
    authToken?: string;
    allowedOrigins: string[];
}

export interface AgentConfig {
    agent: {
        name: string;
        version: string;
        environment: 'development' | 'staging' | 'production';
        logLevel: 'debug' | 'info' | 'warn' | 'error';
    };
    blockchain: BlockchainConfig;
    dataStreams: DataStreamConfig;
    trading: TradeConfig;
    risk: {
        maxDrawdown: number;
        stopLossThreshold: number;
        positionLimits: {
            single: bigint;
            total: bigint;
        };
        cooldownPeriod: number;
    };
    monitoring: {
        healthCheckInterval: number;
        metricsCollectionInterval: number;
        alertThresholds: {
            errorRate: number;
            latency: number;
            riskScore: number;
        };
    };
    realtime: RealtimeConfig;
}

export type SerializedArbitrageOpportunity = Omit<ArbitrageOpportunity, 'buyPrice' | 'sellPrice' | 'volume'> & {
    buyPrice: string;
    sellPrice: string;
    volume: string;
};

export type SerializedMarketEvent = Omit<MarketEvent, 'price' | 'volume' | 'liquidity' | 'data'> & {
    price?: string;
    volume?: string;
    liquidity?: string;
    data?: Record<string, any>;
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
    context?: Record<string, any>;
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

export interface AgentCommand<TPayload = any> {
    id: string;
    type: AgentCommandType;
    payload?: TPayload;
    issuedAt: number;
}

export interface AgentCommandResponse<TData = any> {
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

// Event types
export type AgentEventType = 
    | 'started'
    | 'stopped'
    | 'marketEvent'
    | 'opportunityFound'
    | 'arbitrageSuccess'
    | 'arbitrageFailed'
    | 'riskAlert'
    | 'emergencyStop'
    | 'healthCheck'
    | 'reconnected'
    | 'componentFailure';

// Stream subscription types
export interface StreamSubscription {
    id: string;
    type: 'price' | 'trade' | 'orderbook' | 'liquidity';
    platform: string;
    token?: string;
    pair?: string;
    callback: (data: any) => void;
}

// Order book types
export interface OrderBookLevel {
    price: bigint;
    volume: bigint;
}

export interface OrderBook {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    timestamp: number;
    platform: string;
    pair: string;
}

// Trade execution types
export interface TradeParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    minAmountOut: bigint;
    deadline: number;
    slippageTolerance: number;
}

export interface GasEstimate {
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    totalCost: bigint;
}

// Error types
export class ArbitrageError extends Error {
    constructor(
        message: string,
        public code: string,
        public data?: any
    ) {
        super(message);
        this.name = 'ArbitrageError';
    }
}

export class RiskError extends Error {
    constructor(
        message: string,
        public riskScore: number,
        public data?: any
    ) {
        super(message);
        this.name = 'RiskError';
    }
}

export class DataStreamError extends Error {
    constructor(
        message: string,
        public platform: string,
        public data?: any
    ) {
        super(message);
        this.name = 'DataStreamError';
    }
}