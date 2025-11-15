import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import winston from 'winston';
import WebSocket, { WebSocketServer } from 'ws';
import { SomiArbAgent } from '../SomiArbAgent.js';
import { ArbitrageEngine } from '../arbitrage/ArbitrageEngine.js';
import { DataStreamManager } from '../streams/DataStreamManager.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { HealthMonitor } from '../monitoring/HealthMonitor.js';
import { ConfigManager } from '../config/ConfigManager.js';
import {
    AgentCommand,
    AgentCommandResponse,
    AgentRealtimeEvent,
    AgentRealtimeInboundMessage,
    AgentStatusSnapshot,
    ArbitrageOpportunity,
    ExecutionResult,
    MarketEvent,
    SerializedArbitrageOpportunity,
    SerializedMarketEvent
} from '../types/index.js';

interface ClientContext {
    id: string;
    socket: WebSocket;
    connectedAt: number;
    lastHeartbeat: number;
    metadata?: Record<string, any>;
}

/**
 * Lightweight WebSocket server that streams agent telemetry to the frontend
 */
export class RealtimeServer {
    private server: WebSocketServer | null = null;
    private clients: Map<string, ClientContext> = new Map();
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private bridgesRegistered = false;

    constructor(
        private logger: winston.Logger,
        private config: ConfigManager,
        private agent: SomiArbAgent,
        private arbitrageEngine: ArbitrageEngine,
        private dataStreamManager: DataStreamManager,
        private metricsCollector: MetricsCollector,
        private healthMonitor: HealthMonitor
    ) {}

    async start(): Promise<void> {
        const realtimeConfig = this.config.getRealtimeConfig();
        if (!realtimeConfig.enabled) {
            this.logger.info('Realtime server disabled via configuration');
            return;
        }

        if (this.server) {
            this.logger.warn('Realtime server already running');
            return;
        }

        await this.registerEventBridges();

        this.server = new WebSocketServer({
            port: realtimeConfig.port,
            host: realtimeConfig.host
        });

        this.server.on('connection', (socket, request) => this.handleConnection(socket, request));
        this.server.on('listening', () => {
            this.logger.info(`Realtime server listening on ws://${realtimeConfig.host}:${realtimeConfig.port}`);
        });
        this.server.on('error', (error) => {
            this.logger.error('Realtime server error', error);
        });

        this.heartbeatTimer = setInterval(() => this.broadcastHeartbeat(), realtimeConfig.heartbeatInterval);
    }

    async stop(): Promise<void> {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.server) {
            for (const client of this.clients.values()) {
                client.socket.close(1001, 'Server shutting down');
            }
            this.server.close();
            this.server = null;
        }

