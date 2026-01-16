/**
 * TopBar Component
 * UI Constitution V1 - Layout Primitive
 * 
 * Fixed height navigation bar with title, breadcrumb, and action slots.
 * Includes hamburger menu button for navigation (matches AppShell behavior).
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

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import { cn } from './utils';
import { Drawer } from './Drawer';
import { navigation, type NavItem } from '@/lib/navigation';

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
      data-testid={testId || 'top-bar'}
      className={cn('top-bar', className)}
      style={{
        height: tokens.layout.appShell.topBarHeight,
        minHeight: tokens.layout.appShell.topBarHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${tokens.spacing[2]}`, // Phase B3: Tighter padding
        backgroundColor: 'transparent', // Phase B3: No background
        borderBottom: 'none', // Phase B3: No border, cleaner
        flexShrink: 0,
        width: '100%',
        marginBottom: tokens.spacing[2], // Phase B3: Small gap before content
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
          {/* Hamburger Menu Button - Always visible, matches AppShell */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.border.default}`,
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: tokens.colors.text.primary,
              transition: `background-color ${tokens.transitions.duration.DEFAULT}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`} />
          </button>

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
        
        {/* Title - Phase B3: Authoritative page title */}
        {title && !breadcrumb && (
          <h1
            style={{
              fontSize: tokens.typography.fontSize['2xl'][0], // Phase B3: Larger
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              margin: 0,
              letterSpacing: '-0.02em', // Phase B3: Tight tracking
              lineHeight: '1.2',
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

      {/* Navigation Drawer - Matches AppShell sidebar behavior */}
      <Drawer
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="left"
        width={tokens.layout.appShell.sidebarWidth}
      >
        {/* Logo/Brand - Matches AppShell */}
        <div
          style={{
            padding: tokens.spacing[6],
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
            height: tokens.layout.appShell.topBarHeight,
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              backgroundColor: tokens.colors.primary.DEFAULT,
              borderRadius: tokens.borderRadius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.colors.text.inverse,
              fontSize: tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.base[0],
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
              }}
            >
              Snout OS
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
              }}
            >
              Enterprise
            </div>
          </div>
        </div>

        {/* Navigation - Matches AppShell */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: tokens.spacing[2],
          }}
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[3],
                padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                marginBottom: tokens.spacing[1],
                borderRadius: tokens.borderRadius.md,
                textDecoration: 'none',
                color: isActive(item.href)
                  ? tokens.colors.primary.DEFAULT
                  : tokens.colors.text.primary,
                backgroundColor: isActive(item.href)
                  ? tokens.colors.primary[100]
                  : 'transparent',
                fontWeight: isActive(item.href)
                  ? tokens.typography.fontWeight.semibold
                  : tokens.typography.fontWeight.normal,
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.icon && (
                <i
                  className={item.icon}
                  style={{
                    width: '1.25rem',
                    textAlign: 'center',
                  }}
                />
              )}
              <span
                style={{
                  flex: 1,
                  fontSize: tokens.typography.fontSize.base[0],
                }}
              >
                {item.label}
              </span>
              {item.badge && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: tokens.colors.error.DEFAULT,
                    color: tokens.colors.text.inverse,
                    borderRadius: tokens.borderRadius.full,
                    padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                    fontSize: tokens.typography.fontSize.xs[0],
                    fontWeight: tokens.typography.fontWeight.semibold,
                    minWidth: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
