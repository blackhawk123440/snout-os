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
import { navigation, type NavItem } from '@/lib/navigation';

export type { NavItem } from '@/lib/navigation';

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
    if (href === '/') {
      return pathname === '/';
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
                  ? tokens.colors.primary[100]
                  : 'transparent',
                fontWeight: isActive(item.href)
                  ? tokens.typography.fontWeight.semibold
                  : tokens.typography.fontWeight.normal,
                transition: `all ${tokens.transitions.duration.DEFAULT}`,
                cursor: 'pointer',
                pointerEvents: 'auto', // Ensure links are clickable
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