        this.clients.clear();
        this.logger.info('Realtime server stopped');
    }

    private async registerEventBridges(): Promise<void> {
        if (this.bridgesRegistered) {
            return;
        }

        this.arbitrageEngine.on('opportunityFound', (opportunity: ArbitrageOpportunity) => {
            this.broadcast({
                type: 'agent:opportunity',
                payload: this.serializeOpportunity(opportunity)
            });
        });

        this.dataStreamManager.on('marketEvent', (event: MarketEvent) => {
            this.broadcast({
                type: 'agent:market-event',
                payload: this.serializeMarketEvent(event)
            });
        });

        this.agent.on('started', () => this.broadcastStatusSnapshot());
        this.agent.on('stopped', () => this.broadcastStatusSnapshot());
        this.agent.on('arbitrageSuccess', (result: ExecutionResult) => {
            this.broadcast({ type: 'agent:trade-success', payload: result });
        });
        this.agent.on('arbitrageFailed', (error: any) => {
            this.broadcast({
                type: 'agent:trade-failed',
                payload: {
                    error: error?.message || 'Unknown arbitration failure',
                    opportunityId: error?.opportunity?.id,
                    timestamp: Date.now()
                }
            });
        });

        this.metricsCollector.on('metricsUpdate', (metrics) => {
            this.broadcast({
                type: 'agent:metrics',
                payload: { ...metrics, timestamp: Date.now() }
            });
        });

        this.healthMonitor.on('healthCheck', (health) => {
            this.broadcast({ type: 'agent:health', payload: health });
        });

        this.bridgesRegistered = true;
    }

    private handleConnection(socket: WebSocket, request: IncomingMessage): void {
        const realtimeConfig = this.config.getRealtimeConfig();
        const clientId = randomUUID();
        const origin = request.headers.origin;

        if (!this.isOriginAllowed(origin)) {
            socket.close(4403, 'Origin not allowed');
            return;
        }

        if (!this.isAuthorized(request)) {
            socket.close(4401, 'Unauthorized');
            return;
        }

        this.clients.set(clientId, {
            id: clientId,
            socket,
            connectedAt: Date.now(),
            lastHeartbeat: Date.now(),
            metadata: {}
        });

        this.logger.info(`Realtime client connected (${clientId})`);

        socket.on('message', (raw) => this.handleMessage(clientId, raw.toString()))
            .on('close', () => this.cleanupClient(clientId))
            .on('error', (error) => {
                this.logger.error(`Realtime client error (${clientId})`, error);
                this.cleanupClient(clientId);
            });

        this.sendToClient(clientId, {
            type: 'agent:status',
            payload: this.createStatusSnapshot()
        });

        this.sendToClient(clientId, {
            type: 'agent:metrics',
            payload: { ...this.metricsCollector.getCurrentMetrics(), timestamp: Date.now() }
        });

        // Send initial heartbeat to confirm connection
        socket.send(this.stringifyMessage({
            type: 'agent:heartbeat',
            payload: { timestamp: Date.now(), uptime: this.metricsCollector.getUptime() }
        }));

        this.logger.debug(`Realtime client initialized (${clientId})`, {
            host: request.socket.remoteAddress,
            port: request.socket.remotePort
        });

        if (!realtimeConfig.enabled) {
            this.logger.warn('Realtime connection established while disabled');
        }
    }

    private handleMessage(clientId: string, rawMessage: string): void {
        let parsed: AgentRealtimeInboundMessage | null = null;
        try {
            parsed = JSON.parse(rawMessage);
        } catch (error) {
            this.logger.warn('Failed to parse realtime message', { error, rawMessage });
            return;
        }

        if (!parsed) return;

        switch (parsed.type) {
            case 'client:hello':
                this.updateClientMetadata(clientId, parsed.payload || {});
                break;
            case 'client:ping':
                this.sendToClient(clientId, {
                    type: 'agent:heartbeat',
                    payload: { timestamp: Date.now(), uptime: this.agent.getStatus().uptime }
                });
                break;
            case 'client:command':
                this.handleCommand(clientId, parsed.payload);
                break;
            default:
                this.logger.debug('Unhandled realtime message type');
        }
    }

    private async handleCommand(clientId: string, command: AgentCommand): Promise<void> {
        const response: AgentCommandResponse = {
            commandId: command.id,
            status: 'accepted',
            timestamp: Date.now()
        };

        try {
            switch (command.type) {
                case 'agent:status:get':
                    response.data = this.createStatusSnapshot();
                    break;
                case 'agent:start':
                    await this.agent.start();
                    response.message = 'Agent start triggered';
                    break;
                case 'agent:stop':
                    await this.agent.stop();
                    response.message = 'Agent stop triggered';
                    break;
                case 'agent:ping':
                    response.message = 'pong';
                    break;
                default:
                    response.status = 'error';
                    response.message = `Unsupported command: ${command.type}`;
            }
        } catch (error) {
            response.status = 'error';
            response.message = error instanceof Error ? error.message : 'Command failed';
        }

        this.sendToClient(clientId, { type: 'agent:command-response', payload: response });
    }

    private broadcast(event: AgentRealtimeEvent): void {
        const payload = this.stringifyMessage(event);
        for (const client of this.clients.values()) {
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.send(payload);
            }
        }
    }

    private sendToClient(clientId: string, event: AgentRealtimeEvent): void {
        const client = this.clients.get(clientId);
        if (!client || client.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        client.socket.send(this.stringifyMessage(event));
    }

    private broadcastHeartbeat(): void {
        if (this.clients.size === 0) {
            return;
        }

        const uptime = this.agent.getStatus().uptime;
        this.broadcast({
            type: 'agent:heartbeat',
            payload: { timestamp: Date.now(), uptime }
        });
    }

    private broadcastStatusSnapshot(): void {
        this.broadcast({
            type: 'agent:status',
            payload: this.createStatusSnapshot()
        });
    }

    private cleanupClient(clientId: string): void {
        if (this.clients.has(clientId)) {
            this.clients.delete(clientId);
            this.logger.info(`Realtime client disconnected (${clientId})`);
        }
    }

    private updateClientMetadata(clientId: string, metadata: Record<string, any>): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.metadata = { ...client.metadata, ...metadata };
            client.lastHeartbeat = Date.now();
        }
    }

    private createStatusSnapshot(): AgentStatusSnapshot {
        const status = this.agent.getStatus();
        return {
            isRunning: status.isRunning,
            uptime: status.uptime,
            environment: this.config.get('agent.environment'),
            version: this.config.get('agent.version'),
            timestamp: Date.now()
        };
    }

    private serializeOpportunity(opportunity: ArbitrageOpportunity): SerializedArbitrageOpportunity {
        return {
            ...opportunity,
            buyPrice: opportunity.buyPrice.toString(),
            sellPrice: opportunity.sellPrice.toString(),
            volume: opportunity.volume.toString()
        };
    }

    private serializeMarketEvent(event: MarketEvent): SerializedMarketEvent {
        return {
            ...event,
            price: event.price ? event.price.toString() : undefined,
            volume: event.volume ? event.volume.toString() : undefined,
            liquidity: event.liquidity ? event.liquidity.toString() : undefined
        };
    }

    private isOriginAllowed(origin?: string): boolean {
        const { allowedOrigins } = this.config.getRealtimeConfig();
        if (!origin || allowedOrigins.includes('*')) {
            return true;
        }
        return allowedOrigins.includes(origin);
    }

    private isAuthorized(request: IncomingMessage): boolean {
        const token = this.config.getRealtimeConfig().authToken;
        if (!token) {
            return true;
        }

        const url = new URL(request.url || '/', 'http://localhost');
        return url.searchParams.get('token') === token;
    }

    private stringifyMessage(event: AgentRealtimeEvent): string {
        return JSON.stringify(event, (_, value) => (typeof value === 'bigint' ? value.toString() : value));
    }
}
