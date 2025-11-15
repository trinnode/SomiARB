'use client';

import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { usePathname } from 'next/navigation';
import { Sidebar, TopNavigation } from '../dashboard/Navigation';
import { Scene3DBackground } from '../background/Scene3DBackground';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NotificationProvider } from '../ui/Notification';
import { useAgentConnection } from '../../stores/agentStore';
import { useGlobalLoading, useLoadingMessage } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { somniaMainnet, somniaTestnet } from '../../lib/wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface AppLayoutProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ['/', '/landing'];
const SUPPORTED_CHAIN_IDS: number[] = [somniaMainnet.id, somniaTestnet.id];

const networkNameMap: Record<number, string> = {
  [somniaMainnet.id]: 'Somnia Mainnet',
  [somniaTestnet.id]: 'Somnia Testnet',
};

const GlobalLoadingOverlay: React.FC<{ message?: string }> = ({ message }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl">
    <div className="w-12 h-12 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-slate-200 text-sm uppercase tracking-[0.3em]">Calibrating</p>
    {message && <p className="text-slate-400 text-sm mt-2">{message}</p>}
  </div>
);

const StatusStrip: React.FC<{ items: Array<{ label: string; value: string; variant: 'success' | 'warning' | 'error' | 'secondary' | 'default'; }> }> = ({ items }) => (
  <div className="w-full border-b border-slate-800 bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur px-4 py-2 lg:px-8 flex flex-wrap gap-2">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-2 text-xs text-slate-300">
        <span className="uppercase tracking-tight text-[10px] text-slate-500">{item.label}</span>
        <Badge variant={item.variant} size="sm" animated={false}>{item.value}</Badge>
      </div>
    ))}
  </div>
);

const GatePanel: React.FC<{ title: string; description: string; action?: React.ReactNode; }> = ({ title, description, action }) => (
  <div className="flex flex-1 flex-col items-center justify-center text-center px-6 py-16">
    <div className="max-w-xl space-y-6">
      <div className="inline-flex items-center rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 uppercase tracking-[0.3em]">
        Access Required
      </div>
      <h2 className="text-3xl font-semibold text-white">{title}</h2>
      <p className="text-slate-400 text-base leading-relaxed">{description}</p>
      {action}
    </div>
  </div>
);

const ConnectCTA: React.FC = () => (
  <ConnectButton.Custom>
    {({ openConnectModal, mounted }) => (
      <Button
        size="lg"
        variant="glow"
        className="px-10"
        onClick={openConnectModal}
        disabled={!mounted}
      >
        Connect Wallet
      </Button>
    )}
  </ConnectButton.Custom>
);

const NetworkCTA: React.FC = () => (
  <ConnectButton.Custom>
    {({ openChainModal, mounted }) => (
      <Button
        size="lg"
        variant="outline"
        className="px-10"
        onClick={openChainModal}
        disabled={!mounted}
      >
        Switch Network
      </Button>
    )}
  </ConnectButton.Custom>
);

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isConnected, chainId, status } = useAccount();
  const pathname = usePathname();
  const { status: agentStatus } = useAgentConnection();
  const globalLoading = useGlobalLoading();
  const loadingMessage = useLoadingMessage();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const requiresWallet = !isPublicRoute;
  const isSupportedNetwork = chainId ? SUPPORTED_CHAIN_IDS.includes(chainId) : false;
  const canRenderProtectedContent = !requiresWallet || (isConnected && isSupportedNetwork);

  const statusStripItems = useMemo(() => {
    const walletItem = isConnected
      ? { label: 'Wallet', value: 'Connected', variant: 'success' as const }
      : status === 'connecting'
        ? { label: 'Wallet', value: 'Connecting...', variant: 'warning' as const }
        : { label: 'Wallet', value: 'Disconnected', variant: 'error' as const };

    const networkItem = !isConnected
      ? { label: 'Network', value: 'Awaiting wallet', variant: 'secondary' as const }
      : isSupportedNetwork && chainId
        ? { label: 'Network', value: networkNameMap[chainId] || 'Somnia', variant: 'success' as const }
        : { label: 'Network', value: 'Unsupported', variant: 'warning' as const };

    const agentItem = (() => {
      if (agentStatus === 'connected') return { label: 'Agent', value: 'Online', variant: 'success' as const };
      if (agentStatus === 'connecting') return { label: 'Agent', value: 'Syncing', variant: 'warning' as const };
      if (agentStatus === 'error') return { label: 'Agent', value: 'Error', variant: 'error' as const };
      return { label: 'Agent', value: 'Offline', variant: 'secondary' as const };
    })();

    return [walletItem, networkItem, agentItem];
  }, [agentStatus, chainId, isConnected, isSupportedNetwork, status]);

  const gateContent = useMemo(() => {
    if (!requiresWallet) return null;
    if (!isConnected) {
      return (
        <GatePanel
          title="Connect your wallet"
          description="Protected areas of SomiARB require a connected wallet to personalize data and unlock execution controls."
          action={<ConnectCTA />}
        />
      );
    }
    if (!isSupportedNetwork) {
      return (
        <GatePanel
          title="Switch to Somnia"
          description="This workspace is deployed on Somnia networks. Please switch to Somnia Mainnet or Somnia Testnet to continue."
          action={<NetworkCTA />}
        />
      );
    }
    return null;
  }, [isConnected, isSupportedNetwork, requiresWallet]);

  const shouldShowChrome = !isPublicRoute && canRenderProtectedContent;
  const mainClassName = cn(
    'flex-1 relative px-4 py-6 sm:px-6 lg:px-8',
    isPublicRoute && 'p-0'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <Scene3DBackground className="fixed inset-0" />
      <NotificationProvider />
      {globalLoading && <GlobalLoadingOverlay message={loadingMessage} />}

      <div className="relative z-10 flex min-h-screen">
        {shouldShowChrome && <Sidebar />}

        <div className={cn('flex-1 flex flex-col min-h-screen bg-slate-950/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg border-l border-slate-900/60')}>
          {shouldShowChrome && <TopNavigation currentPath={pathname} />}
          {!isPublicRoute && <StatusStrip items={statusStripItems} />}

          <main className={mainClassName}>
            {canRenderProtectedContent || isPublicRoute ? (
              children
            ) : (
              gateContent
            )}
          </main>
        </div>
      </div>

      <div className="fixed inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none z-20" />
      <div className="fixed inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/90 to-transparent pointer-events-none z-20" />
    </div>
  );
};