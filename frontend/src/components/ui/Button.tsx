'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg hover:shadow-blue-500/25',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-600 hover:border-slate-500',
        outline: 'border border-blue-500 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300',
        ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
        destructive: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-lg hover:shadow-red-500/25',
        success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-500 hover:to-green-600 shadow-lg hover:shadow-green-500/25',
        glow: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-500/75',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Exclude conflicting motion props from HTML button props
type CleanButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onTransitionEnd' | 
  'onDragStart' | 'onDrag' | 'onDragEnd'>;

export interface ButtonProps
  extends CleanButtonProps,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glowEffect?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false, 
    icon, 
    rightIcon, 
    glowEffect = false,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    // Props are already clean due to TypeScript interface

    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          glowEffect && 'animate-pulse',
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        {...props}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        
        {/* Content */}
        <div className="relative flex items-center gap-2">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {children && <span>Loading...</span>}
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                {icon && <span className="inline-flex">{icon}</span>}
                {children}
                {rightIcon && <span className="inline-flex">{rightIcon}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';