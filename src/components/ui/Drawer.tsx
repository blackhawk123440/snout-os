/**
 * Drawer Component
 * UI Constitution V1 - Overlay Component
 * 
 * Side drawer overlay with right and left placements.
 * Mobile default pattern for navigation.
 * 
 * @example
 * ```tsx
 * <Drawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   placement="left"
 *   title="Navigation"
 * >
 *   <SideNav items={items} />
 * </Drawer>
 * ```
 */

'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { IconButton } from './IconButton';
import { cn } from './utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: string;
  placement?: 'left' | 'right';
  width?: string;
  className?: string;
  'data-testid'?: string;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  placement = 'right',
  width,
  className,
  'data-testid': testId,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      drawerRef.current?.focus();
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

  const drawerWidth = width || tokens.layout.appShell.sidebarWidth;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        data-testid="drawer-backdrop"
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
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        data-testid={testId || 'drawer'}
        className={cn('drawer', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          [placement]: 0,
          bottom: 0,
          width: drawerWidth,
          maxWidth: '90vw',
          backgroundColor: tokens.colors.surface.primary,
          boxShadow: tokens.shadow.lg,
          zIndex: tokens.z.layer.modal,
          display: 'flex',
          flexDirection: 'column',
          transition: `transform ${tokens.motion.duration.normal} ${tokens.motion.easing.standard}`,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
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
              id="drawer-title"
              style={{
              fontSize: tokens.typography.fontSize['2xl'][0], // Phase 8: Larger heading
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              margin: 0,
              letterSpacing: tokens.typography.letterSpacing.tight, // Phase 8: Tighter tracking
              }}
            >
              {title}
            </h2>
            <IconButton
              icon={<i className="fas fa-times" />}
              variant="ghost"
              onClick={onClose}
              aria-label="Close drawer"
            />
          </div>
        )}
        
        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: tokens.spacing[6], // Phase 8: Increased padding
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
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
