'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  'relative rounded-xl border backdrop-blur-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-slate-900/80 border-slate-700 hover:border-slate-600',
        glass: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
        solid: 'bg-slate-800 border-slate-700 hover:border-slate-600',
        gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 hover:border-slate-500',
        glow: 'bg-slate-900/80 border-blue-500/50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
      },
      size: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      interactive: false,
    },
  }
);

// Exclude conflicting motion props from HTML div props
type CleanDivProps = Omit<React.HTMLAttributes<HTMLDivElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onTransitionEnd' |
  'onDragStart' | 'onDrag' | 'onDragEnd'>;

export interface CardProps
  extends CleanDivProps,
    VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  glow?: boolean;
  animated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    size, 
    interactive, 
    header, 
    footer, 
    glow = false,
    animated = true,
    children, 
    ...props 
  }, ref) => {
    // Props are already clean due to TypeScript interface

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            cardVariants({ variant, size, interactive }),
            glow && 'shadow-2xl shadow-blue-500/20',
            className
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          {...(interactive && {
            whileHover: { scale: 1.02, y: -4 },
            whileTap: { scale: 0.98 }
          })}
          {...props}
        >
          {/* Animated border glow */}
          {glow && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-sm -z-10" />
          )}
          
          {/* Header */}
          {header && (
            <div className="mb-4 pb-4 border-b border-slate-700">
              {header}
            </div>
          )}
          
          {/* Content */}
          <div className="relative z-10">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              {footer}
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, size, interactive }),
          glow && 'shadow-2xl shadow-blue-500/20',
          className
        )}
        {...props}
      >
        {/* Animated border glow */}
        {glow && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-sm -z-10" />
        )}
        
        {/* Header */}
        {header && (
          <div className="mb-4 pb-4 border-b border-slate-700">
            {header}
          </div>
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 mb-4', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-slate-100', className)}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-400', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-slate-200', className)}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 mt-4 border-t border-slate-700', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';