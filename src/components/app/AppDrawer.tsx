'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string | number;
  side?: 'left' | 'right';
}

export function AppDrawer({
  isOpen,
  onClose,
  title,
  children,
  width = '480px',
  side = 'right',
}: AppDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 bottom-0 z-50 flex flex-col bg-[var(--color-surface-overlay)] shadow-xl"
            style={{
              width: typeof width === 'number' ? `${width}px` : width,
              [side]: 0,
            }}
          >
            {title && (
              <div
                className="flex items-center justify-between border-b border-[var(--color-border-default)]"
                style={{ padding: 'var(--density-padding)' }}
              >
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-[var(--color-text-tertiary)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                  aria-label="Close"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--density-padding)' }}>
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
