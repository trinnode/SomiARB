import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Somnia Mainnet
export const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://somnia-json-rpc.stakely.io'],
    },
  },
  blockExplorers: {
    default: { name: 'SomniaScan', url: 'https://explorer.somnia.network/' },
  },
  testnet: false,
});

// Define Somnia Testnet
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Somnia Testnet Explorer', url: 'https://shannon-explorer.somnia.network/' },
  },
  testnet: true,
});

// Define custom chains if needed
export const config = getDefaultConfig({
  appName: 'SomiARB - Advanced Arbitrage Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Get your project ID at https://cloud.walletconnect.com
  chains: [
    somniaMainnet,
    somniaTestnet,
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia, // For testing
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
});