'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'default' | 'lg';
  animated?: boolean;
  showPercentage?: boolean;
  label?: string;
}

const getVariantClasses = (variant: ProgressProps['variant']) => {
  switch (variant) {
    case 'success':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'gradient':
      return 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600';
    default:
      return 'bg-blue-500';
  }
};

const getSizeClasses = (size: ProgressProps['size']) => {
  switch (size) {
    case 'sm':
      return 'h-1';
    case 'lg':
      return 'h-3';
    default:
      return 'h-2';
  }
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    variant = 'default',
    size = 'default',
    animated = true,
    showPercentage = false,
    label,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const displayPercentage = Math.round(percentage);

    return (
      <div className="w-full space-y-2">
        {/* Label and percentage */}
        {(label || showPercentage) && (
          <div className="flex justify-between items-center text-sm text-slate-300">
            {label && <span>{label}</span>}
            {showPercentage && <span>{displayPercentage}%</span>}
          </div>
        )}
        
        {/* Progress bar container */}
        <div
          ref={ref}
          className={cn(
            'relative overflow-hidden rounded-full bg-slate-800 border border-slate-700',
            getSizeClasses(size),
            className
          )}
          {...props}
        >
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
          
          {/* Progress fill */}
          <motion.div
            className={cn(
              'h-full rounded-full transition-all duration-300 relative overflow-hidden',
              getVariantClasses(variant)
            )}
            initial={animated ? { width: 0 } : { width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Animated shimmer effect */}
            {animated && percentage > 0 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: 'easeInOut',
                }}
              />
            )}
          </motion.div>
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';