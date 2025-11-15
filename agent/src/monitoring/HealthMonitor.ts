import { EventEmitter } from 'events';
import winston from 'winston';
import { ConfigManager } from '../config/ConfigManager';
import { HealthStatus, ComponentHealth } from '../types';

interface HealthCheck {
    name: string;
    check: () => Promise<ComponentHealth>;
    interval: number;
    timeout: number;
}

/**
 * Health Monitor for system component monitoring
 * Monitors health of all system components and triggers alerts
 */
export class HealthMonitor extends EventEmitter {
    private healthChecks: Map<string, HealthCheck> = new Map();
    private componentHealth: Map<string, ComponentHealth> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;
    private isMonitoring: boolean = false;
    private startTime: number;
    
    constructor(
        private config: ConfigManager,
        private logger: winston.Logger
    ) {
        super();
        
        this.startTime = Date.now();
        this.initializeHealthChecks();
    }
    
    /**
     * Initialize health monitor
     */
    async initialize(): Promise<void> {
        this.logger.info('Initializing health monitor...');
        
        // Initialize component health states
        this.initializeComponentHealth();
        
        this.logger.info('Health monitor initialized successfully');
    }
    
    /**
     * Start health monitoring
     */
    async start(): Promise<void> {
        if (this.isMonitoring) {
            this.logger.warn('Health monitor is already running');
            return;
        }
        
        this.logger.info('Starting health monitoring...');
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        
        // Start periodic health checks
        const interval = this.config.get('monitoring.healthCheckInterval');
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, interval);
        
        // Perform initial health check
        await this.performHealthChecks();
        
