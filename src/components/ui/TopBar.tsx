/**
 * TopBar Component
 * UI Constitution V1 - Layout Primitive
 * 
 * Fixed height navigation bar with title, breadcrumb, and action slots.
 * No sticky behavior - must be inside PageShell.
 * 
 * @example
 * ```tsx
 * <TopBar
 *   title="Dashboard"
 *   breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Dashboard' }]}
 *   leftActions={<Button>Back</Button>}
 *   rightActions={<Button>Settings</Button>}
 * />
 * ```
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { tokens } from '@/lib/design-tokens';
import { cn } from './utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TopBarProps {
  title?: string;
  breadcrumb?: BreadcrumbItem[];
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function TopBar({
  title,
  breadcrumb,
  leftActions,
  rightActions,
  className,
  'data-testid': testId,
}: TopBarProps) {
  return (
    <header
      data-testid={testId || 'top-bar'}
      className={cn('top-bar', className)}
      style={{
        height: tokens.layout.appShell.topBarHeight,
        minHeight: tokens.layout.appShell.topBarHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${tokens.spacing[4]}`,
        backgroundColor: tokens.colors.surface.primary,
        borderBottom: `1px solid ${tokens.colors.border.default}`,
        flexShrink: 0,
        width: '100%',
      }}
    >
      {/* Left Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing[4],
          flex: 1,
          minWidth: 0,
        }}
      >
        {leftActions && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            {leftActions}
          </div>
        )}
        
        {/* Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            {breadcrumb.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                      textDecoration: 'none',
                      transition: `color ${tokens.motion.duration.fast} ${tokens.motion.easing.standard}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = tokens.colors.text.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = tokens.colors.text.secondary;
                    }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.primary,
                      fontWeight: tokens.typography.fontWeight.semibold,
                    }}
                  >
                    {item.label}
                  </span>
                )}
                {index < breadcrumb.length - 1 && (
                  <span
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.tertiary,
                    }}
                  >
                    /
                  </span>
                )}
              </div>
            ))}
          </nav>
        )}
        
        {/* Title */}
        {title && !breadcrumb && (
          <h1
            style={{
              fontSize: tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              margin: 0,
            }}
          >
            {title}
          </h1>
        )}
      </div>
      
      {/* Right Section */}
      {rightActions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[2],
            flexShrink: 0,
          }}
        >
          {rightActions}
        </div>
      )}
    </header>
  );
}
