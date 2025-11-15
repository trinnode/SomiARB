'use client';

import { create } from 'zustand';

interface NavigationState {
  activeRoute: string;
  setActiveRoute: (route: string) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeRoute: '/',
  setActiveRoute: (route: string) => set({ activeRoute: route }),
}));

export const useActiveRoute = () => useNavigationStore(state => state.activeRoute);
export const useSetActiveRoute = () => useNavigationStore(state => state.setActiveRoute);