        this.logger.info(`Health monitoring started with ${interval}ms interval`);
    }
    
    /**
     * Stop health monitoring
     */
    async stop(): Promise<void> {
        if (!this.isMonitoring) {
            this.logger.warn('Health monitor is not running');
            return;
        }
        
        this.logger.info('Stopping health monitoring...');
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.logger.info('Health monitoring stopped');
    }
    
    /**
     * Register external health check
     */
    registerHealthCheck(
        name: string, 
        check: () => Promise<ComponentHealth>,
        interval: number = 30000,
        timeout: number = 10000
    ): void {
        this.healthChecks.set(name, {
            name,
            check,
            interval,
            timeout
        });
        
        this.logger.info(`Health check registered: ${name}`);
    }
    
    /**
     * Get current health status
     */
    getHealthStatus(): HealthStatus {
        const components = Object.fromEntries(this.componentHealth);
        const allHealthy = Array.from(this.componentHealth.values())
            .every(health => health.status === 'healthy');
        
        const issues = Array.from(this.componentHealth.values())
            .filter(health => health.status !== 'healthy')
            .map(health => health.message || `Component ${health.status}`)
            .filter(issue => issue);
        
        return {
            healthy: allHealthy,
            uptime: Date.now() - this.startTime,
            lastCheck: Date.now(),
            issues,
            components: {
                dataStreams: components.dataStreams || this.createDefaultComponentHealth(),
                arbitrageEngine: components.arbitrageEngine || this.createDefaultComponentHealth(),
                riskManager: components.riskManager || this.createDefaultComponentHealth(),
                blockchain: components.blockchain || this.createDefaultComponentHealth()
            }
        };
    }
    
    /**
     * Report component health update
     */
    reportComponentHealth(componentName: string, health: ComponentHealth): void {
        const previousHealth = this.componentHealth.get(componentName);
        this.componentHealth.set(componentName, health);
        
        // Check for status changes
        if (previousHealth && previousHealth.status !== health.status) {
            this.logger.info(`Component health changed: ${componentName} ${previousHealth.status} -> ${health.status}`);
            
            if (health.status === 'unhealthy') {
                this.emit('componentFailure', {
                    component: componentName,
                    health,
                    timestamp: Date.now()
                });
            }
        }
        
        // Emit health update
        this.emit('componentHealthUpdate', {
            component: componentName,
            health,
            timestamp: Date.now()
        });
    }
    
    /**
     * Initialize health checks for system components
     */
    private initializeHealthChecks(): void {
        // Data Streams health check
        this.registerHealthCheck(
            'dataStreams',
            () => this.checkDataStreamsHealth(),
            30000, // 30 seconds
            10000  // 10 second timeout
        );
        
        // Arbitrage Engine health check
        this.registerHealthCheck(
            'arbitrageEngine',
            () => this.checkArbitrageEngineHealth(),
            60000, // 1 minute
            15000  // 15 second timeout
        );
        
        // Risk Manager health check
        this.registerHealthCheck(
            'riskManager',
            () => this.checkRiskManagerHealth(),
            45000, // 45 seconds
            10000  // 10 second timeout
        );
        
        // Blockchain connectivity health check
        this.registerHealthCheck(
            'blockchain',
            () => this.checkBlockchainHealth(),
            20000, // 20 seconds
            15000  // 15 second timeout
        );
    }
    
    /**
     * Initialize component health states
     */
    private initializeComponentHealth(): void {
        const defaultHealth = this.createDefaultComponentHealth();
        
        this.componentHealth.set('dataStreams', defaultHealth);
        this.componentHealth.set('arbitrageEngine', defaultHealth);
        this.componentHealth.set('riskManager', defaultHealth);
        this.componentHealth.set('blockchain', defaultHealth);
    }
    
    /**
     * Create default component health
     */
    private createDefaultComponentHealth(): ComponentHealth {
        return {
            status: 'healthy',
            lastUpdate: Date.now(),
            errorCount: 0,
            latency: 0,
            message: 'Initializing...'
        };
    }
    
    /**
     * Perform all health checks
     */
    private async performHealthChecks(): Promise<void> {
        if (!this.isMonitoring) return;
        
        try {
            const healthCheckPromises = Array.from(this.healthChecks.entries()).map(
                ([name, healthCheck]) => this.executeHealthCheck(name, healthCheck)
            );
            
            await Promise.allSettled(healthCheckPromises);
            
            // Emit overall health status
            const overallHealth = this.getHealthStatus();
            this.emit('healthCheck', overallHealth);
            
            // Log health summary
            this.logHealthSummary(overallHealth);
            
        } catch (error) {
            this.logger.error('Error performing health checks:', error);
        }
    }
    
    /**
     * Execute individual health check
     */
    private async executeHealthCheck(name: string, healthCheck: HealthCheck): Promise<void> {
        try {
            const startTime = Date.now();
            
            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Health check timeout: ${name}`)), healthCheck.timeout);
            });
            
            // Execute health check with timeout
            const healthResult = await Promise.race([
                healthCheck.check(),
                timeoutPromise
            ]);
            
            const latency = Date.now() - startTime;
            
            // Update health result with latency
            const updatedHealth: ComponentHealth = {
                ...healthResult,
                lastUpdate: Date.now(),
                latency
            };
            
            this.reportComponentHealth(name, updatedHealth);
            
        } catch (error) {
            this.logger.error(`Health check failed for ${name}:`, error);
            
            const currentHealth = this.componentHealth.get(name);
            const errorCount = (currentHealth?.errorCount || 0) + 1;
            
            const failedHealth: ComponentHealth = {
                status: errorCount > 3 ? 'unhealthy' : 'degraded',
                lastUpdate: Date.now(),
                errorCount,
                latency: -1,
                message: (error as Error).message || 'Health check failed'
            };
            
            this.reportComponentHealth(name, failedHealth);
        }
    }
    
    /**
     * Check data streams health
     */
    private async checkDataStreamsHealth(): Promise<ComponentHealth> {
        try {
            // This would check connection status of data streams
            // For now, we'll simulate the check
            
            const connections = {
                quickswap: true, // This would come from DataStreamManager
                standardclob: true,
                priceFeeds: true
            };
            
            const connectedCount = Object.values(connections).filter(Boolean).length;
            const totalCount = Object.keys(connections).length;
            
            if (connectedCount === totalCount) {
                return {
                    status: 'healthy',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: 50, // Simulated latency
                    message: 'All data streams connected'
                };
            } else if (connectedCount > 0) {
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: totalCount - connectedCount,
                    latency: 150,
                    message: `${connectedCount}/${totalCount} data streams connected`
                };
            } else {
                return {
                    status: 'unhealthy',
                    lastUpdate: Date.now(),
                    errorCount: totalCount,
                    latency: -1,
                    message: 'No data streams connected'
                };
            }
            
        } catch (error) {
            return {
                status: 'unhealthy',
                lastUpdate: Date.now(),
                errorCount: 1,
                latency: -1,
                message: `Data streams check failed: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Check arbitrage engine health
     */
    private async checkArbitrageEngineHealth(): Promise<ComponentHealth> {
        try {
            // Check if arbitrage engine is responsive and functioning
            // This would check execution metrics, memory usage, etc.
            
            const metrics = {
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                responseTime: Math.random() * 100, // Simulated response time
                isExecutionPaused: false // This would come from ArbitrageEngine
            };
            
            if (metrics.isExecutionPaused) {
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: metrics.responseTime,
                    message: 'Arbitrage execution is paused'
                };
            }
            
            if (metrics.memoryUsage > 500) { // 500MB threshold
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: metrics.responseTime,
                    message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`
                };
            }
            
            if (metrics.responseTime > 1000) { // 1 second threshold
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: metrics.responseTime,
                    message: `High response time: ${metrics.responseTime.toFixed(0)}ms`
                };
            }
            
            return {
                status: 'healthy',
                lastUpdate: Date.now(),
                errorCount: 0,
                latency: metrics.responseTime,
                message: 'Arbitrage engine functioning normally'
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                lastUpdate: Date.now(),
                errorCount: 1,
                latency: -1,
                message: `Arbitrage engine check failed: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Check risk manager health
     */
    private async checkRiskManagerHealth(): Promise<ComponentHealth> {
        try {
            // Check risk manager functionality
            // This would verify risk calculations, thresholds, etc.
            
            const riskStatus = {
                emergencyStopActive: false, // This would come from RiskManager
                riskScore: 0.2, // This would come from RiskManager
                lastRiskAssessment: Date.now() - 5000 // 5 seconds ago
            };
            
            if (riskStatus.emergencyStopActive) {
                return {
                    status: 'unhealthy',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: 0,
                    message: 'Emergency stop is active'
                };
            }
            
            if (Date.now() - riskStatus.lastRiskAssessment > 60000) { // 1 minute
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: 0,
                    message: 'Risk assessments are stale'
                };
            }
            
            if (riskStatus.riskScore > 0.8) {
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency: 0,
                    message: `High risk score: ${riskStatus.riskScore.toFixed(2)}`
                };
            }
            
            return {
                status: 'healthy',
                lastUpdate: Date.now(),
                errorCount: 0,
                latency: 10, // Risk calculations are fast
                message: 'Risk manager functioning normally'
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                lastUpdate: Date.now(),
                errorCount: 1,
                latency: -1,
                message: `Risk manager check failed: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Check blockchain health
     */
    private async checkBlockchainHealth(): Promise<ComponentHealth> {
        try {
            const startTime = Date.now();
            
            // This would check blockchain connectivity
            // For now, we'll simulate a blockchain health check
            
            // Simulate network call latency
            await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
            
            const latency = Date.now() - startTime;
            const blockNumber = 12345678; // This would come from provider.getBlockNumber()
            const gasPrice = 25; // This would come from provider.getGasPrice()
            
            if (latency > 5000) { // 5 second threshold
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency,
                    message: `Slow blockchain response: ${latency}ms`
                };
            }
            
            if (gasPrice > 100) { // 100 gwei threshold
                return {
                    status: 'degraded',
                    lastUpdate: Date.now(),
                    errorCount: 0,
                    latency,
                    message: `High gas prices: ${gasPrice} gwei`
                };
            }
            
            return {
                status: 'healthy',
                lastUpdate: Date.now(),
                errorCount: 0,
                latency,
                message: `Connected to block ${blockNumber}`
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                lastUpdate: Date.now(),
                errorCount: 1,
                latency: -1,
                message: `Blockchain connectivity failed: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Log health summary
     */
    private logHealthSummary(health: HealthStatus): void {
        if (health.healthy) {
            this.logger.debug('System health: All components healthy');
        } else {
            const unhealthyComponents = Object.entries(health.components)
                .filter(([_, component]) => component.status !== 'healthy')
                .map(([name, component]) => `${name}: ${component.status}`);
            
            this.logger.warn('System health issues detected:', {
                issues: health.issues,
                unhealthyComponents
            });
        }
    }
    
    /**
     * Get component health by name
     */
    getComponentHealth(componentName: string): ComponentHealth | undefined {
        return this.componentHealth.get(componentName);
    }
    
    /**
     * Get system uptime
     */
    getUptime(): number {
        return Date.now() - this.startTime;
    }
    
    /**
     * Reset component error counts
     */
    resetComponentErrors(componentName?: string): void {
        if (componentName) {
            const health = this.componentHealth.get(componentName);
            if (health) {
                health.errorCount = 0;
                if (health.status === 'degraded') {
                    health.status = 'healthy';
                    health.message = 'Component recovered';
                }
                this.componentHealth.set(componentName, health);
                this.logger.info(`Reset errors for component: ${componentName}`);
            }
        } else {
            // Reset all component errors
            this.componentHealth.forEach((health, name) => {
                health.errorCount = 0;
                if (health.status === 'degraded') {
                    health.status = 'healthy';
                    health.message = 'Component recovered';
                }
                this.componentHealth.set(name, health);
            });
            this.logger.info('Reset errors for all components');
        }
    }
}