import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { NotificationData } from '../types';

interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark';
  isDarkMode: boolean;
  accentColor: string;
  
  // Layout
  sidebarOpen: boolean;
  compactMode: boolean;
  
  // Notifications
  notifications: NotificationData[];
  maxNotifications: number;
  
  // Modals and dialogs
  modals: {
    depositModal: boolean;
    withdrawModal: boolean;
    settingsModal: boolean;
    aboutModal: boolean;
  };
  
  // Loading states
  globalLoading: boolean;
  loadingMessage: string;
  
  // 3D and animations
  enable3D: boolean;
  enableAnimations: boolean;
  particleIntensity: 'low' | 'medium' | 'high';
  
  // Trading interface
  tradingView: 'simple' | 'advanced';
  showAdvancedMetrics: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Sound effects
  soundEnabled: boolean;
  volume: number;
  
  // Actions
  actions: {
    // Theme
    setTheme: (theme: 'light' | 'dark') => void;
    toggleDarkMode: () => void;
    setAccentColor: (color: string) => void;
    
    // Layout
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    toggleCompactMode: () => void;
    
    // Notifications
    addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    
    // Modals
    openModal: (modal: keyof UIState['modals']) => void;
    closeModal: (modal: keyof UIState['modals']) => void;
    closeAllModals: () => void;
    
    // Loading
    setGlobalLoading: (loading: boolean, message?: string) => void;
    
    // 3D and animations
    toggle3D: () => void;
    toggleAnimations: () => void;
    setParticleIntensity: (intensity: 'low' | 'medium' | 'high') => void;
    
    // Trading
    setTradingView: (view: 'simple' | 'advanced') => void;
    toggleAdvancedMetrics: () => void;
    toggleAutoRefresh: () => void;
    setRefreshInterval: (interval: number) => void;
    
    // Sound
    toggleSound: () => void;
    setVolume: (volume: number) => void;
    
    // Reset
    resetToDefaults: () => void;
  };
}

const defaultState: Omit<UIState, 'actions'> = {
  theme: 'dark',
  isDarkMode: true,
  accentColor: '#1E40AF', // Navy Blue
  sidebarOpen: true,
  compactMode: false,
  notifications: [],
  maxNotifications: 10,
  modals: {
    depositModal: false,
    withdrawModal: false,
    settingsModal: false,
    aboutModal: false,
  },
  globalLoading: false,
  loadingMessage: '',
  enable3D: true,
  enableAnimations: true,
  particleIntensity: 'medium',
  tradingView: 'simple',
  showAdvancedMetrics: false,
  autoRefresh: true,
  refreshInterval: 5000,
  soundEnabled: true,
  volume: 0.5,
};

export const useUIStore = create<UIState>()(
  persist(
    immer((set, get) => ({
      ...defaultState,

      actions: {
        setTheme: (theme) => set((state) => {
          state.theme = theme;
          state.isDarkMode = theme === 'dark';
        }),

        toggleDarkMode: () => set((state) => {
          state.isDarkMode = !state.isDarkMode;
          state.theme = state.isDarkMode ? 'dark' : 'light';
        }),

        setAccentColor: (color) => set((state) => {
          state.accentColor = color;
        }),

        toggleSidebar: () => set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),

        setSidebarOpen: (open) => set((state) => {
          state.sidebarOpen = open;
        }),

        toggleCompactMode: () => set((state) => {
          state.compactMode = !state.compactMode;
        }),

        addNotification: (notification) => set((state) => {
          const newNotification: NotificationData = {
            ...notification,
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
          };
          
          state.notifications.unshift(newNotification);
          
          // Keep only max notifications
          if (state.notifications.length > state.maxNotifications) {
            state.notifications = state.notifications.slice(0, state.maxNotifications);
          }
          
          // Auto remove after duration
          if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
              const currentState = get();
              currentState.actions.removeNotification(newNotification.id);
            }, notification.duration);
          }
        }),

        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),

        clearNotifications: () => set((state) => {
          state.notifications = [];
        }),

        openModal: (modal) => set((state) => {
          state.modals[modal] = true;
        }),

        closeModal: (modal) => set((state) => {
          state.modals[modal] = false;
        }),

        closeAllModals: () => set((state) => {
          Object.keys(state.modals).forEach(key => {
            state.modals[key as keyof typeof state.modals] = false;
          });
        }),

        setGlobalLoading: (loading, message = '') => set((state) => {
          state.globalLoading = loading;
          state.loadingMessage = message;
        }),

        toggle3D: () => set((state) => {
          state.enable3D = !state.enable3D;
        }),

        toggleAnimations: () => set((state) => {
          state.enableAnimations = !state.enableAnimations;
        }),

        setParticleIntensity: (intensity) => set((state) => {
          state.particleIntensity = intensity;
        }),

        setTradingView: (view) => set((state) => {
          state.tradingView = view;
        }),

        toggleAdvancedMetrics: () => set((state) => {
          state.showAdvancedMetrics = !state.showAdvancedMetrics;
        }),

        toggleAutoRefresh: () => set((state) => {
          state.autoRefresh = !state.autoRefresh;
        }),

        setRefreshInterval: (interval) => set((state) => {
          state.refreshInterval = interval;
        }),

        toggleSound: () => set((state) => {
          state.soundEnabled = !state.soundEnabled;
        }),

        setVolume: (volume) => set((state) => {
          state.volume = Math.max(0, Math.min(1, volume));
        }),

        resetToDefaults: () => set((state) => {
          Object.assign(state, defaultState);
        }),
      },
    })),
    {
      name: 'somi-arb-ui-store',
      partialize: (state) => ({
        theme: state.theme,
        isDarkMode: state.isDarkMode,
        accentColor: state.accentColor,
        compactMode: state.compactMode,
        enable3D: state.enable3D,
        enableAnimations: state.enableAnimations,
        particleIntensity: state.particleIntensity,
        tradingView: state.tradingView,
        showAdvancedMetrics: state.showAdvancedMetrics,
        autoRefresh: state.autoRefresh,
        refreshInterval: state.refreshInterval,
        soundEnabled: state.soundEnabled,
        volume: state.volume,
      }),
    }
  )
);

// Selectors for performance
export const useTheme = () => useUIStore(state => state.theme);
export const useIsDarkMode = () => useUIStore(state => state.isDarkMode);
export const useAccentColor = () => useUIStore(state => state.accentColor);
export const useSidebarOpen = () => useUIStore(state => state.sidebarOpen);
export const useNotifications = () => useUIStore(state => state.notifications);
export const useModals = () => useUIStore(state => state.modals);
export const useGlobalLoading = () => useUIStore(state => state.globalLoading);
export const useLoadingMessage = () => useUIStore(state => state.loadingMessage);
export const use3DEnabled = () => useUIStore(state => state.enable3D);
export const useAnimationsEnabled = () => useUIStore(state => state.enableAnimations);
export const useTradingView = () => useUIStore(state => state.tradingView);
export const useUIActions = () => useUIStore(state => state.actions);

// Theme CSS variables updater
if (typeof window !== 'undefined') {
  useUIStore.subscribe((state) => {
    document.documentElement.style.setProperty('--accent-color', state.accentColor);
    document.documentElement.classList.toggle('dark', state.isDarkMode);
  });
}