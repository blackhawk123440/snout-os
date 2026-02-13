/**
 * DropdownMenu Component
 * UI Constitution V1 - Control Component
 * 
 * Enterprise-style dropdown menu with grouped actions.
 * Matches Stripe / AWS / Twilio dashboard patterns.
 * 
 * @example
 * ```tsx
 * <DropdownMenu
 *   trigger={<IconButton icon={<i className="fas fa-ellipsis-v" />} />}
 * >
 *   <DropdownMenuGroup label="Actions">
 *     <DropdownMenuItem onClick={handleView}>View Details</DropdownMenuItem>
 *     <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
 *   </DropdownMenuGroup>
 *   <DropdownMenuSeparator />
 *   <DropdownMenuGroup label="Danger Zone">
 *     <DropdownMenuItem onClick={handleDelete} variant="danger">Delete</DropdownMenuItem>
 *   </DropdownMenuGroup>
 * </DropdownMenu>
 * ```
 */

'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { tokens } from '@/lib/design-tokens';
import { Tooltip } from './Tooltip';
import { cn } from './utils';

export interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  className?: string;
  'data-testid'?: string;
}

export interface DropdownMenuGroupProps {
  label?: string;
  children: ReactNode;
}

export interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tooltip?: string;
  variant?: 'default' | 'danger';
  icon?: ReactNode;
}

export interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  placement = 'bottom-end',
  className,
  'data-testid': testId,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    // Use requestAnimationFrame to ensure Portal element is in DOM
    const positionMenu = () => {
      if (!menuRef.current || !triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom-start':
          top = triggerRect.bottom + 8;
          left = triggerRect.left;
          break;
        case 'bottom-end':
          top = triggerRect.bottom + 8;
          left = triggerRect.right - menuRect.width;
          break;
        case 'top-start':
          top = triggerRect.top - menuRect.height - 8;
          left = triggerRect.left;
          break;
        case 'top-end':
          top = triggerRect.top - menuRect.height - 8;
          left = triggerRect.right - menuRect.width;
          break;
      }

      // Ensure menu stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + menuRect.width > viewportWidth) {
        left = viewportWidth - menuRect.width - 16;
      }
      if (left < 16) {
        left = 16;
      }

      if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height - 16;
      }
      if (top < 16) {
        top = 16;
      }

      if (menuRef.current) {
        menuRef.current.style.top = `${top}px`;
        menuRef.current.style.left = `${left}px`;
      }
    };

    // Position immediately and on window resize
    requestAnimationFrame(positionMenu);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true); // Capture scroll events in all containers

    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [isOpen, placement, mounted]);

  return (
    <div
      data-testid={testId || 'dropdown-menu'}
      className={cn('dropdown-menu', className)}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'inline-block' }}
      >
        {trigger}
      </div>

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            zIndex: tokens.z.dropdown,
            backgroundColor: tokens.colors.surface.overlay,
            border: `1px solid ${tokens.colors.border.default}`,
            borderRadius: tokens.radius.md,
            boxShadow: tokens.shadow.lg,
            minWidth: '200px',
            maxWidth: '320px',
            padding: tokens.spacing[1],
            marginTop: tokens.spacing[1],
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

export function DropdownMenuGroup({ label, children }: DropdownMenuGroupProps) {
  return (
    <div>
      {label && (
        <div
          style={{
            padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
            fontSize: tokens.typography.fontSize.xs[0],
            fontWeight: tokens.typography.fontWeight.semibold,
            color: tokens.colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled = false,
  tooltip,
  variant = 'default',
  icon,
}: DropdownMenuItemProps) {
  const item = (
    <div
      role="menuitem"
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing[2],
        padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
        fontSize: tokens.typography.fontSize.sm[0],
        color: disabled
          ? tokens.colors.text.disabled
          : variant === 'danger'
          ? tokens.colors.error.DEFAULT
          : tokens.colors.text.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderRadius: tokens.radius.sm,
        transition: `background-color ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {icon && (
        <span style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );

  if (disabled && tooltip) {
    return (
      <Tooltip content={tooltip} placement="right">
        {item}
      </Tooltip>
    );
  }

  return item;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div
      className={cn('dropdown-menu-separator', className)}
      style={{
        height: '1px',
        backgroundColor: tokens.colors.border.default,
        margin: `${tokens.spacing[2]} 0`,
      }}
    />
  );
}
