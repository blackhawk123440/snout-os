/**
 * AppShell Component
 * 
 * Enterprise application shell with sidebar navigation, top bar, and content container.
 * All dashboard pages must use this layout.
 */

'use client';

import React, { useState } from 'react';
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
      }}
    >
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex`}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: tokens.layout.appShell.sidebarWidth,
          backgroundColor: tokens.colors.background.primary,
          borderRight: `1px solid ${tokens.colors.border.default}`,
          zIndex: tokens.zIndex.fixed,
          display: 'flex',
          flexDirection: 'column',
          transition: `transform ${tokens.transitions.duration.slow}`,
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

      {/* Main Content Area */}
      <div
        className="lg:ml-64"
        style={{
          flex: 1,
          marginLeft: tokens.layout.appShell.sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
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
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden flex"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: tokens.borderRadius.md,
              border: `1px solid ${tokens.colors.border.default}`,
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: tokens.colors.text.primary,
            }}
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars" />
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
            maxWidth: tokens.layout.appShell.contentMaxWidth,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden"
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
  );
};
