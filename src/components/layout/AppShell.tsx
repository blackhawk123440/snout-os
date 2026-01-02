/**
 * AppShell Component - System DNA Implementation
 * 
 * Enterprise application shell with posture awareness.
 * Pages can declare their physiology and the system adapts automatically.
 * 
 * Enforces spatial hierarchy, temporal intelligence, and motion doctrine.
 */

'use client';

import React, { useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import { PagePhysiology, SYSTEM_CONSTANTS } from '@/lib/system-dna';
import { spatial } from '@/lib/spatial-hierarchy';
import { motion } from '@/lib/motion-system';

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
  /** Page physiology - determines posture, motion, and spacing */
  physiology?: PagePhysiology;
}

/**
 * Posture Context
 * Provides current page physiology to all child components
 */
const PostureContext = createContext<PagePhysiology>('observational');

export const usePosture = () => useContext(PostureContext);

export const AppShell: React.FC<AppShellProps> = ({ 
  children, 
  physiology = 'observational' 
}) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Get motion config for current physiology
  const physiologyMotion = motion.styles('transition');

  return (
    <PostureContext.Provider value={physiology}>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: tokens.colors.white.material,
          ...physiologyMotion,
        }}
      >
        {/* Sidebar - Surface layer */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex`}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: tokens.layout.appShell.sidebarWidth,
            backgroundColor: tokens.colors.white.material,
            borderRight: spatial.border('surface', 'subtle'),
            ...spatial.getLayerStyles('surface'),
            display: 'flex',
            flexDirection: 'column',
            ...motion.styles('transition', ['transform']),
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              padding: tokens.spacing[6],
              borderBottom: spatial.border('surface', 'subtle'),
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
                backgroundColor: tokens.colors.primary.focused,
                borderRadius: tokens.borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: tokens.colors.white.material,
                fontSize: tokens.typography.fontSize.xl[0],
                fontWeight: tokens.typography.fontWeight.bold,
                ...motion.styles('transition', ['background-color']),
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
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
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
                    color: active
                      ? tokens.colors.primary.focused
                      : tokens.colors.text.primary,
                    backgroundColor: active
                      ? tokens.colors.primary.opacity[10]
                      : 'transparent',
                    fontWeight: active
                      ? tokens.typography.fontWeight.semibold
                      : tokens.typography.fontWeight.normal,
                    ...motion.styles('transition', ['color', 'background-color', 'font-weight']),
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = tokens.colors.primary.opacity[5];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
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
                        color: tokens.colors.white.material,
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
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div
          className="lg:ml-64"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          {/* Top Bar - Surface layer, sticky */}
          <header
            style={{
              height: tokens.layout.appShell.topBarHeight,
              backgroundColor: tokens.colors.white.material,
              borderBottom: spatial.border('surface', 'subtle'),
              padding: `0 ${tokens.spacing[6]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              ...spatial.getLayerStyles('surface'),
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
                border: spatial.border('surface', 'normal'),
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: tokens.colors.text.primary,
                ...motion.styles('readiness', ['background-color', 'border-color']),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.primary.opacity[5];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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

        {/* Mobile sidebar overlay - Overlay layer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: `rgba(0, 0, 0, 0.3)`,
              ...spatial.getLayerStyles('overlay'),
              ...motion.styles('transition', ['opacity']),
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </PostureContext.Provider>
  );
};
