/**
 * AppShell Component
 * 
 * Enterprise application shell with overlay sidebar navigation.
 * 
 * Sidebar Behavior:
 * - Always overlays content (never pushes or resizes)
 * - Blurred backdrop when open
 * - Closes on: hamburger click, outside tap, navigation, Escape key
 * - Fully interactive when open
 * - Content always full width
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';

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
  { label: 'Settings', href: '/settings', icon: 'fas fa-cog' },
];

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Handle Escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sidebar is open on mobile
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on backdrop, not on sidebar
    if (e.target === e.currentTarget) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: tokens.colors.background.secondary,
          width: '100%',
          maxWidth: '100vw',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        {/* Main Content Area - Always Full Width */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: '100%',
            maxWidth: '100vw',
            marginLeft: 0, // Never add margin
          }}
        >
          {/* Top Bar */}
          <header
            style={{
              height: tokens.layout.appShell.topBarHeight,
              backgroundColor: tokens.colors.background.primary,
              borderBottom: `1px solid ${tokens.colors.border.default}`,
              padding: `0 ${tokens.spacing[4]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: tokens.zIndex.sticky,
              width: '100%',
              maxWidth: '100vw',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleToggleSidebar}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: tokens.borderRadius.md,
                border: `1px solid ${tokens.colors.border.default}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: tokens.colors.text.primary,
                flexShrink: 0,
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
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
              <i className="fas fa-bars" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }} />
            {/* User menu placeholder */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[3],
                flexShrink: 0,
              }}
            >
              {/* User menu can go here */}
            </div>
          </header>

          {/* Content - Always Full Width */}
          <main
            style={{
              flex: 1,
              padding: tokens.spacing[4],
              maxWidth: tokens.layout.appShell.contentMaxWidth,
              width: '100%',
              margin: '0 auto',
              overflowX: 'hidden',
            }}
            className="lg:p-6"
          >
            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
              {children}
            </div>
          </main>
        </div>

        {/* Blurred Backdrop - Only when sidebar is open */}
        {sidebarOpen && (
          <div
            onClick={handleBackdropClick}
            className="sidebar-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: tokens.zIndex.modalBackdrop,
              pointerEvents: 'auto',
            }}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - Always Overlay */}
        <aside
          className={`sidebar-overlay ${sidebarOpen ? 'sidebar-open' : ''}`}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: tokens.layout.appShell.sidebarWidth,
            backgroundColor: tokens.colors.background.primary,
            borderRight: `1px solid ${tokens.colors.border.default}`,
            zIndex: tokens.zIndex.modal,
            display: 'flex',
            flexDirection: 'column',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: `transform ${tokens.transitions.duration.slow} ${tokens.transitions.timingFunction.DEFAULT}`,
            boxShadow: sidebarOpen ? tokens.shadows.xl : 'none',
            pointerEvents: sidebarOpen ? 'auto' : 'none',
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
              flexShrink: 0,
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
                flexShrink: 0,
              }}
            >
              S
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: tokens.typography.fontSize.base[0],
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.text.primary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Snout OS
              </div>
              <div
                style={{
                  fontSize: tokens.typography.fontSize.xs[0],
                  color: tokens.colors.text.secondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
              overflowX: 'hidden',
              padding: tokens.spacing[2],
            }}
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setSidebarOpen(false);
                }}
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
                  minHeight: '44px', // Touch target
                  pointerEvents: 'auto',
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
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    flex: 1,
                    fontSize: tokens.typography.fontSize.base[0],
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
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
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      {/* Global CSS for backdrop blur and sidebar behavior */}
      <style jsx global>{`
        /* Blurred backdrop */
        .sidebar-backdrop {
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          background: rgba(0, 0, 0, 0.2);
        }

        /* Ensure sidebar is above backdrop */
        .sidebar-overlay {
          pointer-events: none;
        }

        .sidebar-overlay.sidebar-open {
          pointer-events: auto;
        }

        /* Prevent body scroll when sidebar is open on mobile */
        @media (max-width: 1023px) {
          body.sidebar-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
        }

        /* Smooth sidebar animation */
        .sidebar-overlay {
          will-change: transform;
        }

        /* Ensure content never shifts */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* Prevent horizontal scroll */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </>
  );
};
