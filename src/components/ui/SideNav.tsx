/**
 * SideNav Component
 * UI Constitution V1 - Layout Primitive
 * 
 * Desktop fixed panel navigation. Mobile becomes Drawer trigger.
 * Supports collapsed mode and active route state.
 * 
 * @example
 * ```tsx
 * <SideNav
 *   items={[
 *     { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
 *     { label: 'Bookings', href: '/bookings', icon: <CalendarIcon /> },
 *   ]}
 *   activeRoute="/dashboard"
 *   collapsed={false}
 *   onCollapseToggle={() => {}}
 * />
 * ```
 */

'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { cn } from './utils';

export interface SideNavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface SideNavProps {
  items: SideNavItem[];
  activeRoute?: string;
  collapsed?: boolean;
  onCollapseToggle?: (collapsed: boolean) => void;
  mobileDrawerTrigger?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function SideNav({
  items,
  activeRoute,
  collapsed: controlledCollapsed,
  onCollapseToggle,
  mobileDrawerTrigger,
  className,
  'data-testid': testId,
}: SideNavProps) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = () => {
    const newCollapsed = !collapsed;
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapseToggle?.(newCollapsed);
  };

  // On mobile, render drawer trigger instead
  if (isMobile && mobileDrawerTrigger) {
    return <>{mobileDrawerTrigger}</>;
  }

  const width = collapsed
    ? tokens.layout.appShell.sidebarWidthCollapsed
    : tokens.layout.appShell.sidebarWidth;

  const isActive = (href: string) => {
    if (activeRoute) return activeRoute === href;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <nav
      data-testid={testId || 'side-nav'}
      className={cn('side-nav', className)}
      style={{
        width,
        minWidth: width,
        height: '100%',
        backgroundColor: tokens.colors.surface.primary,
        borderRight: `1px solid ${tokens.colors.border.default}`,
        display: 'flex',
        flexDirection: 'column',
        transition: `width ${tokens.motion.duration.normal} ${tokens.motion.easing.standard}`,
        flexShrink: 0,
      }}
      aria-label="Main navigation"
    >
      {/* Collapse Toggle */}
      <button
        onClick={handleToggle}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        style={{
          padding: tokens.spacing[2],
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.colors.text.secondary,
          transition: `color ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
          minHeight: '44px',
          minWidth: '44px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = tokens.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = tokens.colors.text.secondary;
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        <i className={`fas fa-${collapsed ? 'chevron-right' : 'chevron-left'}`} />
      </button>

      {/* Nav Items */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: tokens.spacing[2],
          gap: tokens.spacing[1],
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {items.map((item, index) => {
          const active = isActive(item.href);
          
          return (
            <Link
              key={index}
              href={item.disabled ? '#' : item.href}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[3],
                padding: tokens.spacing[3],
                borderRadius: tokens.radius.md,
                textDecoration: 'none',
                color: active
                  ? tokens.colors.text.primary
                  : tokens.colors.text.secondary,
                backgroundColor: active
                  ? tokens.colors.accent.primary
                  : 'transparent',
                fontWeight: active
                  ? tokens.typography.fontWeight.semibold
                  : tokens.typography.fontWeight.normal,
                fontSize: tokens.typography.fontSize.base[0],
                transition: `all ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
                minHeight: '44px',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!item.disabled && !active) {
                  e.currentTarget.style.backgroundColor = tokens.colors.accent.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = `2px solid ${tokens.colors.border.focus}`;
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              {item.icon && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: '20px',
                  }}
                >
                  {item.icon}
                </span>
              )}
              {!collapsed && (
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              )}
              {!collapsed && item.badge && (
                <span style={{ flexShrink: 0 }}>{item.badge}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
