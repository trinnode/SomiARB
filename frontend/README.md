# 🎨 SomiARB Frontend

The user-facing dashboard for the SomiARB arbitrage vault, built with Next.js and Somnia Data Streams for real-time updates.

## ✨ Features

- **Real-Time Portfolio Tracking**: Live balance updates using Somnia Data Streams
- **Multi-Token Support**: Switch between different vault assets (WETH, USDC, STT, etc.)
- **Seamless Deposits/Withdrawals**: One-click vault interactions with ERC20 approval handling
- **Live Arbitrage Activity**: Watch profits accumulate as the agent executes trades
- **Responsive Design**: Works perfectly on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm installed
- MetaMask with Somnia Testnet configured

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your contract addresses
# (Get these from the contracts deployment)
```

### Environment Variables

```bash
# Somnia testnet contract addresses
NEXT_PUBLIC_SOMNIA_VAULT_ADDRESS=0x...
NEXT_PUBLIC_QUICKSWAP_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_STANDARD_CLOB_ADDRESS=0x...

# Token addresses  
NEXT_PUBLIC_SOMNIA_WETH_ADDRESS=0x...
NEXT_PUBLIC_SOMNIA_USDC_ADDRESS=0x...
NEXT_PUBLIC_SOMNIA_STT_ADDRESS=0x...
NEXT_PUBLIC_SOMNIA_DAI_ADDRESS=0x...
NEXT_PUBLIC_SOMNIA_USDT_ADDRESS=0x...

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server  
pnpm start

# Lint code
pnpm lint
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🏗️ Architecture

### Key Components

**🎯 Portfolio Page** (`/src/app/portfolio`)
- Main dashboard showing wallet and vault balances
- Token selector for switching between different assets
- Quick deposit/withdraw actions
- Live profit tracking

**💰 Trading Components** (`/src/components/trading`)
- `DepositWithdrawModal`: Handles vault deposits and withdrawals
- ERC20 approval flow with transaction status
- Multi-token support with dynamic balance fetching

**🎮 Real-Time Hooks** (`/src/hooks`)
- `useSomiArbVault`: Main vault interaction hook
- `useContracts`: Contract address and ABI management
- `useWallet`: Wallet connection and network detection

### Data Flow

```
User Action → Wagmi Hook → Smart Contract → Blockchain Event → 
Somnia Data Streams → React State → UI Update
```

## 📱 Pages & Features

### Landing Page (`/`)
- Project introduction and call-to-action
- Connect wallet prompt
- Key feature highlights

### Portfolio Dashboard (`/portfolio`)
- **Asset Selector**: Choose which token to view/interact with
- **Balance Overview**: Wallet balance, vault balance, total protocol TVL
- **Performance Metrics**: 24h P&L, total returns, portfolio value
- **Quick Actions**: Deposit, withdraw, rebalance (coming soon)

### Live Analytics (`/analytics`)
- Real-time arbitrage activity feed
- Profit history charts
- Agent performance metrics

### Trading History (`/history`)
- Transaction history for deposits/withdrawals
- Arbitrage execution details
- Export functionality

## 🎨 Design System

Built with:
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **Radix UI**: Accessible component primitives
- **Custom Components**: Button, Card, Modal, Toast notifications

### Theme
- Dark mode by default
- Glassmorphism effects
- Blue/purple gradient accents
- Responsive breakpoints

## 🔌 Integrations

### Wallet Connection
- **RainbowKit**: Best-in-class wallet connection
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript Ethereum library

### Blockchain Interactions
- **Somnia Testnet**: Chain ID 50312
- **ERC20 Tokens**: WETH, USDC, STT, DAI, USDT
- **Smart Contracts**: Vault, QuickSwap Router, Standard CLOB

### Real-Time Data
- **Somnia Data Streams**: Live blockchain event streaming
- **WebSocket Connections**: Real-time agent communication
- **Automatic Refreshing**: Balance updates without manual refresh

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Connect your GitHub repo to Vercel
# Set the root directory to "frontend"
# Add environment variables in Vercel dashboard
# Deploy!
```

### Manual Deployment

```bash
# Build the application
pnpm build

# The output will be in .next/
# Deploy .next/ to your hosting provider
```

## 🧪 Testing

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## 📦 Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand for client state
- **Blockchain**: Wagmi + Viem + RainbowKit
- **Package Manager**: pnpm

## 🔧 Configuration

### Wagmi Setup (`/src/lib/wagmi.ts`)
- Somnia mainnet and testnet configuration
- RainbowKit wallet integration
- Custom chain definitions

### Contract Management (`/src/lib/contracts.ts`)
- ABI definitions for vault and token contracts
- Dynamic address resolution based on network
- Environment variable integration

## 🐛 Troubleshooting

### Common Issues

**"Network not supported"**
- Ensure MetaMask is configured for Somnia Testnet
- Check that chain ID is set to 50312
- Verify RPC URL: https://dream-rpc.somnia.network

**"Contract not found"**
- Verify all environment variables are set correctly
- Check that contracts are deployed to the correct network
- Use Somnia explorer to verify contract addresses

**"Transaction failing"**
- Ensure sufficient token balance for transactions
- Check that token approvals are properly set
- Verify gas settings for Somnia network

### Getting Help

- Check the console for detailed error messages
- Verify network connection in browser dev tools
- Test with small amounts first
- Join our Discord for support

## 📄 License

MIT License - see LICENSE file for details.

---

<p align="center">
  <strong>Part of the SomiARB ecosystem</strong><br>
  <em>Real-time DeFi arbitrage on Somnia</em>
</p>
