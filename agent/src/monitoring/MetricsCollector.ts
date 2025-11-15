import { EventEmitter } from 'events';
import winston from 'winston';
import { ConfigManager } from '../config/ConfigManager';
import { MetricsData, HealthStatus } from '../types';

interface PerformanceMetric {
    timestamp: number;
    value: number;
    tags?: { [key: string]: string | number };
}

interface LatencyTracker {
    samples: number[];
    startTime: number;
}

/**
 * Metrics Collector for comprehensive performance monitoring
 * Tracks trading performance, system health, and operational metrics
 */
export class MetricsCollector extends EventEmitter {
    private startTime: number;
    private metrics: Map<string, PerformanceMetric[]> = new Map();
    private counters: Map<string, number> = new Map();
    private latencyTrackers: Map<string, LatencyTracker> = new Map();
    
    private collectionInterval: NodeJS.Timeout | null = null;
    private isCollecting: boolean = false;
    
    // Aggregated metrics
    private aggregatedMetrics: MetricsData = {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalProfit: 0,
        averageProfit: 0,
        gasSpent: 0,
        uptime: 0,
        errorRate: 0,
        latency: {
            average: 0,
            p95: 0,
            p99: 0
        },
        riskMetrics: {
            riskScore: 0,
            exposureLevel: 0,
            emergencyStops: 0
        }
    };
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger
    ) {
        super();
        
        this.startTime = Date.now();
        this.initializeMetrics();
        this.initializeCounters();
    }
    
    /**
     * Initialize metrics collector
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing metrics collector...');
        
        this.startTime = Date.now();
        this.isCollecting = true;
        
        this.logger.info('Metrics collector initialized successfully');
    }
    
    /**
     * Start metrics collection
     */
    startCollection(): void {
        const interval = this.config.get('monitoring.metricsCollectionInterval');
        
        this.collectionInterval = setInterval(() => {
            this.collectMetrics();
        }, interval);
        
        this.logger.info(`Metrics collection started with ${interval}ms interval`);
    }
    
    /**
     * Stop metrics collection
     */
    stopCollection(): void {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        
        this.isCollecting = false;
        this.logger.info('Metrics collection stopped');
    }
    
    /**
     * Record a trading event
     */
    recordEvent(eventType: string, details?: any): void {
        try {
            const metric: PerformanceMetric = {
                timestamp: Date.now(),
                value: 1,
                tags: details
            };
            
            this.addMetric(`events.${eventType}`, metric);
            this.incrementCounter(`events.${eventType}.count`);
            
            this.logger.debug(`Event recorded: ${eventType}`, details);
            
        } catch (error) {
            this.logger.error('Error recording event:', error);
        }
    }
    
    /**
     * Record a successful operation
     */
    recordSuccess(operation: string, details?: any): void {
        try {
            const metric: PerformanceMetric = {
                timestamp: Date.now(),
                value: 1,
                tags: details
            };
            
            this.addMetric(`success.${operation}`, metric);
            this.incrementCounter(`success.${operation}.count`);
            this.incrementCounter(`${operation}.total`);
            
            // Record profit if provided
            if (details?.profit !== undefined) {
                this.recordProfit(details.profit);
            }
            
            // Record gas usage if provided
            if (details?.gasUsed !== undefined) {
                this.recordGasUsage(details.gasUsed);
            }
            
            this.logger.debug(`Success recorded: ${operation}`, details);
            
        } catch (error) {
            this.logger.error('Error recording success:', error);
        }
    }
    
    /**
     * Record an error
     */
    recordError(operation: string, error?: any): void {
        try {
            const metric: PerformanceMetric = {
                timestamp: Date.now(),
                value: 1,
                tags: { operation, error: error?.message || 'Unknown error' }
            };
            
            this.addMetric(`errors.${operation}`, metric);
            this.incrementCounter(`errors.${operation}.count`);
            this.incrementCounter(`${operation}.total`);
            this.incrementCounter('errors.total');
            
            this.logger.debug(`Error recorded: ${operation}`, error?.message);
            
        } catch (err) {
            this.logger.error('Error recording error:', err);
        }
    }
    
    /**
     * Record an execution attempt
     */
    recordAttempt(operation: string): void {
        this.incrementCounter(`attempts.${operation}.count`);
        this.incrementCounter(`${operation}.total`);
    }
    
    /**
     * Record profit
     */
    recordProfit(profit: number): void {
        const metric: PerformanceMetric = {
            timestamp: Date.now(),
            value: profit
        };
        
        this.addMetric('trading.profit', metric);
    }
    
    /**
     * Record gas usage
     */
    recordGasUsage(gasUsed: number): void {
        const metric: PerformanceMetric = {
            timestamp: Date.now(),
            value: gasUsed
        };
        
        this.addMetric('trading.gasUsed', metric);
        this.incrementCounter('trading.totalGasUsed', gasUsed);
    }
    
    /**
     * Start latency tracking
     */
    startLatencyTracking(operation: string): string {
        const trackerId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.latencyTrackers.set(trackerId, {
            samples: [],
            startTime: Date.now()
        });
        
        return trackerId;
    }
    
    /**
     * End latency tracking
     */
    endLatencyTracking(trackerId: string): number {
        const tracker = this.latencyTrackers.get(trackerId);
        if (!tracker) {
            this.logger.warn(`Latency tracker not found: ${trackerId}`);
            return 0;
        }
        
        const latency = Date.now() - tracker.startTime;
        
        // Extract operation name from tracker ID
        const operation = trackerId.split('-')[0];
        
        const metric: PerformanceMetric = {
            timestamp: Date.now(),
            value: latency
        };
        
        this.addMetric(`latency.${operation}`, metric);
        this.latencyTrackers.delete(trackerId);
        
        return latency;
    }
    
    /**
     * Record health check result
     */
    recordHealthCheck(health: HealthStatus): void {
        const metric: PerformanceMetric = {
            timestamp: Date.now(),
            value: health.healthy ? 1 : 0,
            tags: {
                uptime: health.uptime,
                issueCount: health.issues.length
            }
        };
        
        this.addMetric('health.status', metric);
        
        if (!health.healthy) {
            this.incrementCounter('health.failures');
        }
    }
    
    /**
     * Get current metrics snapshot
     */
    getCurrentMetrics(): MetricsData {
        const now = Date.now();
        const uptime = now - this.startTime;
        
        // Calculate trading metrics
        const totalTrades = this.getCounter('arbitrageExecution.total') || 0;
        const successfulTrades = this.getCounter('success.arbitrageExecution.count') || 0;
        const failedTrades = this.getCounter('errors.arbitrageExecution.count') || 0;
        
        // Calculate profit metrics
        const profitMetrics = this.getMetricValues('trading.profit');
        const totalProfit = profitMetrics.reduce((sum, profit) => sum + profit, 0);
        const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
        
        // Calculate gas metrics
        const totalGasUsed = this.getCounter('trading.totalGasUsed') || 0;
        
        // Calculate error rate
        const totalEvents = this.getCounter('events.total') || 0;
        const totalErrors = this.getCounter('errors.total') || 0;
        const errorRate = totalEvents > 0 ? totalErrors / totalEvents : 0;
        
        // Calculate latency metrics
        const latencyMetrics = this.calculateLatencyMetrics();
        
        // Calculate risk metrics
        const emergencyStops = this.getCounter('risk.emergencyStops') || 0;
        
        this.aggregatedMetrics = {
            totalTrades,
            successfulTrades,
            failedTrades,
            totalProfit,
            averageProfit,
            gasSpent: totalGasUsed,
            uptime,
            errorRate,
            latency: latencyMetrics,
            riskMetrics: {
                riskScore: 0.2, // This would come from RiskManager
                exposureLevel: 0.1, // This would come from RiskManager
                emergencyStops
            }
        };
        
        return this.aggregatedMetrics;
    }
    
    /**
     * Get uptime in milliseconds
     */
    getUptime(): number {
        return Date.now() - this.startTime;
    }
    
    /**
     * Collect final metrics before shutdown
     */
    async collectFinalMetrics(): Promise<void> {
        this.logger.info('Collecting final metrics before shutdown...');
        
        const finalMetrics = this.getCurrentMetrics();
        
        this.logger.info('Final metrics:', {
            uptime: finalMetrics.uptime,
            totalTrades: finalMetrics.totalTrades,
            successRate: finalMetrics.totalTrades > 0 
                ? (finalMetrics.successfulTrades / finalMetrics.totalTrades * 100).toFixed(2) + '%'
                : '0%',
            totalProfit: finalMetrics.totalProfit,
            errorRate: (finalMetrics.errorRate * 100).toFixed(2) + '%'
        });
        
        // Emit final metrics event
        this.emit('finalMetrics', finalMetrics);
    }
    
    /**
     * Initialize metrics storage
     */
    private initializeMetrics(): void {
        // Initialize metric arrays
        const metricTypes = [
            'events.marketEvent',
            'events.opportunityFound',
            'success.arbitrageExecution',
            'errors.arbitrageExecution',
            'trading.profit',
            'trading.gasUsed',
            'latency.execution',
            'latency.analysis',
            'health.status'
        ];
        
        metricTypes.forEach(type => {
            this.metrics.set(type, []);
        });
    }
    
    /**
     * Initialize counters
     */
    private initializeCounters(): void {
        const counterTypes = [
            'events.total',
            'events.marketEvent.count',
            'arbitrageExecution.total',
            'success.arbitrageExecution.count',
            'errors.arbitrageExecution.count',
            'errors.total',
            'trading.totalGasUsed',
            'health.failures',
            'risk.emergencyStops'
        ];
        
        counterTypes.forEach(type => {
            this.counters.set(type, 0);
        });
    }
    
    /**
     * Add metric to storage
     */
    private addMetric(type: string, metric: PerformanceMetric): void {
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }
        
        const metrics = this.metrics.get(type)!;
        metrics.push(metric);
        
        // Keep only last 1000 metrics per type to prevent memory leaks
        if (metrics.length > 1000) {
            metrics.shift();
        }
    }
    
    /**
     * Increment counter
     */
    private incrementCounter(type: string, amount: number = 1): void {
        const current = this.counters.get(type) || 0;
        this.counters.set(type, current + amount);
    }
    
    /**
     * Get counter value
     */
    private getCounter(type: string): number {
        return this.counters.get(type) || 0;
    }
    
    /**
     * Get metric values
     */
    private getMetricValues(type: string): number[] {
        const metrics = this.metrics.get(type) || [];
        return metrics.map(m => m.value);
    }
    
    /**
     * Calculate latency metrics
     */
    private calculateLatencyMetrics() {
        const executionLatencies = this.getMetricValues('latency.execution');
        const analysisLatencies = this.getMetricValues('latency.analysis');
        const allLatencies = [...executionLatencies, ...analysisLatencies];
        
        if (allLatencies.length === 0) {
            return {
                average: 0,
                p95: 0,
                p99: 0
            };
        }
        
        const sorted = allLatencies.sort((a, b) => a - b);
        const average = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);
        
        return {
            average: Math.round(average),
            p95: sorted[p95Index] || 0,
            p99: sorted[p99Index] || 0
        };
    }
    
    /**
     * Collect periodic metrics
     */
    private collectMetrics(): void {
        try {
            if (!this.isCollecting) return;
            
            const currentMetrics = this.getCurrentMetrics();
            
            // Emit metrics update event
            this.emit('metricsUpdate', currentMetrics);
            
            // Log summary metrics periodically (every 10 minutes)
            const uptimeMinutes = currentMetrics.uptime / (1000 * 60);
            if (uptimeMinutes % 10 < 1) { // Roughly every 10 minutes
                this.logger.info('Periodic metrics summary:', {
                    uptime: `${Math.round(uptimeMinutes)}min`,
                    totalTrades: currentMetrics.totalTrades,
                    successRate: currentMetrics.totalTrades > 0 
                        ? `${(currentMetrics.successfulTrades / currentMetrics.totalTrades * 100).toFixed(1)}%`
                        : '0%',
                    totalProfit: currentMetrics.totalProfit.toFixed(4),
                    avgLatency: `${currentMetrics.latency.average}ms`,
                    errorRate: `${(currentMetrics.errorRate * 100).toFixed(1)}%`
                });
            }
            
        } catch (error) {
            this.logger.error('Error collecting metrics:', error);
        }
    }
    
    /**
     * Get detailed metrics for specific time range
     */
    getMetricsForRange(startTime: number, endTime: number): { [key: string]: PerformanceMetric[] } {
        const rangeMetrics: { [key: string]: PerformanceMetric[] } = {};
        
        this.metrics.forEach((metrics, type) => {
            rangeMetrics[type] = metrics.filter(
                metric => metric.timestamp >= startTime && metric.timestamp <= endTime
            );
        });
        
        return rangeMetrics;
    }
    
    /**
     * Export metrics to JSON
     */
    exportMetrics(): string {
        const exportData = {
            timestamp: Date.now(),
            uptime: this.getUptime(),
            counters: Object.fromEntries(this.counters),
            currentMetrics: this.getCurrentMetrics(),
            recentMetrics: this.getMetricsForRange(
                Date.now() - (60 * 60 * 1000), // Last hour
                Date.now()
            )
        };
        
        return JSON.stringify(exportData, null, 2);
    }
}