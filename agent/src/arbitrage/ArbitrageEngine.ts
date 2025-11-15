import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { ethers, JsonRpcProvider, Contract, Wallet, formatEther, parseEther } from 'ethers';
import winston from 'winston';
import { ConfigManager } from '../config/ConfigManager';
import { 
    ArbitrageOpportunity, 
    MarketEvent, 
    ExecutionResult, 
    TradeParams, 
    GasEstimate,
    ArbitrageError 
} from '../types';

/**
 * Arbitrage Engine for detecting and executing arbitrage opportunities
 * Core logic for the reactive arbitrage system
 */
export class ArbitrageEngine extends EventEmitter {
    private provider: JsonRpcProvider;
    private wallet: Wallet;
    private vaultContract: Contract;
    private quickswapRouter: Contract;
    private standardCLOB: Contract;
    
    private isExecutionPaused: boolean = false;
    private executionCount: number = 0;
    private totalProfit: number = 0;
    
    // Price tracking for arbitrage detection
    private quickswapPrices: Map<string, bigint> = new Map();
    private standardClobPrices: Map<string, bigint> = new Map();
    private lastPriceUpdate: Map<string, number> = new Map();
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger
    ) {
        super();
        // Initialize provider, wallet, and contracts in initialize() method
        this.provider = null as any;
        this.wallet = null as any;
        this.vaultContract = null as any;
        this.quickswapRouter = null as any;
        this.standardCLOB = null as any;
    }
    
    /**
     * Initialize the arbitrage engine
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing arbitrage engine...');
        
        try {
            // Setup blockchain connection
            await this.setupBlockchainConnection();
            
            // Load contract instances
            await this.loadContracts();
            
            // Initialize price tracking
            this.initializePriceTracking();
            
            this.logger.info('Arbitrage engine initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize arbitrage engine:', error);
            throw error;
        }
    }
    
    /**
     * Analyze market event for arbitrage opportunities
     */
    async analyzeEvent(event: MarketEvent): Promise<ArbitrageOpportunity[]> {
        try {
            const opportunities: ArbitrageOpportunity[] = [];
            
            // Update price tracking
            this.updatePriceTracking(event);
            
            // Skip if execution is paused
            if (this.isExecutionPaused) {
                return opportunities;
            }
            
            // Analyze based on event type
            switch (event.type) {
                case 'priceUpdate':
                    opportunities.push(...await this.analyzePriceUpdate(event));
                    break;
                case 'trade':
                    opportunities.push(...await this.analyzeTradeEvent(event));
                    break;
                case 'liquidityChange':
                    opportunities.push(...await this.analyzeLiquidityChange(event));
                    break;
                case 'orderbook':
                    opportunities.push(...await this.analyzeOrderBookUpdate(event));
                    break;
            }
            
            // Filter and validate opportunities
            const validOpportunities = await this.validateOpportunities(opportunities);
            
            if (validOpportunities.length > 0) {
                this.logger.info(`Found ${validOpportunities.length} arbitrage opportunities from ${event.type} event`);
                validOpportunities.forEach(opp => this.emit('opportunityFound', opp));
            }
            
            return validOpportunities;
            
        } catch (error) {
            this.logger.error('Error analyzing market event:', error);
            return [];
        }
    }
    
    /**
     * Execute arbitrage opportunity
     */
    async execute(opportunity: ArbitrageOpportunity): Promise<ExecutionResult> {
        const startTime = Date.now();
        
        try {
            this.logger.info('Executing arbitrage opportunity:', {
                id: opportunity.id,
                route: `${opportunity.buyPlatform} -> ${opportunity.sellPlatform}`,
                expectedProfit: opportunity.expectedProfit
            });
            
            // Pre-execution validation
            await this.validateExecution(opportunity);
            
            // Estimate gas
            const gasEstimate = await this.estimateGas(opportunity);
            
            // Execute the arbitrage transaction
            const result = await this.executeArbitrageTransaction(opportunity, gasEstimate);
            
            // Calculate actual profit
            const actualProfit = await this.calculateActualProfit(result);
            
            const executionResult: ExecutionResult = {
                success: true,
                transactionHash: 'hash' in result ? String(result.hash) : '',
                actualProfit,
                gasUsed: 0, // Will be updated after receipt
                executionTime: Date.now() - startTime
            };
            
            // Wait for transaction receipt to get actual gas used
            try {
                const txHash = 'hash' in result ? String(result.hash) : '';
                if (txHash) {
                    const receipt = await this.provider.waitForTransaction(txHash);
                    if (receipt) {
                        executionResult.gasUsed = Number(receipt.gasUsed);
                        executionResult.transactionHash = receipt.hash;
                    }
                }
            } catch (receiptError) {
                this.logger.warn('Could not get transaction receipt:', receiptError);
            }
            
            // Update metrics
            this.executionCount++;
            this.totalProfit += actualProfit;
            
            this.logger.info('Arbitrage executed successfully:', {
                txHash: executionResult.transactionHash,
                actualProfit,
                gasUsed: executionResult.gasUsed,
                executionTime: executionResult.executionTime
            });
            
            this.emit('executionComplete', executionResult);
            return executionResult;
            
        } catch (error) {
            const executionResult: ExecutionResult = {
                success: false,
                transactionHash: '',
                actualProfit: 0,
                gasUsed: 0,
                executionTime: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            
            this.logger.error('Arbitrage execution failed:', error);
            this.emit('executionFailed', { opportunity, error, result: executionResult });
            
            return executionResult;
        }
    }
    
    /**
     * Pause execution
     */
    async pauseExecution(): Promise<void> {
        this.isExecutionPaused = true;
        this.logger.warn('Arbitrage execution paused');
    }
    
    /**
     * Resume execution
     */
    async resumeExecution(): Promise<void> {
        this.isExecutionPaused = false;
        this.logger.info('Arbitrage execution resumed');
    }
    
    /**
     * Emergency stop all executions
     */
    async emergencyStop(): Promise<void> {
        this.isExecutionPaused = true;
        this.logger.error('Emergency stop activated - all arbitrage execution halted');
        this.emit('emergencyStop');
    }
    
    /**
     * Setup blockchain connection
     */
    private async setupBlockchainConnection(): Promise<void> {
        const blockchainConfig = this.config.getBlockchainConfig();
        
        // Create provider
        this.provider = new JsonRpcProvider(blockchainConfig.rpcUrl);
        
        // Create wallet
        const privateKey = this.config.getPrivateKey();
        this.wallet = new Wallet(privateKey, this.provider);
        
        // Test connection
        const network = await this.provider.getNetwork();
        if (Number(network.chainId) !== blockchainConfig.chainId) {
            throw new Error(`Chain ID mismatch. Expected ${blockchainConfig.chainId}, got ${network.chainId}`);
        }
        
        // Check wallet balance
        const balance = await this.provider.getBalance(this.wallet.address);
        this.logger.info(`Wallet connected: ${this.wallet.address}, Balance: ${formatEther(balance)} ETH`);
        
        if (balance < parseEther('0.01')) {
            this.logger.warn('Low wallet balance detected');
        }
    }
    
    /**
     * Load contract instances
     */
    private async loadContracts(): Promise<void> {
        const contracts = this.config.getBlockchainConfig().contracts;
        
        const vaultArtifactPath = path.resolve(
            process.cwd(),
            '../contracts/artifacts/contracts/SomiArbVault.sol/SomiArbVault.json'
        );

        if (!fs.existsSync(vaultArtifactPath)) {
            throw new Error(`SomiArbVault artifact not found at ${vaultArtifactPath}`);
        }

        const vaultArtifact = JSON.parse(fs.readFileSync(vaultArtifactPath, 'utf-8'));
        const vaultABI = vaultArtifact.abi;
        this.vaultContract = new Contract(contracts.vault, vaultABI, this.wallet);
        
        // Load QuickSwap router ABI
        const quickswapABI = [
            'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
            'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
        ];
        this.quickswapRouter = new Contract(contracts.quickswapRouter, quickswapABI, this.wallet);
        
        // Load Standard CLOB ABI
        const standardCLOBABI = [
            'function getPrice(address tokenA, address tokenB) external view returns (uint256)',
            'function executeOrder(bytes calldata orderData) external returns (bool)'
        ];
        this.standardCLOB = new Contract(contracts.standardCLOB, standardCLOBABI, this.wallet);
    }
    
    /**
     * Initialize price tracking
     */
    private initializePriceTracking(): void {
        // Initialize with current prices if available
        const tokens = this.config.getDataStreamConfig().priceFeeds.tokens;
        tokens.forEach(token => {
            this.quickswapPrices.set(`${token}/USDC`, BigInt(0));
            this.standardClobPrices.set(`${token}/USDC`, BigInt(0));
            this.lastPriceUpdate.set(`${token}/USDC`, 0);
        });
    }
    
    /**
     * Update price tracking from market events
     */
    private updatePriceTracking(event: MarketEvent): void {
        if (!event.price) return;
        
        const pair = `${event.tokenA}/${event.tokenB}`;
        
        if (event.platform === 'quickswap') {
            this.quickswapPrices.set(pair, event.price);
        } else if (event.platform === 'standardclob') {
            this.standardClobPrices.set(pair, event.price);
        }
        
        this.lastPriceUpdate.set(pair, event.timestamp);
    }
    
    /**
     * Analyze price update events for arbitrage
     */
    private async analyzePriceUpdate(event: MarketEvent): Promise<ArbitrageOpportunity[]> {
        const opportunities: ArbitrageOpportunity[] = [];
        const pair = `${event.tokenA}/${event.tokenB}`;
        
        // Get prices from both platforms
        const quickswapPrice = this.quickswapPrices.get(pair);
        const standardClobPrice = this.standardClobPrices.get(pair);
        
        if (!quickswapPrice || !standardClobPrice || quickswapPrice === BigInt(0) || standardClobPrice === BigInt(0)) {
            return opportunities;
        }
        
        // Calculate price difference
        const priceDiff = quickswapPrice > standardClobPrice ? quickswapPrice - standardClobPrice : standardClobPrice - quickswapPrice;
        const avgPrice = (quickswapPrice + standardClobPrice) / BigInt(2);
        const priceDiffPercent = Number(priceDiff * BigInt(10000) / avgPrice) / 100; // In percentage
        
        // Check if arbitrage opportunity exists
        const minProfitThreshold = this.config.getTradingConfig().minProfitThreshold * 100;
        
        if (priceDiffPercent > minProfitThreshold) {
            const buyPlatform = quickswapPrice < standardClobPrice ? 'quickswap' : 'standardclob';
            const sellPlatform = buyPlatform === 'quickswap' ? 'standardclob' : 'quickswap';
            const buyPrice = buyPlatform === 'quickswap' ? quickswapPrice : standardClobPrice;
            const sellPrice = buyPlatform === 'quickswap' ? standardClobPrice : quickswapPrice;
            
            // Estimate volumes and costs
            const volume = await this.estimateOptimalVolume(pair, buyPrice, sellPrice);
            const gasEstimate = await this.estimateGasCost();
            const slippageCost = this.estimateSlippageCost(volume, priceDiffPercent);
            
            const opportunity: ArbitrageOpportunity = {
                id: `arb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                tokenA: event.tokenA,
                tokenB: event.tokenB,
                buyPlatform,
                sellPlatform,
                buyPrice,
                sellPrice,
                expectedProfit: (priceDiffPercent / 100) * Number(volume),
                estimatedGasCost: gasEstimate,
                slippageCost,
                confidence: this.calculateConfidence(priceDiffPercent, event.timestamp),
                timestamp: event.timestamp,
                expiresAt: event.timestamp + 30000, // 30 seconds expiry
                volume: volume as bigint,
                route: [event.tokenA, event.tokenB]
            };
            
            opportunities.push(opportunity);
        }
        
        return opportunities;
    }
    
    /**
     * Analyze trade events for arbitrage
     */
    private async analyzeTradeEvent(event: MarketEvent): Promise<ArbitrageOpportunity[]> {
        // Similar logic to price updates but considering trade impact
        return this.analyzePriceUpdate(event);
    }
    
    /**
     * Analyze liquidity changes for arbitrage
     */
    private async analyzeLiquidityChange(event: MarketEvent): Promise<ArbitrageOpportunity[]> {
        // Liquidity changes might create temporary arbitrage opportunities
        return this.analyzePriceUpdate(event);
    }
    
    /**
     * Analyze order book updates for arbitrage
     */
    private async analyzeOrderBookUpdate(event: MarketEvent): Promise<ArbitrageOpportunity[]> {
        const opportunities: ArbitrageOpportunity[] = [];
        
        if (!event.data?.orderBook) return opportunities;
        
        const orderBook = event.data.orderBook;
        const bestBid = orderBook.bids[0];
        const bestAsk = orderBook.asks[0];
        
        if (!bestBid || !bestAsk) return opportunities;
        
        // Check for cross-platform arbitrage with order book
        const pair = `${event.tokenA}/${event.tokenB}`;
        const quickswapPrice = this.quickswapPrices.get(pair);
        
        if (!quickswapPrice || quickswapPrice === BigInt(0)) return opportunities;
        
        // Compare QuickSwap price with CLOB best bid/ask
        if (quickswapPrice < bestBid.price) {
            // Buy on QuickSwap, sell on CLOB
            const opportunity = await this.createOpportunityFromOrderBook(
                event, 'quickswap', 'standardclob', quickswapPrice, bestBid.price, bestBid.volume
            );
            if (opportunity) opportunities.push(opportunity);
        }
        
        if (quickswapPrice > bestAsk.price) {
            // Buy on CLOB, sell on QuickSwap
            const opportunity = await this.createOpportunityFromOrderBook(
                event, 'standardclob', 'quickswap', bestAsk.price, quickswapPrice, bestAsk.volume
            );
            if (opportunity) opportunities.push(opportunity);
        }
        
        return opportunities;
    }
    
    /**
     * Create arbitrage opportunity from order book analysis
     */
    private async createOpportunityFromOrderBook(
        event: MarketEvent,
        buyPlatform: 'quickswap' | 'standardclob',
        sellPlatform: 'quickswap' | 'standardclob',
        buyPrice: BigInt,
        sellPrice: BigInt,
        maxVolume: BigInt
    ): Promise<ArbitrageOpportunity | null> {
        // Convert BigInt prices to numbers for calculation
        const buyPriceNum = typeof buyPrice === 'bigint' ? Number(buyPrice) / 1e18 : Number(buyPrice);
        const sellPriceNum = typeof sellPrice === 'bigint' ? Number(sellPrice) / 1e18 : Number(sellPrice);
        
        const priceDiff = Math.abs(sellPriceNum - buyPriceNum);
        const profitPercent = (priceDiff / buyPriceNum) * 100;
        
        const minProfitThreshold = this.config.getTradingConfig().minProfitThreshold * 100;
        
        if (profitPercent <= minProfitThreshold) return null;
        
        const optimalVolume = await this.estimateOptimalVolume(
            `${event.tokenA}/${event.tokenB}`, 
            buyPrice, 
            sellPrice,
            maxVolume
        );
        
        const gasEstimate = await this.estimateGasCost();
        const slippageCost = this.estimateSlippageCost(optimalVolume, profitPercent);
        
        return {
            id: `arb-ob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tokenA: event.tokenA,
            tokenB: event.tokenB,
            buyPlatform,
            sellPlatform,
            buyPrice: typeof buyPrice === 'bigint' ? buyPrice : BigInt(Math.floor(Number(buyPrice) * 1e18)),
            sellPrice: typeof sellPrice === 'bigint' ? sellPrice : BigInt(Math.floor(Number(sellPrice) * 1e18)),
            expectedProfit: (profitPercent / 100) * Number(optimalVolume),
            estimatedGasCost: gasEstimate,
            slippageCost,
            confidence: this.calculateConfidence(profitPercent, event.timestamp),
            timestamp: event.timestamp,
            expiresAt: event.timestamp + 15000, // 15 seconds expiry for order book opportunities
            volume: typeof optimalVolume === 'bigint' ? optimalVolume : BigInt(Math.floor(Number(optimalVolume) * 1e18)),
            route: [event.tokenA, event.tokenB]
        };
    }
    
    /**
     * Validate opportunities before execution
     */
    private async validateOpportunities(opportunities: ArbitrageOpportunity[]): Promise<ArbitrageOpportunity[]> {
        const validated: ArbitrageOpportunity[] = [];
        
        for (const opportunity of opportunities) {
            try {
                // Check if opportunity is still valid (not expired)
                if (Date.now() > opportunity.expiresAt) continue;
                
                // Check minimum profit threshold
                const tradingConfig = this.config.getTradingConfig();
                const netProfit = opportunity.expectedProfit - opportunity.estimatedGasCost - opportunity.slippageCost;
                
                if (netProfit < tradingConfig.minProfitThreshold) continue;
                
                // Check position size limits
                if (opportunity.volume > tradingConfig.maxPositionSize) {
                    opportunity.volume = tradingConfig.maxPositionSize;
                    // Recalculate profit with adjusted volume
                    const profitRate = opportunity.expectedProfit / Number(opportunity.volume);
                    opportunity.expectedProfit = profitRate * Number(tradingConfig.maxPositionSize);
                }
                
                validated.push(opportunity);
                
            } catch (error) {
                this.logger.warn('Opportunity validation failed:', error);
            }
        }
        
        return validated;
    }
    
    /**
     * Validate execution parameters
     */
    private async validateExecution(opportunity: ArbitrageOpportunity): Promise<void> {
        // Check if execution is paused
        if (this.isExecutionPaused) {
            throw new ArbitrageError('Execution is currently paused', 'EXECUTION_PAUSED');
        }
        
        // Check opportunity expiry
        if (Date.now() > opportunity.expiresAt) {
            throw new ArbitrageError('Opportunity has expired', 'OPPORTUNITY_EXPIRED');
        }
        
        // Check wallet balance
        const balance = await this.provider.getBalance(this.wallet.address);
        const requiredBalance = opportunity.volume + BigInt(opportunity.estimatedGasCost);
        
        if (balance < requiredBalance) {
            throw new ArbitrageError('Insufficient wallet balance', 'INSUFFICIENT_BALANCE');
        }
        
        // Check current gas price
        const feeData = await this.provider.getFeeData();
        const currentGasPrice = feeData.gasPrice || BigInt('20000000000'); // fallback to 20 gwei
        const maxGasPrice = this.config.getTradingConfig().maxGasPrice;
        
        if (currentGasPrice > maxGasPrice) {
            throw new ArbitrageError('Gas price too high', 'HIGH_GAS_PRICE');
        }
    }
    
    /**
     * Estimate gas cost for arbitrage transaction
     */
    private async estimateGas(opportunity: ArbitrageOpportunity): Promise<GasEstimate> {
        try {
            // This would depend on your specific arbitrage contract implementation
            const gasLimit = BigInt(300000); // Estimated gas limit for arbitrage
            const gasPrice = await this.provider.getFeeData();
            
            return {
                gasLimit,
                gasPrice: gasPrice.gasPrice || BigInt(0),
                totalCost: gasLimit * (gasPrice.gasPrice || BigInt(0))
            };
            
        } catch (error) {
            this.logger.error('Gas estimation failed:', error);
            throw new ArbitrageError('Gas estimation failed', 'GAS_ESTIMATION_FAILED', error);
        }
    }
    
    /**
     * Execute the arbitrage transaction
     */
    private async executeArbitrageTransaction(
        opportunity: ArbitrageOpportunity, 
        gasEstimate: GasEstimate
    ): Promise<ethers.ContractTransaction> {
        try {
            // This would call your vault contract's arbitrage execution function
            const tx = await this.vaultContract.executeArbitrage(
                opportunity.tokenA,
                opportunity.tokenB,
                opportunity.volume,
                opportunity.buyPlatform,
                opportunity.sellPlatform,
                {
                    gasLimit: gasEstimate.gasLimit,
                    gasPrice: gasEstimate.gasPrice
                }
            );
            
            return tx;
            
        } catch (error) {
            this.logger.error('Transaction execution failed:', error);
            throw new ArbitrageError('Transaction execution failed', 'TX_EXECUTION_FAILED', error);
        }
    }
    
    /**
     * Calculate actual profit from transaction result
     */
    private async calculateActualProfit(txResult: ethers.ContractTransaction): Promise<number> {
        // Wait for transaction receipt
        // For ethers v6, transaction hash is available directly
        const txHash = 'hash' in txResult ? String(txResult.hash) : String(txResult);
        const receipt = await this.provider.waitForTransaction(txHash);
        
        // Parse logs to extract actual profit (this would depend on your contract events)
        // For now, return estimated profit - gas cost
        if (!receipt) {
            throw new Error('Transaction receipt not found');
        }
        const gasCost = receipt.gasUsed * (BigInt(txResult.gasPrice || 0));
        
        // This would need to be implemented based on your contract's profit calculation
        return 0; // Placeholder
    }
    
    /**
     * Estimate optimal volume for arbitrage
     */
    private async estimateOptimalVolume(
        pair: string, 
        buyPrice: BigInt, 
        sellPrice: BigInt, 
        maxVolume?: BigInt
    ): Promise<BigInt> {
        const tradingConfig = this.config.getTradingConfig();
        
        // Start with maximum position size
        let volume = tradingConfig.maxPositionSize;
        
        // Limit by available liquidity if provided
        if (maxVolume && volume > (maxVolume as bigint)) {
            volume = maxVolume as bigint;
        }
        
        // Consider slippage impact
        const slippageLimit = tradingConfig.maxSlippage;
        const estimatedSlippage = this.estimateSlippageForVolume(volume, pair);
        
        if (estimatedSlippage > slippageLimit) {
            // Reduce volume to stay within slippage limits
            volume = volume * BigInt(Math.floor(slippageLimit * 100)) / BigInt(Math.floor(estimatedSlippage * 100));
        }
        
        return volume;
    }
    
    /**
     * Estimate gas cost
     */
    private async estimateGasCost(): Promise<number> {
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice || BigInt('20000000000'); // fallback to 20 gwei
        const gasLimit = 300000; // Estimated gas for arbitrage transaction
        
        return Number(gasPrice * BigInt(gasLimit));
    }
    
    /**
     * Estimate slippage cost
     */
    private estimateSlippageCost(volume: BigInt, profitPercent: number): number {
        // Simple slippage estimation (this could be more sophisticated)
        const volumeEth = parseFloat(formatEther(volume as bigint));
        const slippageRate = Math.min(volumeEth * 0.001, profitPercent * 0.1); // Max 10% of profit
        
        return volumeEth * slippageRate;
    }
    
    /**
     * Calculate confidence score for opportunity
     */
    private calculateConfidence(profitPercent: number, timestamp: number): number {
        // Base confidence on profit margin
        let confidence = Math.min(profitPercent / 5, 1); // Max confidence at 5% profit
        
        // Reduce confidence for older data
        const age = Date.now() - timestamp;
        const ageSeconds = age / 1000;
        const ageFactor = Math.max(0, 1 - (ageSeconds / 60)); // Reduce confidence over 1 minute
        
        return confidence * ageFactor;
    }
    
    /**
     * Estimate slippage for given volume
     */
    private estimateSlippageForVolume(volume: BigInt, pair: string): number {
        // This would typically query the DEX for current liquidity
        // For now, use a simple estimation
        const volumeEth = parseFloat(formatEther(volume as bigint));
        
        // Assume slippage increases with volume
        return Math.min(volumeEth * 0.001, 0.05); // Max 5% slippage
    }
    
    /**
     * Get execution metrics
     */
    getMetrics() {
        return {
            executionCount: this.executionCount,
            totalProfit: this.totalProfit,
            isExecutionPaused: this.isExecutionPaused,
            averageProfit: this.executionCount > 0 ? this.totalProfit / this.executionCount : 0
        };
    }
}