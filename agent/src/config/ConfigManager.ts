import { config as dotenvConfig } from 'dotenv';
import { AgentConfig, BlockchainConfig, DataStreamConfig, TradeConfig, RealtimeConfig } from '../types';

/**
 * Configuration Manager for the SomiArb Agent
 * Handles environment variables and provides typed configuration
 */
export class ConfigManager {
    private config: AgentConfig;

    constructor() {
        // Load environment variables
        dotenvConfig();
        
        // Build configuration
        this.config = this.buildConfig();
        
        // Validate configuration
        this.validateConfig();
    }

    /**
     * Get realtime server configuration
     */
    getRealtimeConfig(): RealtimeConfig {
        return this.config.realtime;
    }

    /**
     * Get configuration value by path
     */
    get(path: string): any {
        return this.getNestedValue(this.config, path);
    }

    /**
     * Get the full configuration
     */
    getAll(): AgentConfig {
        return { ...this.config };
    }

    /**
     * Get blockchain configuration
     */
    getBlockchainConfig(): BlockchainConfig {
        return this.config.blockchain;
    }

    /**
     * Get data streams configuration
     */
    getDataStreamConfig(): DataStreamConfig {
        return this.config.dataStreams;
    }

    /**
     * Get trading configuration
     */
    getTradingConfig(): TradeConfig {
        return this.config.trading;
    }

