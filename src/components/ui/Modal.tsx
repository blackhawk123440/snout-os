/**
 * Modal Component - System DNA Implementation
 * 
 * Enterprise dialog/modal with overlay depth and temporal transitions.
 * Modals exist at the overlay layer with appropriate depth and motion.
 */

'use client';

import React, { useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { spatial } from '@/lib/spatial-hierarchy';
import { motion } from '@/lib/motion-system';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const getSizeMaxWidth = (size: string): string => {
  const sizes: Record<string, string> = {
    sm: '28rem', // 448px
    md: '32rem', // 512px
    lg: '42rem', // 672px
    xl: '56rem', // 896px
    full: 'calc(100% - 2rem)',
  };
  return sizes[size] || sizes.md;
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: tokens.zIndex.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing[4],
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeOnBackdropClick ? onClose : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          cursor: closeOnBackdropClick ? 'pointer' : 'default',
          ...motion.styles('transition', ['opacity']),
        }}
        aria-hidden="true"
      />

      {/* Modal Content - Overlay layer */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: getSizeMaxWidth(size),
          maxHeight: '90vh',
          backgroundColor: tokens.colors.white.material,
          ...spatial.getLayerStyles('overlay'),
          borderRadius: tokens.borderRadius.xl,
          display: 'flex',
          flexDirection: 'column',
          ...motion.styles('transition', ['transform', 'opacity']),
        }}
      >
        {title && (
          <div
            style={{
              padding: tokens.spacing[6],
              borderBottom: spatial.border('overlay', 'subtle'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2
              id="modal-title"
              style={{
                fontSize: tokens.typography.fontSize.xl[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close modal"
            >
              <i className="fas fa-times" />
            </Button>
          </div>
        )}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: tokens.spacing[6],
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: tokens.spacing[6],
              borderTop: spatial.border('overlay', 'subtle'),
              backgroundColor: tokens.colors.background.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: tokens.spacing[3],
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
