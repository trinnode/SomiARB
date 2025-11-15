'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  'flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-900/80 border-slate-600 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500',
        ghost: 'bg-transparent border-slate-600 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:border-blue-500',
        glass: 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400 backdrop-blur-sm focus-visible:ring-blue-500 focus-visible:border-white/20',
        glow: 'bg-slate-900/80 border-blue-500/50 text-slate-100 placeholder:text-slate-400 shadow-lg shadow-blue-500/25 focus-visible:ring-blue-400 focus-visible:shadow-blue-500/40',
      },
      size: {
        sm: 'h-8 px-2 text-xs',
        default: 'h-10 px-3 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  animated?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    variant, 
    size,
    label,
    error,
    leftIcon,
    rightIcon,
    loading = false,
    animated = true,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    const InputComponent = animated ? motion.div : 'div';
    const motionProps = animated ? {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2 },
    } : {};

    return (
      <InputComponent {...motionProps} className="w-full">
        {/* Label */}
        {label && (
          <motion.label
            className={cn(
              'block text-sm font-medium mb-2 transition-colors',
              error ? 'text-red-400' : isFocused ? 'text-blue-400' : 'text-slate-300'
            )}
            animate={{ color: error ? '#f87171' : isFocused ? '#60a5fa' : '#cbd5e1' }}
          >
            {label}
          </motion.label>
        )}
        
        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          
          {/* Input field */}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size }),
              leftIcon && 'pl-10',
              (rightIcon || loading) && 'pr-10',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            ref={ref}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          
          {/* Right icon or loading spinner */}
          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                  />
                ) : rightIcon ? (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-slate-400"
                  >
                    {rightIcon}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )}
          
          {/* Focus ring animation */}
          {animated && isFocused && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-blue-500/50 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>
        
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="text-sm text-red-400 mt-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </InputComponent>
    );
  }
);

Input.displayName = 'Input';