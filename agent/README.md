# SomiArb Reactive Agent

A sophisticated reactive arbitrage trading agent built for the Somnia blockchain ecosystem. This agent monitors real-time market data from QuickSwap DEX and Standard CLOB to identify and execute profitable arbitrage opportunities automatically.

## 🚀 Overview

The SomiArb Agent is a comprehensive arbitrage trading system that:

- **Monitors Real-time Data**: Connects to QuickSwap and Standard CLOB data streams
- **Identifies Opportunities**: Uses advanced algorithms to detect profitable arbitrage opportunities
- **Manages Risk**: Implements comprehensive risk management and position limits
- **Executes Trades**: Automatically executes arbitrage trades with optimal gas and slippage management
- **Tracks Performance**: Provides detailed metrics and health monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Streams  │────│  SomiArb Agent   │────│ Risk Manager    │
│  QuickSwap DEX  │    │                  │    │                 │
│ Standard CLOB   │    │ ┌──────────────┐ │    │ Position Limits │
│   Price Feeds   │────│ │ Arbitrage    │ │────│ Drawdown Checks │
└─────────────────┘    │ │ Engine       │ │    │ Error Tracking  │
                       │ └──────────────┘ │    └─────────────────┘
┌─────────────────┐    │                  │    ┌─────────────────┐
│ Health Monitor  │────│ ┌──────────────┐ │────│ Metrics         │
│ Component Check │    │ │ Config       │ │    │ Collector       │
│ System Status   │    │ │ Manager      │ │    │ Performance     │
└─────────────────┘    │ └──────────────┘ │    │ Tracking        │
                       └──────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
agent/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── SomiArbAgent.ts            # Core agent orchestrator
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── config/
│   │   └── ConfigManager.ts       # Configuration management
│   ├── streams/
│   │   └── DataStreamManager.ts   # Real-time data handling
│   ├── arbitrage/
│   │   └── ArbitrageEngine.ts     # Opportunity detection & execution
│   ├── risk/
│   │   └── RiskManager.ts         # Risk management system
│   └── monitoring/
│       ├── MetricsCollector.ts    # Performance metrics
│       └── HealthMonitor.ts       # System health monitoring
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── .env.example                   # Environment template
└── README.md                      # This file
```

## 🛠️ Installation

1. **Install Dependencies**:
   ```bash
   cd agent
   pnpm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set Required Environment Variables**:
   ```bash
   # Essential configuration
   PRIVATE_KEY=your_private_key_without_0x
   WALLET_ADDRESS=0xYourWalletAddress
   VAULT_CONTRACT_ADDRESS=0xDeployedVaultAddress
   QUICKSWAP_ROUTER_ADDRESS=0xQuickSwapRouterAddress
   STANDARD_CLOB_ADDRESS=0xStandardCLOBAddress
   
   # API Keys (if required)
   QUICKSWAP_API_KEY=your_quickswap_api_key
   STANDARD_CLOB_API_KEY=your_standard_clob_api_key
   ```

## ⚙️ Configuration

### Core Settings

| Parameter | Description | Default |
|-----------|-------------|---------|
| `TRADING_ENABLED` | Enable/disable trading | `true` |
| `MAX_SLIPPAGE` | Maximum allowed slippage | `0.01` (1%) |
| `MIN_PROFIT_THRESHOLD` | Minimum profit threshold | `0.001` (0.1%) |
| `MAX_POSITION_SIZE` | Maximum position size in wei | `1000000000000000000` (1 ETH) |

### Risk Management

| Parameter | Description | Default |
|-----------|-------------|---------|
| `MAX_DRAWDOWN` | Maximum portfolio drawdown | `0.1` (10%) |
| `STOP_LOSS_THRESHOLD` | Stop loss trigger | `0.05` (5%) |
| `RISK_COOLDOWN_PERIOD` | Cooldown after risk event | `300` (5 min) |

### Monitoring

| Parameter | Description | Default |
|-----------|-------------|---------|
| `HEALTH_CHECK_INTERVAL` | Health check frequency | `10000` (10s) |
| `METRICS_INTERVAL` | Metrics collection interval | `60000` (1 min) |
| `ERROR_RATE_THRESHOLD` | Maximum error rate | `0.1` (10%) |

## 🚦 Usage

### Development Mode

```bash
# Start with debug logging
LOG_LEVEL=debug pnpm start

# Start with trading disabled (monitoring only)
TRADING_ENABLED=false pnpm start
```

### Production Mode

