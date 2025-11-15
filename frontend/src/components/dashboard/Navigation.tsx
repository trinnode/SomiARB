'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useSidebarOpen, useUIActions } from '../../stores/uiStore';
import { useAgentConnection } from '../../stores/agentStore';
import { useActiveRoute, useSetActiveRoute } from '../../stores/navigationStore';
import { cn } from '../../lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface SidebarProps {
  className?: string;
}

interface TopNavigationProps {
  className?: string;
  currentPath?: string | null;
}

export const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    href: '/dashboard',
    badge: null,
    description: 'Mission control for SomiARB performance',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    icon: '💡',
    href: '/opportunities',
    badge: 'live',
    description: 'Live spreads and profitability signals',
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: '💰',
    href: '/portfolio',
    badge: null,
    description: 'Vault balances, PnL and allocations',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📊',
    href: '/analytics',
    badge: null,
    description: 'Historical performance, metrics and research',
  },
  {
    id: 'history',
    label: 'History',
    icon: '📈',
    href: '/history',
    badge: null,
    description: 'Execution timeline and post-trade audits',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    href: '/settings',
    badge: null,
    description: 'Risk, automation and appearance controls',
  },
 ] as const;

type NavigationItem = (typeof NAVIGATION_ITEMS)[number];

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const sidebarOpen = useSidebarOpen();
  const { toggleSidebar } = useUIActions();
  const agentConnection = useAgentConnection();
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = useActiveRoute();
  const setActiveRoute = useSetActiveRoute();

  // Update active route based on current pathname
  useEffect(() => {
    const currentItem = NAVIGATION_ITEMS.find(item => item.href === pathname);
    if (currentItem) {
      setActiveRoute(pathname);
    }
  }, [pathname, setActiveRoute]);

  const handleNavigation = (item: NavigationItem) => {
    setActiveRoute(item.href);
    router.push(item.href);
    // Close sidebar on mobile after navigation
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile) {
      toggleSidebar();
    }
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
          />
          
          {/* Sidebar */}
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'fixed left-0 top-0 z-50 h-full w-72 bg-slate-900/95 backdrop-blur-md border-r border-slate-700 lg:relative lg:translate-x-0',
              className
            )}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">S</span>
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-white">SomiARB</h1>
                      <p className="text-xs text-slate-400">Arbitrage Bot</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="lg:hidden"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
                
                {/* Connection status */}
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50">
                  <div className={`w-2 h-2 rounded-full ${agentConnection.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm text-slate-300">
                    {agentConnection.isConnected ? 'Agent Connected' : 'Agent Offline'}
                  </span>
                </div>
              </div>
              
              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-2">
                {NAVIGATION_ITEMS.map((item) => {
                  const isActive = activeRoute === item.href || pathname === item.href;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigation(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200',
                        isActive
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-lg shadow-sky-500/10'
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:border-slate-600'
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant={item.badge === 'live' ? 'success' : 'default'}
                          size="sm"
                          pulse={item.badge === 'live'}
                          className="ml-auto"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </motion.button>
                  );
                })}
              </nav>
              
              {/* Footer */}
              <div className="p-4 border-t border-slate-700">
                <div className="text-xs text-slate-500 text-center">
                  <p>SomiARB v1.0.0</p>
                  <p>Powered by Somnia Network</p>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export const TopNavigation: React.FC<TopNavigationProps> = ({ className, currentPath }) => {
  const { toggleSidebar, openModal } = useUIActions();
  const agentConnection = useAgentConnection();
  const activeItem = NAVIGATION_ITEMS.find(item => item.href === currentPath);
  const title = activeItem?.label || 'Dashboard';
  const subtitle = activeItem?.description || 'Monitor your arbitrage opportunities';
  const lastHeartbeatLabel = agentConnection.lastHeartbeat
    ? new Date(agentConnection.lastHeartbeat).toLocaleTimeString()
    : 'Awaiting heartbeat';
  
  return (
    <header className={cn('bg-slate-900/95 backdrop-blur-md border-b border-slate-700 sticky top-0 z-30', className)}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
          
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${agentConnection.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-slate-300">
                {agentConnection.isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="text-slate-400">|</div>
            
            <div className="text-slate-300">
              Last update: {lastHeartbeatLabel}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* RainbowKit Connect Button */}
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />
            
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal('depositModal')}
              >
                Deposit
              </Button>
              
              <Button
                variant="glow"
                size="sm"
                onClick={() => openModal('withdrawModal')}
              >
                Withdraw
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openModal('settingsModal')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};