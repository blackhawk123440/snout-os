/**
 * Modal Component
 * 
 * Enterprise dialog/modal component with backdrop and close handling.
 * On mobile, renders as full-height bottom sheet.
 */

'use client';

import React, { useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
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

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
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
  const isMobile = useMobile();

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

  // Mobile: Full-height bottom sheet
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: tokens.zIndex.modal,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Backdrop */}
        <div
          onClick={closeOnBackdropClick ? onClose : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)', // Phase 8: Softer backdrop
            cursor: closeOnBackdropClick ? 'pointer' : 'default',
            transition: `opacity ${tokens.motion.duration.fast} ${tokens.motion.easing.decelerated}`, // Phase 8: Smooth fade
          }}
          aria-hidden="true"
        />

        {/* Bottom Sheet Content */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxHeight: '90vh',
            height: '90vh',
            backgroundColor: tokens.colors.background.primary,
            borderTopLeftRadius: tokens.borderRadius.xl,
            borderTopRightRadius: tokens.borderRadius.xl,
            boxShadow: tokens.shadows.xl,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginTop: 'auto',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Handle bar for mobile */}
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: tokens.colors.neutral[300],
              borderRadius: tokens.borderRadius.full,
              margin: `${tokens.spacing[2]} auto ${tokens.spacing[2]}`,
            }}
          />

          {/* Header */}
          {(title || closeOnBackdropClick) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${tokens.spacing[4]} ${tokens.spacing[4]}`,
                borderBottom: `1px solid ${tokens.colors.border.default}`,
                flexShrink: 0,
              }}
            >
              {title && (
                <h2
                  id="modal-title"
                  style={{
                    fontSize: tokens.typography.fontSize.xl[0],
                    fontWeight: tokens.typography.fontWeight.semibold,
                    color: tokens.colors.text.primary,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {closeOnBackdropClick && (
                <button
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2rem',
                    height: '2rem',
                    borderRadius: tokens.borderRadius.md,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                    transition: `all ${tokens.transitions.duration.DEFAULT}`,
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                    e.currentTarget.style.color = tokens.colors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = tokens.colors.text.secondary;
                  }}
                  aria-label="Close modal"
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
          )}

          {/* Body - Scrollable */}
          <div
            style={{
              flex: 1,
              padding: tokens.spacing[4],
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div
              style={{
                padding: tokens.spacing[4],
                borderTop: `1px solid ${tokens.colors.border.default}`,
                backgroundColor: tokens.colors.background.secondary,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: tokens.spacing[3],
                flexShrink: 0,
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Centered Modal
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: tokens.zIndex.modal,
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          cursor: closeOnBackdropClick ? 'pointer' : 'default',
        }}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={sizeStyles[size]}
        style={{
          position: 'relative',
          width: '100%',
          maxHeight: '90vh',
          backgroundColor: tokens.colors.background.primary,
          boxShadow: tokens.shadows.xl,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || closeOnBackdropClick) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: tokens.spacing[6],
              borderBottom: `1px solid ${tokens.colors.border.default}`,
            }}
          >
            {title && (
              <h2
                id="modal-title"
                style={{
                  fontSize: tokens.typography.fontSize.xl[0],
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.text.primary,
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
            {closeOnBackdropClick && (
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  borderRadius: tokens.borderRadius.md,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: tokens.colors.text.secondary,
                  cursor: 'pointer',
                  transition: `all ${tokens.transitions.duration.DEFAULT}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                  e.currentTarget.style.color = tokens.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = tokens.colors.text.secondary;
                }}
                aria-label="Close modal"
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: tokens.spacing[6],
            overflowY: 'auto',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: tokens.spacing[6],
              borderTop: `1px solid ${tokens.colors.border.default}`,
              backgroundColor: tokens.colors.background.secondary,
              display: 'flex',
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

