import { EventEmitter } from 'events';
import WebSocket from 'ws';
import winston from 'winston';
import { MarketEvent, PriceData, OrderBook, StreamSubscription, DataStreamError } from '../types';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Data Stream Manager for handling real-time market data
 * Manages connections to QuickSwap, Standard CLOB, and price feeds
 */
export class DataStreamManager extends EventEmitter {
    private quickswapWs: WebSocket | null = null;
    private standardClobWs: WebSocket | null = null;
    private priceUpdateInterval: NodeJS.Timeout | null = null;
    private mockIntervals: NodeJS.Timeout[] = [];
    private useMockStreams: boolean;
    
    private subscriptions: Map<string, StreamSubscription> = new Map();
    private reconnectAttempts: Map<string, number> = new Map();
    private isConnected: Map<string, boolean> = new Map();
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger
    ) {
        super();
        this.useMockStreams = this.config.getDataStreamConfig().useMock;
        this.initializeConnectionTracking();
    }
    
    /**
     * Subscribe to QuickSwap market events
     */
    async subscribeToQuickSwapEvents(): Promise<void> {
        this.logger.info('Subscribing to QuickSwap events...');
        if (this.useMockStreams) {
            this.logger.warn('Mock data streams enabled: emitting synthetic QuickSwap events');
            this.startMockMarketStream('quickswap');
            return;
        }
        
        try {
            const config = this.config.getDataStreamConfig().quickswap;
            
            this.quickswapWs = new WebSocket(config.endpoint, {
                headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : undefined
            });
            
            this.setupQuickSwapHandlers();
            
            await this.waitForConnection(this.quickswapWs);
            
            // Subscribe to price updates
            this.subscribeToQuickSwapPrices();
            
            // Subscribe to trade events
            this.subscribeToQuickSwapTrades();
            
            // Subscribe to liquidity changes
            this.subscribeToQuickSwapLiquidity();
            
            this.isConnected.set('quickswap', true);
            this.logger.info('QuickSwap subscription successful');
            
        } catch (error) {
            this.logger.error('Failed to subscribe to QuickSwap events:', error);
            throw new DataStreamError('QuickSwap subscription failed', 'quickswap', error);
        }
    }
    
    /**
     * Subscribe to Standard CLOB market events
     */
    async subscribeToStandardCLOBEvents(): Promise<void> {
        this.logger.info('Subscribing to Standard CLOB events...');
        if (this.useMockStreams) {
            this.logger.warn('Mock data streams enabled: emitting synthetic Standard CLOB events');
            this.startMockMarketStream('standardclob');
            return;
        }
        
        try {
            const config = this.config.getDataStreamConfig().standardclob;
            
            this.standardClobWs = new WebSocket(config.endpoint, {
                headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : undefined
            });
            
            this.setupStandardCLOBHandlers();
            
            await this.waitForConnection(this.standardClobWs);
            
            // Subscribe to order book updates
            this.subscribeToOrderBookUpdates();
            
            // Subscribe to trade events
            this.subscribeToStandardCLOBTrades();
            
            this.isConnected.set('standardclob', true);
            this.logger.info('Standard CLOB subscription successful');
            
        } catch (error) {
            this.logger.error('Failed to subscribe to Standard CLOB events:', error);
            throw new DataStreamError('Standard CLOB subscription failed', 'standardclob', error);
        }
    }
    
    /**
     * Subscribe to price feed updates
     */
    async subscribeToPriceFeeds(): Promise<void> {
        this.logger.info('Starting price feed subscriptions...');
        if (this.useMockStreams) {
            this.logger.warn('Mock data streams enabled: emitting synthetic price feed updates');
            this.startMockPriceFeeds();
            return;
        }
        
        const config = this.config.getDataStreamConfig().priceFeeds;
        
        this.priceUpdateInterval = setInterval(async () => {
            try {
                await this.fetchAndEmitPriceUpdates();
            } catch (error) {
                this.logger.error('Price feed update error:', error);
                this.emit('error', new DataStreamError('Price feed error', 'priceFeeds', error));
            }
        }, config.updateInterval);
        
        // Fetch initial prices
        await this.fetchAndEmitPriceUpdates();
        
        this.logger.info('Price feed subscriptions started');
    }
    
    /**
     * Setup QuickSwap WebSocket handlers
     */
    private setupQuickSwapHandlers(): void {
        if (!this.quickswapWs) return;
        
        this.quickswapWs.on('open', () => {
            this.logger.info('QuickSwap WebSocket connected');
            this.reconnectAttempts.set('quickswap', 0);
        });
        
        this.quickswapWs.on('message', (data) => {
            try {
                this.handleQuickSwapMessage(JSON.parse(data.toString()));
            } catch (error) {
                this.logger.error('Error parsing QuickSwap message:', error);
            }
        });
        
        this.quickswapWs.on('error', (error) => {
            this.logger.error('QuickSwap WebSocket error:', error);
            this.handleReconnection('quickswap');
        });
        
        this.quickswapWs.on('close', (code, reason) => {
            this.logger.warn(`QuickSwap WebSocket closed: ${code} ${reason}`);
            this.isConnected.set('quickswap', false);
            this.handleReconnection('quickswap');
        });
    }
    
    /**
     * Setup Standard CLOB WebSocket handlers
     */
    private setupStandardCLOBHandlers(): void {
        if (!this.standardClobWs) return;
        
        this.standardClobWs.on('open', () => {
            this.logger.info('Standard CLOB WebSocket connected');
            this.reconnectAttempts.set('standardclob', 0);
        });
        
        this.standardClobWs.on('message', (data) => {
            try {
                this.handleStandardCLOBMessage(JSON.parse(data.toString()));
            } catch (error) {
                this.logger.error('Error parsing Standard CLOB message:', error);
            }
        });
        
        this.standardClobWs.on('error', (error) => {
            this.logger.error('Standard CLOB WebSocket error:', error);
            this.handleReconnection('standardclob');
        });
        
        this.standardClobWs.on('close', (code, reason) => {
            this.logger.warn(`Standard CLOB WebSocket closed: ${code} ${reason}`);
            this.isConnected.set('standardclob', false);
            this.handleReconnection('standardclob');
        });
    }
    
    /**
     * Handle QuickSwap messages
     */
    private handleQuickSwapMessage(message: any): void {
        try {
            switch (message.type) {
                case 'price_update':
                    this.handlePriceUpdate(message, 'quickswap');
                    break;
                case 'trade':
                    this.handleTradeEvent(message, 'quickswap');
                    break;
                case 'liquidity_change':
                    this.handleLiquidityChange(message, 'quickswap');
                    break;
                default:
                    this.logger.debug('Unknown QuickSwap message type:', message.type);
            }
        } catch (error) {
            this.logger.error('Error handling QuickSwap message:', error);
        }
    }
    
    /**
     * Handle Standard CLOB messages
     */
    private handleStandardCLOBMessage(message: any): void {
        try {
            switch (message.type) {
                case 'orderbook_update':
                    this.handleOrderBookUpdate(message, 'standardclob');
                    break;
                case 'trade':
                    this.handleTradeEvent(message, 'standardclob');
                    break;
                case 'order_update':
                    this.handleOrderUpdate(message, 'standardclob');
                    break;
                default:
                    this.logger.debug('Unknown Standard CLOB message type:', message.type);
            }
        } catch (error) {
            this.logger.error('Error handling Standard CLOB message:', error);
        }
    }
    
    /**
     * Handle price update events
     */
    private handlePriceUpdate(message: any, platform: string): void {
        const marketEvent: MarketEvent = {
            id: `${platform}-price-${Date.now()}`,
            type: 'priceUpdate',
            platform: platform as any,
            tokenA: message.tokenA,
            tokenB: message.tokenB,
            price: message.price,
            volume: message.volume,
            timestamp: message.timestamp || Date.now(),
            blockNumber: message.blockNumber || 0,
            data: message
        };
        
        this.emit('marketEvent', marketEvent);
    }
    
    /**
     * Handle trade events
     */
    private handleTradeEvent(message: any, platform: string): void {
        const marketEvent: MarketEvent = {
            id: `${platform}-trade-${Date.now()}`,
            type: 'trade',
            platform: platform as any,
            tokenA: message.tokenA,
            tokenB: message.tokenB,
            price: message.price,
            volume: message.amount,
            timestamp: message.timestamp || Date.now(),
            blockNumber: message.blockNumber || 0,
            transactionHash: message.txHash,
            data: message
        };
        
        this.emit('marketEvent', marketEvent);
    }
    
    /**
     * Handle liquidity change events
     */
    private handleLiquidityChange(message: any, platform: string): void {
        const marketEvent: MarketEvent = {
            id: `${platform}-liquidity-${Date.now()}`,
            type: 'liquidityChange',
            platform: platform as any,
            tokenA: message.tokenA,
            tokenB: message.tokenB,
            liquidity: message.liquidity,
            timestamp: message.timestamp || Date.now(),
            blockNumber: message.blockNumber || 0,
            data: message
        };
        
        this.emit('marketEvent', marketEvent);
    }
    
    /**
     * Handle order book updates
     */
    private handleOrderBookUpdate(message: any, platform: string): void {
        const marketEvent: MarketEvent = {
            id: `${platform}-orderbook-${Date.now()}`,
            type: 'orderbook',
            platform: platform as any,
            tokenA: message.pair.split('/')[0],
            tokenB: message.pair.split('/')[1],
            timestamp: message.timestamp || Date.now(),
            blockNumber: 0,
            data: {
                orderBook: this.parseOrderBook(message.orderBook, platform, message.pair)
            }
        };
        
        this.emit('marketEvent', marketEvent);
    }
    
    /**
     * Handle order updates
     */
    private handleOrderUpdate(message: any, platform: string): void {
        // Emit order update event (could be used for advanced strategies)
        this.emit('orderUpdate', {
            platform,
            orderId: message.orderId,
            status: message.status,
            timestamp: Date.now(),
            data: message
        });
    }
    
    /**
     * Parse order book data
     */
    private parseOrderBook(orderBookData: any, platform: string, pair: string): OrderBook {
        return {
            bids: orderBookData.bids.map((bid: any) => ({
                price: bid.price,
                volume: bid.volume
            })),
            asks: orderBookData.asks.map((ask: any) => ({
                price: ask.price,
                volume: ask.volume
            })),
            timestamp: Date.now(),
            platform,
            pair
        };
    }
    
    /**
     * Subscribe to QuickSwap price updates
     */
    private subscribeToQuickSwapPrices(): void {
        const tokens = this.config.getDataStreamConfig().priceFeeds.tokens;
        
        const subscription = {
            type: 'subscribe',
            channel: 'prices',
            pairs: tokens.map(token => `${token}/USDC`)
        };
        
        this.quickswapWs?.send(JSON.stringify(subscription));
    }
    
    /**
     * Subscribe to QuickSwap trade events
     */
    private subscribeToQuickSwapTrades(): void {
        const subscription = {
            type: 'subscribe',
            channel: 'trades',
            pairs: ['WETH/USDC', 'USDT/USDC', 'DAI/USDC']
        };
        
        this.quickswapWs?.send(JSON.stringify(subscription));
    }
    
    /**
     * Subscribe to QuickSwap liquidity changes
     */
    private subscribeToQuickSwapLiquidity(): void {
        const subscription = {
            type: 'subscribe',
            channel: 'liquidity',
            pairs: ['WETH/USDC', 'USDT/USDC', 'DAI/USDC']
        };
        
        this.quickswapWs?.send(JSON.stringify(subscription));
    }
    
    /**
     * Subscribe to Standard CLOB order book updates
     */
    private subscribeToOrderBookUpdates(): void {
        const subscription = {
            type: 'subscribe',
            channel: 'orderbook',
            pairs: ['WETH/USDC', 'USDT/USDC', 'DAI/USDC']
        };
        
        this.standardClobWs?.send(JSON.stringify(subscription));
    }
    
    /**
     * Subscribe to Standard CLOB trade events
     */
    private subscribeToStandardCLOBTrades(): void {
        const subscription = {
            type: 'subscribe',
            channel: 'trades',
            pairs: ['WETH/USDC', 'USDT/USDC', 'DAI/USDC']
        };
        
        this.standardClobWs?.send(JSON.stringify(subscription));
    }
    
    private startMockMarketStream(platform: 'quickswap' | 'standardclob'): void {
        const tokens = this.config.getDataStreamConfig().priceFeeds.tokens.filter(token => token !== 'USDC');
        const intervalMs = platform === 'quickswap' ? 2000 : 2600;
        const wei = BigInt(10) ** BigInt(18);
        const interval = setInterval(() => {
            if (tokens.length === 0) return;
            const tokenA = tokens[Math.floor(Math.random() * tokens.length)];
            const tokenB = 'USDC';
            const priceBase = 800 + Math.floor(Math.random() * 400);
            const price = BigInt(priceBase) * wei;
            const volume = BigInt(1 + Math.floor(Math.random() * 5)) * wei;
            const marketEvent: MarketEvent = {
                id: `${platform}-mock-${Date.now()}`,
                type: 'trade',
                platform: platform as any,
                tokenA,
                tokenB,
                price,
                volume,
                timestamp: Date.now(),
                blockNumber: Date.now(),
                data: { mock: true }
            };

            this.emit('marketEvent', marketEvent);
        }, intervalMs);

        this.mockIntervals.push(interval);
        this.isConnected.set(platform, true);
    }

    private startMockPriceFeeds(): void {
        const tokens = this.config.getDataStreamConfig().priceFeeds.tokens;
        const updateInterval = this.config.getDataStreamConfig().priceFeeds.updateInterval;
        const wei = BigInt(10) ** BigInt(18);

        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }

        this.priceUpdateInterval = setInterval(() => {
            tokens.forEach((token) => {
                const basePrice = 1 + Math.floor(Math.random() * 1000);
                const priceEvent: PriceData = {
                    token,
                    price: BigInt(basePrice) * wei,
                    volume24h: BigInt(Math.floor(Math.random() * 1_000_000)),
                    liquidity: BigInt(Math.floor(Math.random() * 100_000)),
                    timestamp: Date.now(),
                    source: 'mock'
                };

                this.emit('priceUpdate', priceEvent);
            });
        }, updateInterval);

        this.isConnected.set('priceFeeds', true);
    }

    /**
     * Fetch and emit price updates from HTTP API
     */
    private async fetchAndEmitPriceUpdates(): Promise<void> {
        const config = this.config.getDataStreamConfig().priceFeeds;
        
        try {
            const response = await fetch(`${config.endpoint}?tokens=${config.tokens.join(',')}`);
            if (!response.ok) {
                throw new Error(`Price feed API responded with status ${response.status}`);
            }
            
            const priceData = await response.json();
            
            const priceDataTyped = priceData as { prices: any[] };
            for (const price of priceDataTyped.prices) {
                const priceEvent: PriceData = {
                    token: price.token,
                    price: price.price,
                    volume24h: price.volume24h,
                    liquidity: price.liquidity,
                    timestamp: Date.now(),
                    source: 'priceFeeds'
                };
                
                this.emit('priceUpdate', priceEvent);
            }
            
        } catch (error) {
            this.logger.error('Failed to fetch price updates:', error);
            throw error;
        }
    }
    
    /**
     * Wait for WebSocket connection
     */
    private waitForConnection(ws: WebSocket): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    
    /**
     * Handle reconnection logic
     */
    private async handleReconnection(platform: string): Promise<void> {
        const currentAttempts = this.reconnectAttempts.get(platform) || 0;
        const config = this.config.getDataStreamConfig();
        const maxReconnects = platform === 'quickswap' 
            ? config.quickswap.maxReconnects 
            : config.standardclob.maxReconnects;
        const delay = platform === 'quickswap'
            ? config.quickswap.reconnectDelay
            : config.standardclob.reconnectDelay;
        
        if (currentAttempts >= maxReconnects) {
            this.logger.error(`Max reconnection attempts reached for ${platform}`);
            this.emit('error', new DataStreamError(`Max reconnections exceeded`, platform));
            return;
        }
        
        this.reconnectAttempts.set(platform, currentAttempts + 1);
        
        this.logger.info(`Reconnecting to ${platform} (attempt ${currentAttempts + 1}/${maxReconnects})...`);
        
        setTimeout(async () => {
            try {
                if (platform === 'quickswap') {
                    await this.subscribeToQuickSwapEvents();
                } else if (platform === 'standardclob') {
                    await this.subscribeToStandardCLOBEvents();
                }
                
                this.emit('reconnected', platform);
                
            } catch (error) {
                this.logger.error(`Reconnection failed for ${platform}:`, error);
                await this.handleReconnection(platform);
            }
        }, delay);
    }
    
    /**
     * Initialize connection tracking
     */
    private initializeConnectionTracking(): void {
        this.isConnected.set('quickswap', false);
        this.isConnected.set('standardclob', false);
        this.isConnected.set('priceFeeds', false);
        
        this.reconnectAttempts.set('quickswap', 0);
        this.reconnectAttempts.set('standardclob', 0);
    }
    
    /**
     * Reconnect all connections
     */
    async reconnectAll(): Promise<void> {
        this.logger.info('Reconnecting all data streams...');
        
        const promises = [];
        
        if (!this.isConnected.get('quickswap')) {
            promises.push(this.subscribeToQuickSwapEvents());
        }
        
        if (!this.isConnected.get('standardclob')) {
            promises.push(this.subscribeToStandardCLOBEvents());
        }
        
        await Promise.all(promises);
        
        this.logger.info('All data streams reconnected');
    }
    
    /**
     * Stop all connections
     */
    async stopAll(): Promise<void> {
        this.logger.info('Stopping all data streams...');
        
        // Close WebSocket connections
        if (this.quickswapWs) {
            this.quickswapWs.close();
            this.quickswapWs = null;
        }
        
        if (this.standardClobWs) {
            this.standardClobWs.close();
            this.standardClobWs = null;
        }
        
        // Clear price update interval
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
            this.priceUpdateInterval = null;
        }

        if (this.mockIntervals.length > 0) {
            this.mockIntervals.forEach(clearInterval);
            this.mockIntervals = [];
        }
        
        // Reset connection tracking
        this.initializeConnectionTracking();
        
        this.logger.info('All data streams stopped');
    }
    
    /**
     * Get connection status
     */
    getConnectionStatus(): { [platform: string]: boolean } {
        return {
            quickswap: this.isConnected.get('quickswap') || false,
            standardclob: this.isConnected.get('standardclob') || false,
            priceFeeds: this.priceUpdateInterval !== null
        };
    }
}