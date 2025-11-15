'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
        success: 'bg-green-500/20 text-green-200 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30',
        error: 'bg-red-500/20 text-red-200 border border-red-500/30',
        secondary: 'bg-slate-500/20 text-slate-200 border border-slate-500/30',
        outline: 'text-slate-300 border border-slate-600',
        glow: 'bg-blue-500/30 text-blue-100 border border-blue-400 shadow-lg shadow-blue-500/50',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLMotionProps<'div'>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  animated?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, pulse = false, animated = true, children, ...props }, ref) => {
    const content = children as React.ReactNode;
    const motionDefaults = animated
      ? {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.2 },
        }
      : {
          initial: false,
          animate: false,
        };

    return (
      <motion.div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          pulse && 'animate-pulse',
          className
        )}
        {...motionDefaults}
        {...props}
      >
        {content}
      </motion.div>
    );
  }
);

Badge.displayName = 'Badge';