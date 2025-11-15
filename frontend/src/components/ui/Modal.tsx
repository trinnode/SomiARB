'use client';

import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ModalContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export interface ModalProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange,
  className 
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = onOpenChange || setUncontrolledOpen;

  return (
    <ModalContext.Provider value={{ isOpen, setIsOpen }}>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                className={cn(
                  'relative bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md max-w-lg w-full max-h-[90vh] overflow-hidden',
                  className
                )}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

export const ModalTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, onClick, ...props }, ref) => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('ModalTrigger must be used within a Modal');
  
  const { setIsOpen } = context;
  
  return (
    <button
      ref={ref}
      className={className}
      onClick={(e) => {
        setIsOpen(true);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});

ModalTrigger.displayName = 'ModalTrigger';

export const ModalContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6', className)}
    {...props}
  >
    {children}
  </div>
));

ModalContent.displayName = 'ModalContent';

export const ModalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-2 text-center sm:text-left mb-4', className)}
    {...props}
  >
    {children}
  </div>
));

ModalHeader.displayName = 'ModalHeader';

export const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold text-slate-100', className)}
    {...props}
  >
    {children}
  </h2>
));

ModalTitle.displayName = 'ModalTitle';

export const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-slate-400', className)}
    {...props}
  >
    {children}
  </p>
));

ModalDescription.displayName = 'ModalDescription';

export const ModalFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
    {...props}
  >
    {children}
  </div>
));

ModalFooter.displayName = 'ModalFooter';

export const ModalClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className, onClick, ...props }, ref) => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('ModalClose must be used within a Modal');
  
  const { setIsOpen } = context;
  
  return (
    <button
      ref={ref}
      className={cn(
        'absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors',
        className
      )}
      onClick={(e) => {
        setIsOpen(false);
        onClick?.(e);
      }}
      {...props}
    >
      {children || (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
    </button>
  );
});

ModalClose.displayName = 'ModalClose';