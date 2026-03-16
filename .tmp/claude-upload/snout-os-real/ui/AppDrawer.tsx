/**
 * AppDrawer — Detail view drawer with Framer Motion
 * Drop into: src/components/app/AppDrawer.tsx
 *
 * Closes UI_DONE_CHECKLIST:
 * - [x] AppDrawer used for detail views
 * - [x] Framer Motion open/close transitions
 * - [x] data-density affects drawer padding
 * - [x] Dark mode: drawer background, borders
 */

'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/utils';

export interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

export const AppDrawer: React.FC<AppDrawerProps> = ({
  isOpen, onClose, title, subtitle, children, footer, width = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-layer-overlay flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'relative flex h-full w-full flex-col border-l border-border-default bg-surface-overlay shadow-xl',
              widthMap[width]
            )}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between border-b border-border-default px-[var(--density-padding)] py-[var(--density-padding)]">
                <div>
                  {title && <h3 className="text-base font-semibold text-text-primary">{title}</h3>}
                  {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                  aria-label="Close"
                >
                  <i className="fas fa-times text-xs" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-[var(--density-padding)] py-[var(--density-padding)]">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-border-default bg-surface-secondary px-[var(--density-padding)] py-3 flex justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
