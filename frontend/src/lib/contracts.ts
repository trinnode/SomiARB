const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const env = (key: string, fallback = ZERO_ADDRESS) => process.env[key] || fallback;

export const SomiArbVaultABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'deposit',
    outputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' }
    ],
    name: 'withdraw',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' }
    ],
    name: 'totalDeposits',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' }
    ],
    name: 'getUserBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' }
    ],
    name: 'getUserShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' }
    ],
    name: 'getTotalValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' }
    ],
    name: 'supportedTokens',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

type NetworkContracts = {
  SomiArbVault: string;
  QuickSwapRouter: string;
  StandardCLOB: string;
  WETH: string;
  USDC: string;
  USDT: string;
  DAI: string;
  STT: string;
};

const makeNetwork = (overrides: Partial<NetworkContracts> = {}): NetworkContracts => ({
  SomiArbVault: ZERO_ADDRESS,
  QuickSwapRouter: ZERO_ADDRESS,
  StandardCLOB: ZERO_ADDRESS,
  WETH: ZERO_ADDRESS,
  USDC: ZERO_ADDRESS,
  USDT: ZERO_ADDRESS,
  DAI: ZERO_ADDRESS,
  STT: ZERO_ADDRESS,
  ...overrides,
});

export const CONTRACTS = {
  1: makeNetwork({
    QuickSwapRouter: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  }),
  137: makeNetwork({
    QuickSwapRouter: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
  }),
  42161: makeNetwork({
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
  }),
  11155111: makeNetwork({
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357'
  }),
  localhost: makeNetwork(),
  50312: makeNetwork({
    SomiArbVault: env('NEXT_PUBLIC_SOMNIA_VAULT_ADDRESS'),
    QuickSwapRouter: env('NEXT_PUBLIC_QUICKSWAP_ROUTER_ADDRESS'),
    StandardCLOB: env('NEXT_PUBLIC_STANDARD_CLOB_ADDRESS'),
    WETH: env('NEXT_PUBLIC_SOMNIA_WETH_ADDRESS', '0x4200000000000000000000000000000000000006'),
    USDC: env('NEXT_PUBLIC_SOMNIA_USDC_ADDRESS'),
    USDT: env('NEXT_PUBLIC_SOMNIA_USDT_ADDRESS'),
    DAI: env('NEXT_PUBLIC_SOMNIA_DAI_ADDRESS'),
    STT: env('NEXT_PUBLIC_SOMNIA_STT_ADDRESS')
  })
} as const;

export type ContractAddresses = typeof CONTRACTS;

export const getContractAddresses = (chainId: number) => {
  const byNumber = CONTRACTS as Record<number, NetworkContracts>;
  if (byNumber[chainId]) {
    return byNumber[chainId];
  }
  return CONTRACTS[50312] || CONTRACTS[1];
};
