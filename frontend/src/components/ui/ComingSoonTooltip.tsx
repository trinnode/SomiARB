'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComingSoonTooltipProps {
  children: React.ReactNode;
  message?: string;
  disabled?: boolean;
}

export const ComingSoonTooltip: React.FC<ComingSoonTooltipProps> = ({
  children,
  message = 'This feature is coming soon!',
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="opacity-60 cursor-not-allowed">
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="px-3 py-2 bg-amber-500 text-amber-950 text-sm font-medium rounded-lg shadow-lg whitespace-nowrap">
              {message}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};