import winston from 'winston';
import { EventEmitter } from 'events';
import { ConfigManager } from './config/ConfigManager.js';
import { DataStreamManager } from './streams/DataStreamManager.js';
import { ArbitrageEngine } from './arbitrage/ArbitrageEngine.js';
import { RiskManager } from './risk/RiskManager.js';
import { MetricsCollector } from './monitoring/MetricsCollector.js';
import { HealthMonitor } from './monitoring/HealthMonitor.js';
import { ArbitrageOpportunity, MarketEvent } from './types/index.js';

/**
 * Main SomiArb Reactive Agent class
 * Orchestrates all components and manages the reactive arbitrage flow
 */
export class SomiArbAgent extends EventEmitter {
    private isRunning: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 5000; // 5 seconds
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger,
        private dataStreamManager: DataStreamManager,
        private arbitrageEngine: ArbitrageEngine,
        private riskManager: RiskManager,
        private metricsCollector: MetricsCollector,
        private healthMonitor: HealthMonitor
    ) {
        super();
        this.setupEventHandlers();
    }
    
    /**
     * Start the reactive agent
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Agent is already running');
            return;
        }
        
        this.logger.info('Starting SomiArb Reactive Agent...');
        
        try {
            // Initialize components
            await this.initializeComponents();
            
            // Start data stream subscriptions
            await this.startDataStreams();
            
            // Start monitoring
            await this.startMonitoring();
            
            this.isRunning = true;
            this.logger.info('SomiArb Agent started successfully');
            this.emit('started');
            
        } catch (error) {
            this.logger.error('Failed to start agent:', error);
            throw error;
        }
    }
    
    /**
     * Stop the reactive agent
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            this.logger.warn('Agent is not running');
            return;
        }
        
        this.logger.info('Stopping SomiArb Reactive Agent...');
        
        try {
            // Stop data streams
            await this.dataStreamManager.stopAll();
            
            // Stop monitoring
            await this.healthMonitor.stop();
            
            // Final metrics collection
            await this.metricsCollector.collectFinalMetrics();
            
            this.isRunning = false;
            this.logger.info('SomiArb Agent stopped successfully');
            this.emit('stopped');
            
        } catch (error) {
            this.logger.error('Error stopping agent:', error);
        }
    }
    
    /**
     * Get current agent status
     */
    getStatus(): { isRunning: boolean; uptime: number; metrics: any } {
        return {
            isRunning: this.isRunning,
            uptime: this.metricsCollector.getUptime(),
            metrics: this.metricsCollector.getCurrentMetrics()
        };
    }
    
    /**
     * Initialize all components
     */
    private async initializeComponents(): Promise<void> {
        this.logger.info('Initializing agent components...');
        
        // Initialize arbitrage engine
        await this.arbitrageEngine.initialize();
        
        // Initialize risk manager
        await this.riskManager.initialize();
        
        // Initialize metrics collector
        await this.metricsCollector.initialize();
        
        // Initialize health monitor
        await this.healthMonitor.initialize();
        
        this.logger.info('All components initialized successfully');
    }
    
    /**
     * Start data stream subscriptions
     */
    private async startDataStreams(): Promise<void> {
        this.logger.info('Starting data stream subscriptions...');
        
        // Subscribe to QuickSwap events
        await this.dataStreamManager.subscribeToQuickSwapEvents();
        
        // Subscribe to Standard CLOB events
        await this.dataStreamManager.subscribeToStandardCLOBEvents();
        
        // Subscribe to price feeds
        await this.dataStreamManager.subscribeToPriceFeeds();
        
        this.logger.info('Data stream subscriptions started successfully');
    }
    
    /**
     * Start monitoring systems
     */
    private async startMonitoring(): Promise<void> {
        this.logger.info('Starting monitoring systems...');
        
        // Start health monitoring
        await this.healthMonitor.start();
        
        // Start metrics collection
        this.metricsCollector.startCollection();
        
        this.logger.info('Monitoring systems started successfully');
    }
    
    /**
     * Setup event handlers for reactive flow
     */
    private setupEventHandlers(): void {
        // Handle market events from data streams\n        this.dataStreamManager.on('marketEvent', this.handleMarketEvent.bind(this));
        this.dataStreamManager.on('error', this.handleDataStreamError.bind(this));
        this.dataStreamManager.on('reconnected', this.handleReconnection.bind(this));
        
        // Handle arbitrage opportunities
        this.arbitrageEngine.on('opportunityFound', this.handleArbitrageOpportunity.bind(this));
        this.arbitrageEngine.on('executionComplete', this.handleExecutionComplete.bind(this));
        this.arbitrageEngine.on('executionFailed', this.handleExecutionFailed.bind(this));
        
        // Handle risk events
        this.riskManager.on('riskThresholdExceeded', this.handleRiskThreshold.bind(this));
        this.riskManager.on('emergencyStop', this.handleEmergencyStop.bind(this));
        
        // Handle health monitoring
        this.healthMonitor.on('healthCheck', this.handleHealthCheck.bind(this));
        this.healthMonitor.on('componentFailure', this.handleComponentFailure.bind(this));
    }
    
    /**
     * Handle incoming market events (The core reactive logic)
     */
    private async handleMarketEvent(event: MarketEvent): Promise<void> {
        try {
            this.logger.debug('Processing market event:', event);
            
            // Update metrics
            this.metricsCollector.recordEvent('marketEvent', event.type);
            
            // Risk assessment
            const riskAssessment = await this.riskManager.assessEvent(event);
            if (!riskAssessment.safe) {
                this.logger.warn(`Market event rejected due to risk: ${riskAssessment.reason}`);
                return;
            }
            
            // Analyze for arbitrage opportunities
            const opportunities = await this.arbitrageEngine.analyzeEvent(event);
            
            if (opportunities.length > 0) {
                this.logger.info(`Found ${opportunities.length} arbitrage opportunities`);
                
                // Execute the best opportunity
                const bestOpportunity = this.selectBestOpportunity(opportunities);
                await this.executeArbitrageOpportunity(bestOpportunity);
            }
            
        } catch (error) {
            this.logger.error('Error handling market event:', error);
            this.metricsCollector.recordError('marketEventHandling');
        }
    }
    
    /**
     * Handle arbitrage opportunity execution
     */
    private async handleArbitrageOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
        try {
            this.logger.info('Arbitrage opportunity found:', {
                tokenPair: `${opportunity.tokenA}/${opportunity.tokenB}`,
                expectedProfit: opportunity.expectedProfit,
                route: `${opportunity.buyPlatform} -> ${opportunity.sellPlatform}`
            });
            
            // Final risk check
            const riskCheck = await this.riskManager.assessOpportunity(opportunity);
            if (!riskCheck.approved) {
                this.logger.warn(`Arbitrage opportunity rejected: ${riskCheck.reason}`);
                return;
            }
            
            // Execute the arbitrage
            await this.arbitrageEngine.execute(opportunity);
            
        } catch (error) {
            this.logger.error('Error handling arbitrage opportunity:', error);
            this.metricsCollector.recordError('arbitrageExecution');
        }
    }
    
    /**
     * Execute arbitrage opportunity with risk management
     */
    private async executeArbitrageOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
        try {
            this.logger.info('Executing arbitrage opportunity...', {
                id: opportunity.id,
                expectedProfit: opportunity.expectedProfit
            });
            
            // Record attempt
            this.metricsCollector.recordAttempt('arbitrageExecution');
            
            // Execute through the engine
            await this.arbitrageEngine.execute(opportunity);
            
        } catch (error) {
            this.logger.error('Failed to execute arbitrage opportunity:', error);
            this.metricsCollector.recordError('arbitrageExecution');
            throw error;
        }
    }
    
    /**
     * Select the best arbitrage opportunity from multiple options
     */
    private selectBestOpportunity(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity {
        // Sort by expected profit (accounting for gas costs and slippage)
        return opportunities.sort((a, b) => {
            const profitA = a.expectedProfit - a.estimatedGasCost - a.slippageCost;
            const profitB = b.expectedProfit - b.estimatedGasCost - b.slippageCost;
            return profitB - profitA;
        })[0];
    }
    
    /**
     * Handle execution completion
     */
    private async handleExecutionComplete(result: any): Promise<void> {
        this.logger.info('Arbitrage execution completed successfully:', {
            transactionHash: result.transactionHash,
            actualProfit: result.actualProfit,
            gasUsed: result.gasUsed
        });
        
        this.metricsCollector.recordSuccess('arbitrageExecution', {
            profit: result.actualProfit,
            gasUsed: result.gasUsed
        });
        
        this.emit('arbitrageSuccess', result);
    }
    
    /**
     * Handle execution failure
     */
    private async handleExecutionFailed(error: any): Promise<void> {
        this.logger.error('Arbitrage execution failed:', error);
        
        this.metricsCollector.recordError('arbitrageExecution');
        this.emit('arbitrageFailed', error);
    }
    
    /**
     * Handle data stream errors with retry logic
     */
    private async handleDataStreamError(error: any): Promise<void> {
        this.logger.error('Data stream error:', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(async () => {
                try {
                    await this.dataStreamManager.reconnectAll();
                } catch (reconnectError) {
                    this.logger.error('Reconnection failed:', reconnectError);
                    await this.handleDataStreamError(reconnectError);
                }
            }, this.reconnectDelay);
        } else {
            this.logger.error('Max reconnection attempts reached. Stopping agent.');
            await this.stop();
        }
    }
    
    /**
     * Handle successful reconnection
     */
    private handleReconnection(): void {
        this.logger.info('Data streams reconnected successfully');
        this.reconnectAttempts = 0;
        this.emit('reconnected');
    }
    
    /**
     * Handle risk threshold exceeded
     */
    private async handleRiskThreshold(riskEvent: any): Promise<void> {
        this.logger.warn('Risk threshold exceeded:', riskEvent);
        
        // Pause trading temporarily
        await this.arbitrageEngine.pauseExecution();
        
        // Wait for cooldown period
        setTimeout(async () => {
            await this.arbitrageEngine.resumeExecution();
            this.logger.info('Trading resumed after risk cooldown');
        }, this.config.get('riskCooldownPeriod') * 1000);
    }
    
    /**
     * Handle emergency stop
     */
    private async handleEmergencyStop(emergency: any): Promise<void> {
        this.logger.error('Emergency stop triggered:', emergency);
        
        // Stop all arbitrage execution immediately
        await this.arbitrageEngine.emergencyStop();
        
        // Stop data streams
        await this.dataStreamManager.stopAll();
        
        this.emit('emergencyStop', emergency);
    }
    
    /**
     * Handle health check results
     */
    private handleHealthCheck(health: any): void {
        if (!health.healthy) {
            this.logger.warn('Health check failed:', health.issues);
        }
        
        this.metricsCollector.recordHealthCheck(health);
    }
    
    /**
     * Handle component failure
     */
    private async handleComponentFailure(failure: any): Promise<void> {
        this.logger.error('Component failure detected:', failure);
        
        // Attempt component recovery
        try {
            await this.recoverComponent(failure.component);
        } catch (error) {
            this.logger.error('Component recovery failed:', error);
            await this.handleEmergencyStop({ reason: 'Component failure', component: failure.component });
        }
    }
    
    /**
     * Recover failed component
     */
    private async recoverComponent(componentName: string): Promise<void> {
        this.logger.info(`Attempting to recover component: ${componentName}`);
        
        switch (componentName) {
            case 'dataStreams':
                await this.dataStreamManager.reconnectAll();
                break;
            case 'arbitrageEngine':
                await this.arbitrageEngine.initialize();
                break;
            case 'riskManager':
                await this.riskManager.initialize();
                break;
            default:
                throw new Error(`Unknown component: ${componentName}`);
        }
        
        this.logger.info(`Component ${componentName} recovered successfully`);
    }
}