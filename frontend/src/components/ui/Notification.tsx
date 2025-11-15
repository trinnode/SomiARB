'use client';

import React from 'react';
import { Toaster, toast, Toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// Custom toast component with futuristic styling
const CustomToast: React.FC<{ t: Toast; message: string; type?: 'success' | 'error' | 'loading' | 'info' }> = ({ 
  t, 
  message, 
  type = 'info' 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'loading':
        return (
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 shadow-green-500/25';
      case 'error':
        return 'border-red-500/50 shadow-red-500/25';
      case 'loading':
        return 'border-blue-500/50 shadow-blue-500/25';
      default:
        return 'border-blue-500/50 shadow-blue-500/25';
    }
  };

  return (
    <AnimatePresence>
      {t.visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md bg-slate-900/90 shadow-lg text-white min-w-[300px]',
            getColorClasses()
          )}
          onClick={() => toast.dismiss(t.id)}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          {/* Message */}
          <div className="flex-1 text-sm font-medium">
            {message}
          </div>
          
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Enhanced notification functions
export const notification = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) =>
    toast.custom((t) => <CustomToast t={t} message={message} type="success" />, options),

  error: (message: string, options?: Parameters<typeof toast.error>[1]) =>
    toast.custom((t) => <CustomToast t={t} message={message} type="error" />, options),

  loading: (message: string, options?: Parameters<typeof toast.loading>[1]) =>
    toast.custom((t) => <CustomToast t={t} message={message} type="loading" />, {
      duration: Infinity,
      ...options,
    }),

  info: (message: string, options?: Parameters<typeof toast>[1]) =>
    toast.custom((t) => <CustomToast t={t} message={message} type="info" />, options),

  dismiss: toast.dismiss,
  remove: toast.remove,

  // Transaction notifications
  transaction: {
    pending: (message: string = 'Transaction pending...') =>
      notification.loading(message),
    
    success: (message: string = 'Transaction successful!', txHash?: string) => {
      const displayMessage = txHash 
        ? `${message} (${txHash.slice(0, 8)}...${txHash.slice(-6)})`
        : message;
      return notification.success(displayMessage);
    },
    
    error: (message: string = 'Transaction failed') =>
      notification.error(message),
  },

  // Arbitrage notifications
  arbitrage: {
    opportunityFound: (profit: string) =>
      notification.success(`New opportunity found! Potential profit: ${profit}`),
    
    executionStarted: () =>
      notification.loading('Executing arbitrage...'),
    
    executionSuccess: (profit: string) =>
      notification.success(`Arbitrage successful! Profit: ${profit}`),
    
    executionFailed: (reason: string) =>
      notification.error(`Arbitrage failed: ${reason}`),
  },

  // Connection notifications
  connection: {
    connected: () =>
      notification.success('Connected to SomiARB Agent'),
    
    disconnected: () =>
      notification.error('Disconnected from SomiARB Agent'),
    
    reconnecting: () =>
      notification.loading('Reconnecting to agent...'),
  },
};

// Toaster component with custom styling
export const NotificationProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{
        top: 80,
        right: 20,
      }}
      toastOptions={{
        duration: 4000,
        className: 'custom-toast',
        style: {
          background: 'transparent',
          boxShadow: 'none',
        },
      }}
    />
  );
};