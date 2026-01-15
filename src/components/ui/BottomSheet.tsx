/**
 * BottomSheet Component
 * UI Constitution V1 - Overlay Component
 * 
 * Mobile primary overlay pattern with optional drag handle.
 * Escape closes.
 * 
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Actions"
 *   dragHandle
 * >
 *   <Button>Action 1</Button>
 * </BottomSheet>
 * ```
 */

'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { IconButton } from './IconButton';
import { cn } from './utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: string;
  dragHandle?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  dragHandle = false,
  className,
  'data-testid': testId,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="bottom-sheet-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Phase 8: Softer backdrop
          zIndex: tokens.z.layer.overlay,
          transition: `opacity ${tokens.motion.duration.fast} ${tokens.motion.easing.decelerated}`, // Phase 8: Smooth fade
          opacity: isOpen ? 1 : 0,
        }}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        data-testid={testId || 'bottom-sheet'}
        className={cn('bottom-sheet', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        tabIndex={-1}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '90vh',
          backgroundColor: tokens.colors.surface.overlay, // Phase 8: Use overlay surface
          borderTopLeftRadius: tokens.radius['2xl'], // Phase 8: Larger radius for modern feel
          borderTopRightRadius: tokens.radius['2xl'],
          boxShadow: tokens.shadow.xl, // Phase 8: Stronger shadow
          zIndex: tokens.z.layer.modal,
          display: 'flex',
          flexDirection: 'column',
          transition: `transform ${tokens.motion.duration.normal} ${tokens.motion.easing.standard}`, // Phase 8: Refined motion
          overflow: 'hidden',
        }}
      >
        {/* Drag Handle */}
        {dragHandle && (
          <div
            style={{
              paddingTop: tokens.spacing[3],
              display: 'flex',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: tokens.colors.border.default,
                borderRadius: tokens.radius.full,
              }}
            />
          </div>
        )}
        
        {/* Header */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: tokens.spacing[6], // Phase 8: Increased padding
              borderBottom: `1px solid ${tokens.colors.border.default}`,
              flexShrink: 0,
            }}
          >
            <h2
              id="bottom-sheet-title"
              style={{
                fontSize: tokens.typography.fontSize.xl[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <IconButton
              icon={<i className="fas fa-times" />}
              variant="ghost"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
        )}
        
        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: tokens.spacing[4],
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
