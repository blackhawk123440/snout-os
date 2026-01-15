/**
 * AppShell Component
 * 
 * Enterprise application shell with sidebar navigation, top bar, and content container.
 * All dashboard pages must use this layout.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

const navigation: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'fas fa-tachometer-alt' },
  { label: 'Bookings', href: '/bookings', icon: 'fas fa-calendar-check' },
  { label: 'Calendar', href: '/calendar', icon: 'fas fa-calendar' },
  { label: 'Clients', href: '/clients', icon: 'fas fa-users' },
  { label: 'Sitters', href: '/bookings/sitters', icon: 'fas fa-user-friends' },
  { label: 'Automations', href: '/automation', icon: 'fas fa-robot' },
  { label: 'Payments', href: '/payments', icon: 'fas fa-credit-card' },
  { label: 'Payroll', href: '/payroll', icon: 'fas fa-money-bill-wave' },
  { label: 'Messages', href: '/messages', icon: 'fas fa-comments' },
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
];

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: tokens.colors.background.secondary,
        width: '100%',
      }}
    >
      {/* Blurred Backdrop - Only show when sidebar is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 1020, // Behind sidebar, above content
            pointerEvents: 'auto', // Clickable to close
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Always overlay, never pushes content */}
      <aside
        style={{
          position: 'fixed',
          left: sidebarOpen ? 0 : `-${tokens.layout.appShell.sidebarWidth}`,
          top: 0,
          bottom: 0,
          width: tokens.layout.appShell.sidebarWidth,
          backgroundColor: tokens.colors.background.primary,
          borderRight: `1px solid ${tokens.colors.border.default}`,
          zIndex: 1030, // Above backdrop (1020), below modals (1040+)
          display: 'flex',
          flexDirection: 'column',
          transition: `left ${tokens.transitions.duration.slow} ease-in-out`,
          boxShadow: sidebarOpen ? '2px 0 12px rgba(0, 0, 0, 0.15)' : 'none',
          pointerEvents: sidebarOpen ? 'auto' : 'none', // Only interactive when open
          overflowY: 'auto', // Allow scrolling if content is long
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            padding: tokens.spacing[6],
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing[3],
            height: tokens.layout.appShell.topBarHeight,
            backgroundColor: tokens.colors.background.primary,
          }}
        >
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              background: `linear-gradient(135deg, ${tokens.colors.primary.DEFAULT} 0%, ${tokens.colors.primary[700]} 100%)`,
              borderRadius: tokens.borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tokens.colors.text.inverse,
              fontSize: tokens.typography.fontSize.xl[0],
              fontWeight: tokens.typography.fontWeight.bold,
              boxShadow: tokens.shadows.sm,
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
                letterSpacing: '-0.01em',
              }}
            >
              Snout OS
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.xs[0],
                color: tokens.colors.text.secondary,
                fontWeight: tokens.typography.fontWeight.medium,
              }}
            >
              Enterprise
            </div>
          </div>
        </div>

        {/* Navigation */}
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
              onClick={() => setSidebarOpen(false)} // Close sidebar on navigation
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
                  ? tokens.colors.primary[50]
                  : 'transparent',
                fontWeight: isActive(item.href)
                  ? tokens.typography.fontWeight.semibold
                  : tokens.typography.fontWeight.medium,
                transition: `all ${tokens.transitions.duration.DEFAULT} ${tokens.transitions.timingFunction.DEFAULT}`,
                cursor: 'pointer',
                pointerEvents: 'auto',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                  e.currentTarget.style.transform = 'translateX(2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.href)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
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
      </aside>

      {/* Main Content Area - Always full width, never resized */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          marginLeft: 0, // Never push content
        }}
      >
        {/* Top Bar */}
        <header
          style={{
            height: tokens.layout.appShell.topBarHeight,
            backgroundColor: tokens.colors.background.primary,
            borderBottom: `1px solid ${tokens.colors.border.default}`,
            padding: `0 ${tokens.spacing[6]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: tokens.zIndex.sticky,
            width: '100%',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: tokens.shadows.xs,
          }}
        >
          {/* Hamburger Button - Always visible on all screen sizes */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
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
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} />
          </button>
          <div style={{ flex: 1 }} />
          {/* User menu placeholder */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
            }}
          >
            {/* User menu can go here */}
          </div>
        </header>

        {/* Content */}
        <main
          style={{
            flex: 1,
            padding: tokens.layout.appShell.contentPadding,
            maxWidth: isMobile ? '100vw' : tokens.layout.appShell.contentMaxWidth, // Part A: Zero horizontal scroll enforcement
            width: '100%',
            margin: '0 auto',
            overflowX: 'hidden', // Part A: Zero horizontal scroll enforcement
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
