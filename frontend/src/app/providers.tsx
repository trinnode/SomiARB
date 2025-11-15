'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '../lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Custom RainbowKit theme with enhanced Sky Blue colors for better UX
const customTheme = darkTheme({
  accentColor: '#0ea5e9', // Sky blue
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Override additional theme properties for enhanced visual appeal
const somiArbTheme = {
  ...customTheme,
  colors: {
    ...customTheme.colors,
    accentColor: '#0ea5e9',
    accentColorForeground: '#ffffff',
    actionButtonBorder: 'rgba(14, 165, 233, 0.3)',
    actionButtonBorderMobile: 'rgba(14, 165, 233, 0.3)',
    actionButtonSecondaryBackground: 'rgba(14, 165, 233, 0.1)',
    closeButton: '#64748b',
    closeButtonBackground: 'rgba(14, 165, 233, 0.1)',
    connectButtonBackground: '#0ea5e9',
    connectButtonBackgroundError: '#dc2626',
    connectButtonInnerBackground: 'linear-gradient(0deg, rgba(14, 165, 233, 0.9), rgba(2, 132, 199, 1))',
    connectButtonText: '#ffffff',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#10b981',
    downloadBottomCardBackground: 'linear-gradient(126deg, rgba(14, 165, 233, 0.8) 9.49%, rgba(14, 165, 233, 0.6) 71.04%), #0f172a',
    downloadTopCardBackground: 'linear-gradient(126deg, rgba(14, 165, 233, 0.9) 9.49%, rgba(14, 165, 233, 0.7) 71.04%), #020617',
    error: '#dc2626',
    generalBorder: 'rgba(14, 165, 233, 0.2)',
    generalBorderDim: 'rgba(14, 165, 233, 0.1)',
    menuItemBackground: 'rgba(14, 165, 233, 0.1)',
    modalBackdrop: 'rgba(0, 0, 0, 0.9)',
    modalBackground: '#020617',
    modalBorder: 'rgba(14, 165, 233, 0.3)',
    modalText: '#f1f5f9',
    modalTextDim: '#94a3b8',
    modalTextSecondary: '#9ca3af',
    profileAction: 'rgba(30, 58, 138, 0.1)',
    profileActionHover: 'rgba(30, 58, 138, 0.2)',
    profileForeground: '#111827',
    selectedOptionBorder: '#1e3a8a',
    standby: '#f59e0b',
  },
  shadows: {
    ...customTheme.shadows,
    connectButton: '0 8px 32px rgba(30, 58, 138, 0.3)',
    dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
    profileDetailsAction: '0 4px 16px rgba(30, 58, 138, 0.2)',
    selectedOption: '0 8px 32px rgba(30, 58, 138, 0.4)',
    selectedWallet: '0 8px 32px rgba(30, 58, 138, 0.3)',
    walletLogo: '0 4px 16px rgba(30, 58, 138, 0.2)',
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={somiArbTheme}
          showRecentTransactions={true}
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}