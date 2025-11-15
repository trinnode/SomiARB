import { EventEmitter } from 'events';
import winston from 'winston';
import { ConfigManager } from '../config/ConfigManager';
import { 
    RiskAssessment, 
    ArbitrageOpportunity, 
    MarketEvent,
    RiskError 
} from '../types';

interface RiskMetrics {
    totalExposure: bigint;
    dailyPnL: number;
    maxDrawdown: number;
    consecutiveLosses: number;
    errorRate: number;
    lastEmergencyStop: number;
}

interface PositionLimit {
    token: string;
    maxSingle: bigint;
    maxTotal: bigint;
    currentExposure: bigint;
}

/**
 * Risk Manager for monitoring and controlling trading risks
 * Implements comprehensive risk management for the arbitrage system
 */
export class RiskManager extends EventEmitter {
    private riskMetrics: RiskMetrics;
    private positionLimits: Map<string, PositionLimit> = new Map();
    private recentTrades: Array<{ timestamp: number; profit: number; success: boolean }> = [];
    private emergencyStopActive: boolean = false;
    private cooldownEndTime: number = 0;
    
    // Risk thresholds from configuration
    private maxDrawdown: number;
    private stopLossThreshold: number;
    private maxErrorRate: number;
    private riskCooldownPeriod: number;
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger
    ) {
        super();
        
        // Initialize properties first
        this.maxDrawdown = 0;
        this.stopLossThreshold = 0;
        this.maxErrorRate = 0;
        this.riskCooldownPeriod = 0;
        
        this.riskMetrics = {
            totalExposure: BigInt(0),
            dailyPnL: 0,
            maxDrawdown: 0,
            consecutiveLosses: 0,
            errorRate: 0,
            lastEmergencyStop: 0
        };
        
        this.initializeRiskParameters();
        this.initializeRiskMetrics();
        this.initializePositionLimits();
    }
    
    /**
     * Initialize risk manager
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing risk manager...');
        
        // Start periodic risk assessment
        this.startPeriodicRiskAssessment();
        
        this.logger.info('Risk manager initialized successfully');
    }
    
    /**
     * Assess risk for a market event
     */
    async assessEvent(event: MarketEvent): Promise<RiskAssessment> {
        try {
            // Check if emergency stop is active
            if (this.emergencyStopActive) {
                return {
                    safe: false,
                    approved: false,
                    reason: 'Emergency stop is active',
                    riskScore: 1.0,
                    maxExposure: BigInt(0),
                    gasLimit: BigInt(0),
                    slippageTolerance: 0
                };
            }
            
            // Check cooldown period
            if (Date.now() < this.cooldownEndTime) {
                return {
                    safe: false,
                    approved: false,
                    reason: 'Risk cooldown period active',
                    riskScore: 0.8,
                    maxExposure: BigInt(0),
                    gasLimit: BigInt(0),
                    slippageTolerance: 0
                };
            }
            
            // Calculate risk score for the event
            const riskScore = this.calculateEventRiskScore(event);
            
            // Determine if event is safe to process
            const safe = riskScore < 0.7; // 70% risk threshold
            
            const assessment: RiskAssessment = {
                safe,
                approved: safe,
                riskScore,
                maxExposure: safe ? this.calculateMaxExposure(event) : BigInt(0),
                gasLimit: this.calculateGasLimit(riskScore),
                slippageTolerance: this.calculateSlippageTolerance(riskScore),
                reason: safe ? undefined : `Risk score too high: ${riskScore.toFixed(2)}`
            };
            
            this.logger.debug('Event risk assessment:', {
                eventType: event.type,
                platform: event.platform,
                riskScore: assessment.riskScore,
                safe: assessment.safe
            });
            
            return assessment;
            
        } catch (error) {
            this.logger.error('Error in event risk assessment:', error);
            throw new RiskError('Risk assessment failed', 1.0, error);
        }
    }
    
    /**
     * Assess risk for an arbitrage opportunity
     */
    async assessOpportunity(opportunity: ArbitrageOpportunity): Promise<RiskAssessment> {
        try {
            this.logger.debug('Assessing arbitrage opportunity risk:', {
                id: opportunity.id,
                expectedProfit: opportunity.expectedProfit,
                volume: opportunity.volume.toString()
            });
            
            // Check if emergency stop is active
            if (this.emergencyStopActive) {
                return {
                    safe: false,
                    approved: false,
                    reason: 'Emergency stop is active',
                    riskScore: 1.0,
                    maxExposure: BigInt(0),
                    gasLimit: BigInt(0),
                    slippageTolerance: 0
                };
            }
            
            // Check position limits
            const positionCheck = this.checkPositionLimits(opportunity);
            if (!positionCheck.approved) {
                return positionCheck;
            }
            
            // Check drawdown limits
            const drawdownCheck = this.checkDrawdownLimits();
            if (!drawdownCheck.approved) {
                return drawdownCheck;
            }
            
            // Check error rate
            const errorRateCheck = this.checkErrorRate();
            if (!errorRateCheck.approved) {
                return errorRateCheck;
            }
            
            // Calculate comprehensive risk score
            const riskScore = this.calculateOpportunityRiskScore(opportunity);
            
            // Determine approval
            const approved = riskScore < 0.6; // 60% threshold for opportunities
            
            const assessment: RiskAssessment = {
                safe: approved,
                approved,
                riskScore,
                maxExposure: approved ? opportunity.volume : BigInt(0),
                gasLimit: this.calculateGasLimit(riskScore),
                slippageTolerance: this.calculateSlippageTolerance(riskScore),
                reason: approved ? undefined : `Risk score too high: ${riskScore.toFixed(2)}`
            };
            
            this.logger.debug('Opportunity risk assessment:', {
                id: opportunity.id,
                riskScore: assessment.riskScore,
                approved: assessment.approved,
                reason: assessment.reason
            });
            
            return assessment;
            
        } catch (error) {
            this.logger.error('Error in opportunity risk assessment:', error);
            throw new RiskError('Opportunity risk assessment failed', 1.0, error);
        }
    }
    
    /**
     * Record trade execution result for risk tracking
     */
    recordTradeResult(profit: number, success: boolean, gasUsed: number): void {
        const tradeResult = {
            timestamp: Date.now(),
            profit,
            success
        };
        
        // Add to recent trades
        this.recentTrades.push(tradeResult);
        
        // Keep only last 100 trades
        if (this.recentTrades.length > 100) {
            this.recentTrades.shift();
        }
        
        // Update risk metrics
        this.updateRiskMetrics(tradeResult);
        
        // Check for risk threshold breaches
        this.checkRiskThresholds();
        
        this.logger.debug('Trade result recorded:', tradeResult);
    }
    
    /**
     * Trigger emergency stop
     */
    triggerEmergencyStop(reason: string): void {
        this.logger.error(`Emergency stop triggered: ${reason}`);
        
        this.emergencyStopActive = true;
        this.riskMetrics.lastEmergencyStop = Date.now();
        
        this.emit('emergencyStop', { reason, timestamp: Date.now() });
    }
    
    /**
     * Clear emergency stop (manual intervention required)
     */
    clearEmergencyStop(): void {
        this.logger.info('Emergency stop cleared');
        this.emergencyStopActive = false;
    }
    
    /**
     * Start cooldown period
     */
    startCooldownPeriod(): void {
        this.cooldownEndTime = Date.now() + (this.riskCooldownPeriod * 1000);
        this.logger.warn(`Risk cooldown started for ${this.riskCooldownPeriod} seconds`);
        
        this.emit('cooldownStarted', { endTime: this.cooldownEndTime });
    }
    
    /**
     * Initialize risk parameters from configuration
     */
    private initializeRiskParameters(): void {
        const riskConfig = this.config.get('risk');
        
        this.maxDrawdown = riskConfig.maxDrawdown;
        this.stopLossThreshold = riskConfig.stopLossThreshold;
        this.maxErrorRate = this.config.get('monitoring.alertThresholds.errorRate');
        this.riskCooldownPeriod = riskConfig.cooldownPeriod;
        
        this.logger.info('Risk parameters initialized:', {
            maxDrawdown: this.maxDrawdown,
            stopLossThreshold: this.stopLossThreshold,
            maxErrorRate: this.maxErrorRate,
            cooldownPeriod: this.riskCooldownPeriod
        });
    }
    
    /**
     * Initialize risk metrics
     */
    private initializeRiskMetrics(): void {
        this.riskMetrics = {
            totalExposure: BigInt(0),
            dailyPnL: 0,
            maxDrawdown: 0,
            consecutiveLosses: 0,
            errorRate: 0,
            lastEmergencyStop: 0
        };
    }
    
    /**
     * Initialize position limits
     */
    private initializePositionLimits(): void {
        const tokens = this.config.getBlockchainConfig().tokens;
        const riskConfig = this.config.get('risk');
        
        Object.entries(tokens).forEach(([symbol, address]) => {
            this.positionLimits.set(address.toLowerCase(), {
                token: symbol,
                maxSingle: riskConfig.positionLimits.single,
                maxTotal: riskConfig.positionLimits.total,
                currentExposure: BigInt(0)
            });
        });
    }
    
    /**
     * Calculate risk score for market event
     */
    private calculateEventRiskScore(event: MarketEvent): number {
        let score = 0.1; // Base score
        
        // Age of event (older events are riskier)
        const age = Date.now() - event.timestamp;
        const ageSeconds = age / 1000;
        if (ageSeconds > 10) score += 0.2; // Old data
        if (ageSeconds > 30) score += 0.3; // Very old data
        
        // Event type risk
        switch (event.type) {
            case 'priceUpdate':
                score += 0.1;
                break;
            case 'trade':
                score += 0.2;
                break;
            case 'liquidityChange':
                score += 0.3;
                break;
            case 'orderbook':
                score += 0.15;
                break;
        }
        
        // Platform risk
        if (event.platform === 'standardclob') {
            score += 0.1; // CLOB might be more volatile
        }
        
        // Volume risk (if available)
        if (event.volume) {
            const volumeEth = parseFloat(event.volume.toString()) / 1e18;
            if (volumeEth > 100) score += 0.2; // Large volume
            if (volumeEth > 1000) score += 0.3; // Very large volume
        }
        
        return Math.min(score, 1.0);
    }
    
    /**
     * Calculate risk score for arbitrage opportunity
     */
    private calculateOpportunityRiskScore(opportunity: ArbitrageOpportunity): number {
        let score = 0.1; // Base score
        
        // Profit margin risk (too good to be true?)
        const profitPercent = (opportunity.expectedProfit / Number(opportunity.volume)) * 100;
        if (profitPercent > 5) score += 0.3; // Very high profit might be suspicious
        if (profitPercent > 10) score += 0.5; // Extremely high profit
        
        // Confidence factor
        score += (1 - opportunity.confidence) * 0.4;
        
        // Time to expiry
        const timeToExpiry = opportunity.expiresAt - Date.now();
        if (timeToExpiry < 5000) score += 0.3; // Less than 5 seconds
        if (timeToExpiry < 2000) score += 0.5; // Less than 2 seconds
        
        // Volume risk
        const volumeEth = parseFloat(opportunity.volume.toString()) / 1e18;
        if (volumeEth > 10) score += 0.2; // Large position
        if (volumeEth > 50) score += 0.4; // Very large position
        
        // Gas cost vs profit ratio
        const gasCostRatio = opportunity.estimatedGasCost / opportunity.expectedProfit;
        if (gasCostRatio > 0.5) score += 0.3; // High gas cost
        if (gasCostRatio > 0.8) score += 0.5; // Very high gas cost
        
        // Current risk metrics
        score += this.riskMetrics.errorRate * 0.3;
        score += (this.riskMetrics.consecutiveLosses / 10) * 0.2;
        
        return Math.min(score, 1.0);
    }
    
    /**
     * Check position limits
     */
    private checkPositionLimits(opportunity: ArbitrageOpportunity): RiskAssessment {
        const tokenA = opportunity.tokenA.toLowerCase();
        const tokenB = opportunity.tokenB.toLowerCase();
        
        const limitA = this.positionLimits.get(tokenA);
        const limitB = this.positionLimits.get(tokenB);
        
        // Check single position limit
        if (opportunity.volume > this.config.get('risk.positionLimits.single')) {
            return {
                safe: false,
                approved: false,
                reason: 'Single position limit exceeded',
                riskScore: 0.9,
                maxExposure: BigInt(0),
                gasLimit: BigInt(0),
                slippageTolerance: 0
            };
        }
        
        // Check total exposure limit
        if (this.riskMetrics.totalExposure + opportunity.volume > this.config.get('risk.positionLimits.total')) {
            return {
                safe: false,
                approved: false,
                reason: 'Total exposure limit exceeded',
                riskScore: 0.9,
                maxExposure: BigInt(0),
                gasLimit: BigInt(0),
                slippageTolerance: 0
            };
        }
        
        return {
            safe: true,
            approved: true,
            riskScore: 0.1,
            maxExposure: opportunity.volume,
            gasLimit: BigInt(300000),
            slippageTolerance: 0.02
        };
    }
    
    /**
     * Check drawdown limits
     */
    private checkDrawdownLimits(): RiskAssessment {
        if (this.riskMetrics.maxDrawdown > this.maxDrawdown) {
            return {
                safe: false,
                approved: false,
                reason: `Max drawdown exceeded: ${this.riskMetrics.maxDrawdown.toFixed(2)}%`,
                riskScore: 0.95,
                maxExposure: BigInt(0),
                gasLimit: BigInt(0),
                slippageTolerance: 0
            };
        }
        
        return {
            safe: true,
            approved: true,
            riskScore: this.riskMetrics.maxDrawdown / this.maxDrawdown * 0.5,
            maxExposure: BigInt(0), // Will be set by caller
            gasLimit: BigInt(300000),
            slippageTolerance: 0.02
        };
    }
    
    /**
     * Check error rate
     */
    private checkErrorRate(): RiskAssessment {
        if (this.riskMetrics.errorRate > this.maxErrorRate) {
            return {
                safe: false,
                approved: false,
                reason: `Error rate too high: ${this.riskMetrics.errorRate.toFixed(2)}%`,
                riskScore: 0.9,
                maxExposure: BigInt(0),
                gasLimit: BigInt(0),
                slippageTolerance: 0
            };
        }
        
        return {
            safe: true,
            approved: true,
            riskScore: this.riskMetrics.errorRate / this.maxErrorRate * 0.3,
            maxExposure: BigInt(0), // Will be set by caller
            gasLimit: BigInt(300000),
            slippageTolerance: 0.02
        };
    }
    
    /**
     * Calculate maximum exposure for event
     */
    private calculateMaxExposure(event: MarketEvent): bigint {
        const baseExposure = this.config.get('risk.positionLimits.single');
        
        // Reduce exposure based on risk factors
        let exposureMultiplier = 1.0;
        
        // Age factor
        const age = Date.now() - event.timestamp;
        const ageSeconds = age / 1000;
        if (ageSeconds > 10) exposureMultiplier *= 0.8;
        if (ageSeconds > 30) exposureMultiplier *= 0.5;
        
        // Platform factor
        if (event.platform === 'standardclob') {
            exposureMultiplier *= 0.9; // Slightly more conservative for CLOB
        }
        
        return baseExposure.mul(Math.floor(exposureMultiplier * 100)).div(100);
    }
    
    /**
     * Calculate gas limit based on risk score
     */
    private calculateGasLimit(riskScore: number): bigint {
        const baseGasLimit = BigInt(300000);
        
        // Reduce gas limit for higher risk
        const gasMultiplier = Math.max(0.5, 1 - riskScore * 0.5);
        
        return baseGasLimit * BigInt(Math.floor(gasMultiplier * 100)) / BigInt(100);
    }
    
    /**
     * Calculate slippage tolerance based on risk score
     */
    private calculateSlippageTolerance(riskScore: number): number {
        const baseSlippage = this.config.getTradingConfig().maxSlippage;
        
        // Reduce slippage tolerance for higher risk
        return baseSlippage * Math.max(0.3, 1 - riskScore);
    }
    
    /**
     * Update risk metrics after trade
     */
    private updateRiskMetrics(tradeResult: { timestamp: number; profit: number; success: boolean }): void {
        // Update daily P&L
        this.riskMetrics.dailyPnL += tradeResult.profit;
        
        // Update consecutive losses
        if (!tradeResult.success || tradeResult.profit < 0) {
            this.riskMetrics.consecutiveLosses++;
        } else {
            this.riskMetrics.consecutiveLosses = 0;
        }
        
        // Update error rate
        const recentTrades = this.recentTrades.slice(-20); // Last 20 trades
        const failedTrades = recentTrades.filter(trade => !trade.success).length;
        this.riskMetrics.errorRate = recentTrades.length > 0 ? failedTrades / recentTrades.length : 0;
        
        // Update max drawdown
        const recentPnL = this.recentTrades.slice(-10).reduce((sum, trade) => sum + trade.profit, 0);
        if (recentPnL < 0) {
            const drawdownPercent = Math.abs(recentPnL) / Math.max(1, this.riskMetrics.dailyPnL || 1000);
            this.riskMetrics.maxDrawdown = Math.max(this.riskMetrics.maxDrawdown, drawdownPercent);
        }
    }
    
    /**
     * Check for risk threshold breaches
     */
    private checkRiskThresholds(): void {
        // Check consecutive losses
        if (this.riskMetrics.consecutiveLosses >= 5) {
            this.emit('riskThresholdExceeded', {
                type: 'consecutiveLosses',
                value: this.riskMetrics.consecutiveLosses,
                threshold: 5
            });
            this.startCooldownPeriod();
        }
        
        // Check error rate
        if (this.riskMetrics.errorRate > this.maxErrorRate) {
            this.emit('riskThresholdExceeded', {
                type: 'errorRate',
                value: this.riskMetrics.errorRate,
                threshold: this.maxErrorRate
            });
            this.startCooldownPeriod();
        }
        
        // Check drawdown
        if (this.riskMetrics.maxDrawdown > this.stopLossThreshold) {
            this.triggerEmergencyStop(`Max drawdown exceeded: ${this.riskMetrics.maxDrawdown.toFixed(2)}%`);
        }
    }
    
    /**
     * Start periodic risk assessment
     */
    private startPeriodicRiskAssessment(): void {
        setInterval(() => {
            this.performPeriodicRiskAssessment();
        }, 60000); // Every minute
    }
    
    /**
     * Perform periodic risk assessment
     */
    private performPeriodicRiskAssessment(): void {
        try {
            // Reset daily metrics at start of new day
            const now = new Date();
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastTradeToday = this.recentTrades.find(trade => trade.timestamp >= dayStart.getTime());
            
            if (!lastTradeToday && this.riskMetrics.dailyPnL !== 0) {
                this.riskMetrics.dailyPnL = 0;
                this.riskMetrics.maxDrawdown = 0;
                this.logger.info('Daily risk metrics reset');
            }
            
            // Log current risk metrics
            this.logger.debug('Periodic risk assessment:', this.riskMetrics);
            
        } catch (error) {
            this.logger.error('Error in periodic risk assessment:', error);
        }
    }
    
    /**
     * Get current risk metrics
     */
    getRiskMetrics(): RiskMetrics {
        return { ...this.riskMetrics };
    }
    
    /**
     * Get risk status summary
     */
    getRiskStatus() {
        return {
            emergencyStopActive: this.emergencyStopActive,
            cooldownActive: Date.now() < this.cooldownEndTime,
            cooldownEndTime: this.cooldownEndTime,
            riskMetrics: this.getRiskMetrics(),
            recentTradeCount: this.recentTrades.length
        };
    }
}