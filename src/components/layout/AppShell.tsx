/**
 * AppShell Component
 * 
 * Enterprise application shell with sidebar navigation, top bar, and content container.
 * All dashboard pages must use this layout.
 * 
 * Features:
 * - Desktop: Collapsible sidebar (expanded/collapsed)
 * - Mobile: Overlay sidebar drawer (closed by default)
 * - Responsive navigation with hamburger menu
 * - Mobile-optimized layout
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
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile: overlay state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop: collapsed state
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false); // Reset mobile state on desktop
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const sidebarWidth = sidebarCollapsed 
    ? tokens.layout.appShell.sidebarWidthCollapsed 
    : tokens.layout.appShell.sidebarWidth;

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
        {/* Sidebar */}
        <aside
          className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: sidebarWidth,
            backgroundColor: tokens.colors.background.primary,
            borderRight: `1px solid ${tokens.colors.border.default}`,
            zIndex: tokens.zIndex.fixed,
            display: 'flex',
            flexDirection: 'column',
            transition: `width ${tokens.transitions.duration.slow}, transform ${tokens.transitions.duration.slow}`,
            transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              padding: sidebarCollapsed ? tokens.spacing[4] : tokens.spacing[6],
              borderBottom: `1px solid ${tokens.colors.border.default}`,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
              height: tokens.layout.appShell.topBarHeight,
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              overflow: 'hidden',
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
            {!sidebarCollapsed && (
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
            )}
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
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[3],
                  padding: sidebarCollapsed 
                    ? tokens.spacing[3] 
                    : `${tokens.spacing[3]} ${tokens.spacing[4]}`,
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
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  minHeight: '44px', // Touch target
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
                {!sidebarCollapsed && (
                  <>
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
                  </>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div
          className="app-content"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: '100%',
            maxWidth: '100vw',
            marginLeft: 0,
            transition: `margin-left ${tokens.transitions.duration.slow}`,
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
              }}
              aria-label="Toggle sidebar"
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

          {/* Content */}
          <main
            style={{
              flex: 1,
              padding: tokens.spacing[4],
              maxWidth: tokens.layout.appShell.contentMaxWidth,
              width: '100%',
              margin: '0 auto',
              overflowX: 'hidden',
            }}
          >
            <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && isMobile && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: tokens.zIndex.modalBackdrop,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Global CSS for responsive behavior */}
      <style jsx global>{`
        /* Desktop: Sidebar always visible, content adjusts margin */
        @media (min-width: 1024px) {
          .app-sidebar {
            transform: translateX(0) !important;
          }
          
          .app-content {
            margin-left: ${tokens.layout.appShell.sidebarWidth} !important;
          }
          
          .app-content.sidebar-collapsed {
            margin-left: ${tokens.layout.appShell.sidebarWidthCollapsed} !important;
          }
        }

        /* Mobile: Sidebar hidden by default, overlay when open */
        @media (max-width: 1023px) {
          .app-sidebar {
            transform: translateX(-100%);
          }
          
          .app-sidebar.sidebar-open {
            transform: translateX(0) !important;
          }
          
          .app-content {
            margin-left: 0 !important;
          }
        }

        /* Prevent horizontal scroll */
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* Ensure all content is responsive */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </>
  );
};
