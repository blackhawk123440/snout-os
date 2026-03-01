/**
 * AppShell Component
 * 
 * Enterprise application shell with sidebar navigation, top bar, and content container.
 * All dashboard pages must use this layout.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { ownerNavigation, navigation, type NavItem } from '@/lib/navigation';
import { useAuth } from '@/lib/auth-client';
import { useTheme } from '@/lib/theme-context';

export type { NavItem } from '@/lib/navigation';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMobile();
  const { user, isOwner, isSitter } = useAuth();
  const { mode, toggleMode, density, setDensity } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Use owner nav for owners, legacy nav filtered for others
  const baseNav = isOwner ? ownerNavigation : navigation;
  const filteredNavigation = baseNav.filter((item) => {
    // Sitters should not see owner-only pages
    if (isSitter) {
      // Sitters can see: Dashboard (redirected to inbox), Messages (redirected to sitter inbox)
      // Hide: Bookings, Calendar, Clients, Sitters, Automations, Payments, Payroll, Settings
      if (item.href === '/messages') {
        return false; // Sitters use /sitter/inbox instead
      }
      if (['/bookings', '/calendar', '/clients', '/bookings/sitters', '/automation', '/payments', '/payroll', '/pricing', '/settings'].includes(item.href)) {
        return false;
      }
    }
    // Owners see all navigation items
    return true;
  });
  
  // Add sitter-specific navigation
  const sitterNavItems: NavItem[] = isSitter ? [
    { label: 'Inbox', href: '/sitter/inbox', icon: 'fas fa-inbox' },
  ] : [];
  
  const displayNavigation = isSitter ? sitterNavItems : filteredNavigation;
  
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

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

  // Prevent body scroll - AppShell owns all scrolling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always prevent body scroll when AppShell is mounted
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Additional prevention when sidebar is open on mobile
      if (sidebarOpen && window.innerWidth < 1024) {
        // Already set above, no additional changes needed
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
    };
  }, [sidebarOpen]);

  const isActive = (href: string) => {
    if (href === '/' || href === '/command-center') {
      return pathname === '/' || pathname === '/command-center';
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{
        position: 'fixed', // Phase E: Enforce single scroll surface - prevent body scroll
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.colors.background.primary,
        width: '100%',
        height: '100%', // Use 100% instead of 100vh for better mobile Safari support
        maxHeight: '100vh', // Fallback for browsers that don't support 100%
        overflow: 'hidden', // Phase E: Prevent body scroll - main content area is the only scroll container
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

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: tokens.spacing[2],
          }}
        >
          {displayNavigation.map((item) => {
            const groupActive = item.children?.some((child) => isActive(child.href)) ?? false;
            const parentActive = isActive(item.href) || groupActive;
            const parentHighlight = isActive(item.href) && !groupActive;

            return (
              <div key={item.href} style={{ marginBottom: tokens.spacing[1] }}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)} // Close sidebar on navigation
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[3],
                    padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                    marginBottom: item.children?.length ? 0 : tokens.spacing[1],
                    borderRadius: tokens.borderRadius.md,
                    textDecoration: 'none',
                    color: parentActive
                      ? tokens.colors.primary.DEFAULT
                      : tokens.colors.text.primary,
                    backgroundColor: parentHighlight
                      ? tokens.colors.primary[100]
                      : 'transparent',
                    fontWeight: parentActive
                      ? tokens.typography.fontWeight.semibold
                      : tokens.typography.fontWeight.normal,
                    transition: `all ${tokens.transitions.duration.DEFAULT}`,
                    cursor: 'pointer',
                    pointerEvents: 'auto', // Ensure links are clickable
                  }}
                  onMouseEnter={(e) => {
                    if (!parentActive) {
                      e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!parentActive) {
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

                {item.children && item.children.length > 0 && (
                  <div
                    style={{
                      marginTop: tokens.spacing[1],
                      marginLeft: tokens.spacing[5],
                      display: 'flex',
                      flexDirection: 'column',
                      gap: tokens.spacing[1],
                    }}
                  >
                    {item.children.map((child) => {
                      const childActive = isActive(child.href);

                      return (
                        <Link
                          key={`${item.href}-${child.href}`}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacing[3],
                            padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                            borderRadius: tokens.borderRadius.md,
                            textDecoration: 'none',
                            color: childActive
                              ? tokens.colors.primary.DEFAULT
                              : tokens.colors.text.secondary,
                            backgroundColor: childActive
                              ? tokens.colors.primary[50]
                              : 'transparent',
                            fontWeight: childActive
                              ? tokens.typography.fontWeight.semibold
                              : tokens.typography.fontWeight.normal,
                            fontSize: tokens.typography.fontSize.sm[0],
                            transition: `all ${tokens.transitions.duration.DEFAULT}`,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.backgroundColor = tokens.colors.background.secondary;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {child.icon && (
                            <i
                              className={child.icon}
                              style={{
                                width: '1.25rem',
                                textAlign: 'center',
                              }}
                            />
                          )}
                          <span
                            style={{
                              flex: 1,
                              fontSize: tokens.typography.fontSize.sm[0],
                            }}
                          >
                            {child.label}
                          </span>
                          {child.badge && child.badge > 0 && (
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
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area - Always full width, never resized */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Phase E: Allow flex to constrain height for scroll container
          marginLeft: 0, // Never push content
          overflow: 'hidden', // Phase E: Contain scroll to main element only
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
          {/* Global search stub - opens Command Palette (Cmd+K) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
              flex: 1,
              maxWidth: isMobile ? 100 : 240,
              marginLeft: tokens.spacing[4],
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.border.default}`,
              backgroundColor: tokens.colors.background.secondary,
              color: tokens.colors.text.tertiary,
              fontSize: tokens.typography.fontSize.sm[0],
              textAlign: 'left',
              cursor: 'pointer',
            }}
            aria-label="Search (Cmd+K)"
          >
            <i className="fas fa-search" style={{ color: tokens.colors.text.tertiary }} />
            <span>Search...</span>
            <span style={{ marginLeft: 'auto', fontSize: tokens.typography.fontSize.xs[0] }}>⌘K</span>
          </button>
          <div style={{ flex: 1 }} />
          {/* Theme + density (owners) */}
          {isOwner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                marginRight: tokens.spacing[3],
              }}
            >
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable' | 'spacious')}
                style={{
                  padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                  borderRadius: tokens.borderRadius.md,
                  border: `1px solid ${tokens.colors.border.default}`,
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  backgroundColor: 'transparent',
                }}
                aria-label="UI density"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  padding: tokens.spacing[2],
                  borderRadius: tokens.borderRadius.md,
                  border: 'none',
                  background: 'transparent',
                  color: tokens.colors.text.secondary,
                  cursor: 'pointer',
                }}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
              </button>
            </div>
          )}
          {/* User menu with logout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[3],
            }}
          >
            {user && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
                  borderRadius: tokens.borderRadius.md,
                  color: tokens.colors.text.secondary,
                  fontSize: tokens.typography.fontSize.sm[0],
                }}
              >
                <span>{user.email}</span>
                <span style={{ color: tokens.colors.border.default }}>|</span>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: tokens.colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: tokens.typography.fontSize.sm[0],
                    padding: 0,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = tokens.colors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tokens.colors.text.secondary;
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content - Phase B4: Constrained centered layout, Phase E: Single scroll surface */}
        <main
          style={{
            flex: '1 1 0', // Explicit flex basis 0 to allow proper flex constraint
            padding: `${tokens.spacing[5]} ${tokens.spacing[6]}`, // Phase B4: Tighter padding
            maxWidth: isMobile ? '100vw' : tokens.layout.page.maxWidth, // Phase B4: Use page maxWidth
            width: '100%',
            margin: '0 auto',
            overflowX: 'hidden',
            overflowY: 'auto', // Phase E: Single scroll surface - main content area is the ONLY scroll container
            WebkitOverflowScrolling: 'touch', // Phase E: Smooth scrolling on iOS
            scrollBehavior: 'smooth', // Phase E: Smooth scrolling
            minHeight: 0, // Phase E: Allow flex to constrain height for proper scrolling
            maxHeight: '100%', // Ensure it doesn't exceed container
            touchAction: 'pan-y pinch-zoom', // Allow vertical scrolling and pinch-to-zoom on touch devices
            WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS
            position: 'relative', // Establish stacking context
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
