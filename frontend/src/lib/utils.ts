import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEther(value: bigint, decimals: number = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === BigInt(0)) {
    return `${quotient.toString()} ETH`;
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  if (trimmedRemainder === '') {
    return `${quotient.toString()} ETH`;
  }
  
  return `${quotient.toString()}.${trimmedRemainder} ETH`;
}

export function parseEther(value: string): bigint {
  const [whole, decimal = ''] = value.replace(' ETH', '').split('.');
  const decimals = 18;
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * (BigInt(10) ** BigInt(decimals)) + BigInt(paddedDecimal);
}

// Percentage formatting
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// Time formatting utilities
export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function formatTimeRemaining(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) return 'Expired';
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    currency?: boolean;
    percentage?: boolean;
  } = {}
): string {
  const { decimals = 2, compact = false, currency = false, percentage = false } = options;
  
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  
  if (compact && Math.abs(value) >= 1000) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }
  
  if (currency) {
    formatOptions.style = 'currency';
    formatOptions.currency = 'USD';
  }
  
  if (percentage) {
    formatOptions.style = 'percent';
    value = value / 100;
  }
  
  return new Intl.NumberFormat('en-US', formatOptions).format(value);
}

export function formatTime(timestamp: number, format: 'relative' | 'absolute' = 'relative'): string {
  const date = new Date(timestamp);
  
  if (format === 'absolute') {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function calculateProfitPercentage(initial: number, current: number): number {
  if (initial === 0) return 0;
  return ((current - initial) / initial) * 100;
}

export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function generateGradient(color1: string, color2: string): string {
  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function getColorFromValue(
  value: number,
  min: number,
  max: number,
  colorScale: string[] = ['#ef4444', '#f97316', '#eab308', '#22c55e']
): string {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = Math.floor(normalized * (colorScale.length - 1));
  return colorScale[index];
}

export function generateRandomId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const NETWORK_CONFIGS = {
  somnia: {
    chainId: 50312,
    name: 'Somnia',
    rpcUrl: 'https://dream-rpc.somnia.network/',
    blockExplorer: 'https://explorer.somnia.network',
    nativeCurrency: {
      name: 'Somnia',
      symbol: 'STT',
      decimals: 18
    }
  },
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  }
} as const;

export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  },
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  },
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  }
};