```bash
# Build the project
pnpm build

# Start in production mode
NODE_ENV=production pnpm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t somiarb-agent .

# Run container
docker run -d \
  --name somiarb-agent \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  somiarb-agent
```

## 📊 Monitoring

### Health Endpoints

The agent provides comprehensive monitoring:

```bash
# Check system status
kill -USR1 <pid>  # Displays current status

# Toggle log level
kill -USR2 <pid>  # Toggles between info/debug
```

### Metrics

The agent tracks:

- **Trading Metrics**: Success rate, profit/loss, gas usage
- **Performance Metrics**: Latency, throughput, error rates
- **Risk Metrics**: Exposure levels, drawdown, risk scores
- **System Metrics**: Uptime, memory usage, connection status

### Log Files

- `logs/somiarb-agent.log` - General application logs
- `logs/somiarb-errors.log` - Error logs only
- `logs/somiarb-access.log` - Access and trade logs

## 🔧 Components

### SomiArbAgent (Main Orchestrator)

The core component that coordinates all other systems:

```typescript
// Key responsibilities:
// - Event orchestration
// - Component lifecycle management
// - Graceful shutdown handling
// - Error recovery and retry logic
```

### DataStreamManager

Handles real-time market data:

```typescript
// Features:
// - WebSocket connections to exchanges
// - Automatic reconnection with exponential backoff
// - Data validation and normalization
// - Event emission for market changes
```

### ArbitrageEngine

Detects and executes opportunities:

```typescript
// Capabilities:
// - Multi-platform price comparison
// - Optimal volume calculation
// - Gas price optimization
// - Slippage protection
```

### RiskManager

Implements comprehensive risk controls:

```typescript
// Risk Controls:
// - Position size limits
// - Drawdown monitoring
// - Error rate tracking
// - Emergency stop mechanisms
```

### MetricsCollector & HealthMonitor

Provide observability:

```typescript
// Monitoring Features:
// - Real-time performance metrics
// - Component health checks
// - Alert generation
// - Historical data collection
```

## 🔐 Security

### Private Key Management

```bash
# Use environment variables (recommended)
PRIVATE_KEY=your_key_without_0x

# Or use encrypted keystore (advanced)
KEYSTORE_PATH=/path/to/keystore.json
KEYSTORE_PASSWORD=your_password
```

### API Security

```bash
# Rate limiting
MAX_REQUESTS_PER_MINUTE=100

# Connection timeouts
CONNECTION_TIMEOUT=10000
REQUEST_TIMEOUT=5000
```

## 📈 Performance Optimization

### Gas Optimization

```bash
# Dynamic gas pricing
MAX_GAS_PRICE=50000000000  # 50 gwei
GAS_PRICE_MULTIPLIER=1.1   # 10% above network

# Gas limits
DEFAULT_GAS_LIMIT=300000
MAX_GAS_LIMIT=500000
```

### Memory Management

```bash
# Node.js optimization
MAX_HEAP_SIZE=512mb
MAX_OLD_SPACE_SIZE=512
UV_THREADPOOL_SIZE=16
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failures**:
   ```bash
   # Check RPC endpoint
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     $RPC_URL
   ```

2. **High Gas Prices**:
   ```bash
   # Increase max gas price or wait for lower network activity
   MAX_GAS_PRICE=100000000000  # 100 gwei
   ```

3. **Insufficient Balance**:
   ```bash
   # Check wallet balance
   # Ensure sufficient ETH for gas + trading capital
   ```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=somiarb:*
LOG_LEVEL=debug
VERBOSE_LOGGING=true
```

## 📝 Development

### Adding New Features

1. **New Data Source**:
   - Extend `DataStreamManager`
   - Add subscription handlers
   - Update event types

2. **New Risk Controls**:
   - Extend `RiskManager`
   - Add assessment methods
   - Update risk metrics

3. **New Metrics**:
   - Extend `MetricsCollector`
   - Add collection methods
   - Update dashboard

### Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Integration tests
pnpm test:integration
```

## 📜 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review logs for error details
3. Open an issue with:
   - Environment details
   - Configuration (redacted)
   - Error logs
   - Steps to reproduce

## 🔮 Roadmap

- [ ] Machine learning price prediction
- [ ] Multi-chain arbitrage support
- [ ] Advanced MEV protection
- [ ] Liquidity provision integration
- [ ] Web-based monitoring dashboard
- [ ] API for external integrations

---

**⚠️ Disclaimer**: This software is for educational and research purposes. Trading cryptocurrencies involves risk. Always test thoroughly before deploying with real funds.