import winston from 'winston';
import chalk from 'chalk';
import { ConfigManager } from './config/ConfigManager.js';
import { SomiArbAgent } from './SomiArbAgent.js';
import { DataStreamManager } from './streams/DataStreamManager.js';
import { ArbitrageEngine } from './arbitrage/ArbitrageEngine.js';
import { RiskManager } from './risk/RiskManager.js';
import { MetricsCollector } from './monitoring/MetricsCollector.js';
import { HealthMonitor } from './monitoring/HealthMonitor.js';
import { RealtimeServer } from './realtime/RealtimeServer.js';

/**
 * SomiArb Reactive Agent - Main Entry Point
 * Real-time arbitrage trading agent for Somnia blockchain
 */

class SomiArbMain {
    private logger: winston.Logger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: 'logs/main.log' })
        ]
    });
    private config: ConfigManager;
    private agent: SomiArbAgent | null = null;
    private isShuttingDown: boolean = false;
    private realtimeServer: RealtimeServer | null = null;

    constructor() {
        this.setupLogger();
        this.setupGracefulShutdown();
        this.config = new ConfigManager();
    }

    async start(): Promise<void> {
        try {
            this.logger.info(chalk.cyan('🚀 Starting SomiArb Reactive Agent...'));
            this.logger.info(chalk.blue(`Environment: ${this.config.get('agent.environment')}`));
            this.logger.info(chalk.blue(`Version: ${this.config.get('agent.version')}`));

            // Initialize components
            this.logger.info('📋 Initializing components...');
            
            const dataStreamManager = new DataStreamManager(this.config, this.logger);
            const arbitrageEngine = new ArbitrageEngine(this.config, this.logger);
            const riskManager = new RiskManager(this.config, this.logger);
            const metricsCollector = new MetricsCollector(this.config, this.logger);
            const healthMonitor = new HealthMonitor(this.config, this.logger);

            // Create main agent
            this.agent = new SomiArbAgent(
                this.config,
                this.logger,
                dataStreamManager,
                arbitrageEngine,
                riskManager,
                metricsCollector,
                healthMonitor
            );

            // Initialize realtime server for UI bridge
            this.realtimeServer = new RealtimeServer(
                this.logger,
                this.config,
                this.agent,
                arbitrageEngine,
                dataStreamManager,
                metricsCollector,
                healthMonitor
            );

            // Setup agent event handlers
            this.setupAgentEventHandlers();

            // Start the agent
            this.logger.info('🎯 Starting reactive agent...');
            await this.realtimeServer.start();
            await this.agent.start();
            
            this.logger.info(chalk.green('✅ SomiArb Agent started successfully!'));
            this.logger.info(chalk.green('🎯 Agent is now monitoring for arbitrage opportunities...'));

            // Display system status
            this.displaySystemStatus();

        } catch (error) {
            this.logger.error(chalk.red('❌ Failed to start SomiArb Agent:'), error);
            process.exit(1);
        }
    }

    async stop(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        this.logger.info(chalk.yellow('🛑 Shutting down SomiArb Agent...'));

        try {
            if (this.agent) {
                await this.agent.stop();
            }
            if (this.realtimeServer) {
                await this.realtimeServer.stop();
            }
            
            this.logger.info(chalk.green('✅ SomiArb Agent shut down successfully'));
            process.exit(0);
        } catch (error) {
            this.logger.error(chalk.red('❌ Error during shutdown:'), error);
            process.exit(1);
        }
    }

    private setupLogger(): void {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ timestamp, level, message, ...meta }) => {
                            let logMessage = `${timestamp} [${level}]: ${message}`;
                            if (Object.keys(meta).length > 0) {
                                logMessage += ` ${JSON.stringify(meta)}`;
                            }
                            return logMessage;
                        })
                    )
                })
            ]
        });

        // Add file transports in production
        if (process.env.NODE_ENV === 'production') {
            this.logger.add(new winston.transports.File({
                filename: 'logs/somiarb-agent.log',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                tailable: true
            }));

            this.logger.add(new winston.transports.File({
                filename: 'logs/somiarb-errors.log',
                level: 'error',
                maxsize: 10 * 1024 * 1024,
                maxFiles: 5,
                tailable: true
            }));
        }
    }

    private setupAgentEventHandlers(): void {
        if (!this.agent) return;

        this.agent.on('started', () => {
            this.logger.info(chalk.green('🎉 Agent started and ready for trading'));
        });

        this.agent.on('stopped', () => {
            this.logger.info(chalk.yellow('⏹️ Agent stopped'));
        });

        this.agent.on('arbitrageSuccess', (result: any) => {
            this.logger.info(chalk.green('💰 Arbitrage executed successfully:'), {
                txHash: result.transactionHash,
                profit: result.actualProfit,
                gasUsed: result.gasUsed
            });
        });

        this.agent.on('arbitrageFailed', (error: any) => {
            this.logger.warn(chalk.red('❌ Arbitrage execution failed:'), error.message);
        });

        this.agent.on('emergencyStop', (emergency: any) => {
            this.logger.error(chalk.red('🚨 EMERGENCY STOP TRIGGERED:'), emergency.reason);
        });

        this.agent.on('reconnected', () => {
            this.logger.info(chalk.blue('🔄 Data streams reconnected'));
        });
    }

    private displaySystemStatus(): void {
        if (!this.agent) return;

        const status = this.agent.getStatus();
        
        console.log(chalk.cyan('\n📊 System Status:'));
        console.log(chalk.white('├─ Running:'), status.isRunning ? chalk.green('✓') : chalk.red('✗'));
        console.log(chalk.white('├─ Uptime:'), chalk.blue(`${Math.round(status.uptime / 1000)}s`));
        console.log(chalk.white('├─ Trading:'), this.config.isTradingEnabled() ? chalk.green('Enabled') : chalk.yellow('Disabled'));
        console.log(chalk.white('├─ Network:'), chalk.blue(this.config.get('blockchain.networkName')));
        console.log(chalk.white('└─ Chain ID:'), chalk.blue(this.config.get('blockchain.chainId')));

        // Display trading parameters
        console.log(chalk.cyan('\n⚙️ Trading Parameters:'));
        const tradingConfig = this.config.getTradingConfig();
        console.log(chalk.white('├─ Max Slippage:'), chalk.blue(`${(tradingConfig.maxSlippage * 100).toFixed(2)}%`));
        console.log(chalk.white('├─ Min Profit:'), chalk.blue(`${(tradingConfig.minProfitThreshold * 100).toFixed(3)}%`));
        console.log(chalk.white('├─ Max Position:'), chalk.blue(`${tradingConfig.maxPositionSize.toString()} wei`));
        console.log(chalk.white('└─ Risk Tolerance:'), chalk.blue(`${(tradingConfig.riskTolerance * 100).toFixed(1)}%`));

        console.log(chalk.cyan('\n🎯 Ready for arbitrage opportunities!\n'));
    }

    private setupGracefulShutdown(): void {
        process.on('SIGTERM', () => {
            this.logger.info('Received SIGTERM signal');
            this.stop();
        });

        process.on('SIGINT', () => {
            this.logger.info('Received SIGINT signal (Ctrl+C)');
            this.stop();
        });

        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception:', error);
            this.stop();
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
            this.stop();
        });

        // Handle additional signals
        process.on('SIGUSR1', () => {
            this.logger.info('Received SIGUSR1 - displaying status...');
            if (this.agent) {
                this.displaySystemStatus();
            }
        });

        process.on('SIGUSR2', () => {
            this.logger.info('Received SIGUSR2 - toggling log level...');
            const currentLevel = this.logger.level;
            this.logger.level = currentLevel === 'debug' ? 'info' : 'debug';
            this.logger.info(`Log level changed to: ${this.logger.level}`);
        });
    }
}

// Check if we're being imported as a module or run directly
if (require.main === module) {
    // Display banner
    console.log(chalk.cyan(`
    ███████╗ ██████╗ ███╗   ███╗██╗ █████╗ ██████╗ ██████╗ 
    ██╔════╝██╔═══██╗████╗ ████║██║██╔══██╗██╔══██╗██╔══██╗
    ███████╗██║   ██║██╔████╔██║██║███████║██████╔╝██████╔╝
    ╚════██║██║   ██║██║╚██╔╝██║██║██╔══██║██╔══██╗██╔══██╗
    ███████║╚██████╔╝██║ ╚═╝ ██║██║██║  ██║██║  ██║██████╔╝
    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
    
    🚀 Reactive Arbitrage Agent for Somnia Blockchain
    `));

    // Start the application
    const app = new SomiArbMain();
    app.start().catch(console.error);
}

export { SomiArbMain };