    /**
     * Build configuration from environment variables
     */
    private buildConfig(): AgentConfig {
        return {
            agent: {
                name: process.env.AGENT_NAME || 'SomiArb-Agent',
                version: process.env.AGENT_VERSION || '1.0.0',
                environment: (process.env.NODE_ENV as any) || 'development',
                logLevel: (process.env.LOG_LEVEL as any) || 'info'
            },
            blockchain: {
                networkName: process.env.NETWORK_NAME || 'somnia-testnet',
                chainId: parseInt(process.env.CHAIN_ID || '50312'),
                rpcUrl: process.env.RPC_URL || 'https://dream-rpc.somnia.network',
                wsUrl: process.env.WS_URL,
                gasStation: process.env.GAS_STATION_URL,
                contracts: {
                    vault: process.env.VAULT_CONTRACT_ADDRESS || '',
                    quickswapRouter: process.env.QUICKSWAP_ROUTER_ADDRESS || '',
                    standardCLOB: process.env.STANDARD_CLOB_ADDRESS || ''
                },
                tokens: {
                    WETH: process.env.WETH_ADDRESS || '',
                    USDC: process.env.USDC_ADDRESS || '',
                    USDT: process.env.USDT_ADDRESS || '',
                    DAI: process.env.DAI_ADDRESS || ''
                }
            },
            dataStreams: {
                useMock: process.env.DATA_STREAMS_USE_MOCK === 'true',
                quickswap: {
                    endpoint: process.env.QUICKSWAP_STREAM_URL || 'wss://api.quickswap.exchange/v1/stream',
                    apiKey: process.env.QUICKSWAP_API_KEY,
                    subscriptions: (process.env.QUICKSWAP_SUBSCRIPTIONS || 'prices,trades,liquidity').split(','),
                    reconnectDelay: parseInt(process.env.QUICKSWAP_RECONNECT_DELAY || '5000'),
                    maxReconnects: parseInt(process.env.QUICKSWAP_MAX_RECONNECTS || '10')
                },
                standardclob: {
                    endpoint: process.env.STANDARD_CLOB_STREAM_URL || 'wss://api.standardclob.exchange/v1/stream',
                    apiKey: process.env.STANDARD_CLOB_API_KEY,
                    subscriptions: (process.env.STANDARD_CLOB_SUBSCRIPTIONS || 'orderbook,trades').split(','),
                    reconnectDelay: parseInt(process.env.STANDARD_CLOB_RECONNECT_DELAY || '5000'),
                    maxReconnects: parseInt(process.env.STANDARD_CLOB_MAX_RECONNECTS || '10')
                },
                priceFeeds: {
                    endpoint: process.env.PRICE_FEED_URL || 'https://api.somnia.network/prices',
                    updateInterval: parseInt(process.env.PRICE_UPDATE_INTERVAL || '1000'),
                    tokens: (process.env.MONITORED_TOKENS || 'WETH,USDC,USDT,DAI').split(',')
                }
            },
            trading: {
                enabled: process.env.TRADING_ENABLED === 'true',
                maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.01'), // 1%
                minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.001'), // 0.1%
                maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '50000000000'), // 50 gwei
                maxPositionSize: BigInt(process.env.MAX_POSITION_SIZE || '1000000000000000000'), // 1 ETH
                riskTolerance: parseFloat(process.env.RISK_TOLERANCE || '0.05'), // 5%
                executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT || '30000') // 30 seconds
            },
            risk: {
                maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN || '0.1'), // 10%
                stopLossThreshold: parseFloat(process.env.STOP_LOSS_THRESHOLD || '0.05'), // 5%
                positionLimits: {
                    single: BigInt(process.env.SINGLE_POSITION_LIMIT || '5000000000000000000'), // 5 ETH
                    total: BigInt(process.env.TOTAL_POSITION_LIMIT || '10000000000000000000') // 10 ETH
                },
                cooldownPeriod: parseInt(process.env.RISK_COOLDOWN_PERIOD || '300') // 5 minutes
            },
            monitoring: {
                healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000'), // 10 seconds
                metricsCollectionInterval: parseInt(process.env.METRICS_INTERVAL || '60000'), // 1 minute
                alertThresholds: {
                    errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.1'), // 10%
                    latency: parseInt(process.env.LATENCY_THRESHOLD || '5000'), // 5 seconds
                    riskScore: parseFloat(process.env.RISK_SCORE_THRESHOLD || '0.8') // 80%
                }
            },
            realtime: {
                enabled: process.env.REALTIME_ENABLED !== 'false',
                host: process.env.REALTIME_HOST || '0.0.0.0',
                port: parseInt(process.env.REALTIME_PORT || '3011'),
                heartbeatInterval: parseInt(process.env.REALTIME_HEARTBEAT_INTERVAL || '5000'),
                authToken: process.env.REALTIME_AUTH_TOKEN,
                allowedOrigins: (process.env.REALTIME_ALLOWED_ORIGINS || '*')
                    .split(',')
                    .map(origin => origin.trim())
                    .filter(origin => origin.length > 0)
            }
        };
    }

    /**
     * Validate configuration
     */
    private validateConfig(): void {
        const errors: string[] = [];

        // Validate required environment variables
        const required = [
            'VAULT_CONTRACT_ADDRESS',
            'QUICKSWAP_ROUTER_ADDRESS',
            'STANDARD_CLOB_ADDRESS',
            'PRIVATE_KEY'
        ];

        for (const key of required) {
            if (!process.env[key]) {
                errors.push(`Missing required environment variable: ${key}`);
            }
        }

        // Validate chain ID
        if (this.config.blockchain.chainId !== 50312) {
            errors.push(`Invalid chain ID: ${this.config.blockchain.chainId}. Expected 50312 (Somnia testnet)`);
        }

        // Validate addresses
        if (this.config.blockchain.contracts.vault && !this.isValidAddress(this.config.blockchain.contracts.vault)) {
            errors.push('Invalid vault contract address');
        }

        if (this.config.blockchain.contracts.quickswapRouter && !this.isValidAddress(this.config.blockchain.contracts.quickswapRouter)) {
            errors.push('Invalid QuickSwap router address');
        }

        if (this.config.blockchain.contracts.standardCLOB && !this.isValidAddress(this.config.blockchain.contracts.standardCLOB)) {
            errors.push('Invalid Standard CLOB address');
        }

        // Validate trading parameters
        if (this.config.trading.maxSlippage < 0 || this.config.trading.maxSlippage > 1) {
            errors.push('Max slippage must be between 0 and 1');
        }

        if (this.config.trading.minProfitThreshold < 0) {
            errors.push('Min profit threshold must be positive');
        }

        if (this.config.trading.riskTolerance < 0 || this.config.trading.riskTolerance > 1) {
            errors.push('Risk tolerance must be between 0 and 1');
        }

        // Validate risk parameters
        if (this.config.risk.maxDrawdown < 0 || this.config.risk.maxDrawdown > 1) {
            errors.push('Max drawdown must be between 0 and 1');
        }

        if (this.config.risk.stopLossThreshold < 0 || this.config.risk.stopLossThreshold > 1) {
            errors.push('Stop loss threshold must be between 0 and 1');
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }

        if (this.config.realtime.port < 1 || this.config.realtime.port > 65535) {
            throw new Error('Realtime port must be between 1 and 65535');
        }
    }

    /**
     * Check if address is valid Ethereum address
     */
    private isValidAddress(address: string): boolean {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Get nested configuration value by dot notation path
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Get private key from environment
     */
    getPrivateKey(): string {
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('PRIVATE_KEY environment variable is required');
        }
        
        // Add 0x prefix if not present
        return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    }

    /**
     * Get wallet address from private key
     */
    getWalletAddress(): string {
        const address = process.env.WALLET_ADDRESS;
        if (!address) {
            throw new Error('WALLET_ADDRESS environment variable is required');
        }
        return address;
    }

    /**
     * Check if we're in development mode
     */
    isDevelopment(): boolean {
        return this.config.agent.environment === 'development';
    }

    /**
     * Check if we're in production mode
     */
    isProduction(): boolean {
        return this.config.agent.environment === 'production';
    }

    /**
     * Check if trading is enabled
     */
    isTradingEnabled(): boolean {
        return this.config.trading.enabled;
    }

    /**
     * Get configuration for logging
     */
    getLogConfig() {
        return {
            level: this.config.agent.logLevel,
            environment: this.config.agent.environment,
            service: this.config.agent.name,
            version: this.config.agent.version
        };
    }
}