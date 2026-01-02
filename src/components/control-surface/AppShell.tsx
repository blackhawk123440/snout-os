/**
 * AppShell - Control Surface
 * 
 * Dark base, spatial depth, temporal intelligence.
 * The foundation that establishes the system's presence.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { controlSurface } from '@/lib/design-tokens-control-surface';
import { PostureProvider, type Posture } from './PostureProvider';

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

export interface ControlSurfaceAppShellProps {
  children: React.ReactNode;
  posture?: Posture;
}

export const ControlSurfaceAppShell: React.FC<ControlSurfaceAppShellProps> = ({
  children,
  posture = 'observational',
}) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <PostureProvider defaultPosture={posture}>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: controlSurface.colors.base.depth0,
          color: controlSurface.colors.base.neutral.primary,
          fontFamily: controlSurface.typography.fontFamily.sans.join(', '),
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
          width: controlSurface.layout.appShell.sidebarWidth,
          backgroundColor: controlSurface.colors.base.depth1,
          borderRight: controlSurface.spatial.border.base,
          zIndex: controlSurface.spatial.depth.panel,
          display: 'flex',
          flexDirection: 'column',
          transition: `transform ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            padding: controlSurface.spacing[6],
            borderBottom: controlSurface.spatial.border.subtle,
            display: 'flex',
            alignItems: 'center',
            gap: controlSurface.spacing[3],
            height: controlSurface.layout.appShell.topBarHeight,
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: controlSurface.spatial.radius.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: controlSurface.typography.fontSize.xl[0] as string,
              fontWeight: controlSurface.typography.fontWeight.bold,
              color: controlSurface.colors.base.neutral.primary,
              border: controlSurface.spatial.border.voltage,
              boxShadow: `0 0 0 1px ${controlSurface.colors.voltage.edge}`,
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontSize: controlSurface.typography.fontSize.base[0] as string,
                fontWeight: controlSurface.typography.fontWeight.semibold,
                color: controlSurface.colors.base.neutral.primary,
              }}
            >
              Snout
            </div>
            <div
              style={{
                fontSize: controlSurface.typography.fontSize.xs[0] as string,
                color: controlSurface.colors.base.neutral.tertiary,
              }}
            >
              Control Surface
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: controlSurface.spacing[4],
            overflowY: 'auto',
          }}
        >
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: controlSurface.spacing[1],
            }}
          >
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: controlSurface.spacing[3],
                      padding: `${controlSurface.spacing[3]} ${controlSurface.spacing[4]}`,
                      borderRadius: controlSurface.spatial.radius.base,
                      color: active
                        ? controlSurface.colors.base.neutral.primary
                        : controlSurface.colors.base.neutral.secondary,
                      backgroundColor: active
                        ? controlSurface.colors.base.depth2
                        : 'transparent',
                      border: active
                        ? controlSurface.spatial.border.voltage
                        : 'none',
                      boxShadow: active
                        ? `0 0 0 1px ${controlSurface.colors.voltage.edge}`
                        : 'none',
                      textDecoration: 'none',
                      fontSize: controlSurface.typography.fontSize.base[0] as string,
                      fontWeight: active
                        ? controlSurface.typography.fontWeight.medium
                        : controlSurface.typography.fontWeight.normal,
                      transition: `all ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = controlSurface.colors.base.depth1;
                        e.currentTarget.style.color = controlSurface.colors.base.neutral.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = controlSurface.colors.base.neutral.secondary;
                      }
                    }}
                  >
                    {item.icon && (
                      <i
                        className={item.icon}
                        style={{
                          width: '1.25rem',
                          textAlign: 'center',
                          fontSize: controlSurface.typography.fontSize.base[0] as string,
                        }}
                      />
                    )}
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          padding: `${controlSurface.spacing[1]} ${controlSurface.spacing[2]}`,
                          borderRadius: controlSurface.spatial.radius.full,
                          backgroundColor: controlSurface.colors.status.error.base,
                          color: controlSurface.colors.base.neutral.primary,
                          fontSize: controlSurface.typography.fontSize.xs[0] as string,
                          fontWeight: controlSurface.typography.fontWeight.medium,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: 0,
          transition: `margin-left ${controlSurface.motion.duration.base} ${controlSurface.motion.easing.ambient}`,
        }}
        className="lg:ml-[260px]"
      >
        {/* Top Bar */}
        <header
          style={{
            height: controlSurface.layout.appShell.topBarHeight,
            backgroundColor: controlSurface.colors.base.depth1,
            borderBottom: controlSurface.spatial.border.base,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${controlSurface.spacing[6]}`,
            position: 'sticky',
            top: 0,
            zIndex: controlSurface.spatial.depth.elevated,
            boxShadow: controlSurface.spatial.elevation.panel,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: controlSurface.spatial.radius.base,
              border: 'none',
              backgroundColor: 'transparent',
              color: controlSurface.colors.base.neutral.secondary,
              cursor: 'pointer',
              fontSize: controlSurface.typography.fontSize.base[0] as string,
              transition: `all ${controlSurface.motion.duration.fast} ${controlSurface.motion.easing.ambient}`,
            }}
            className="lg:hidden"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = controlSurface.colors.base.depth2;
              e.currentTarget.style.color = controlSurface.colors.base.neutral.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = controlSurface.colors.base.neutral.secondary;
            }}
          >
            <i className="fas fa-bars" />
          </button>
        </header>

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            backgroundColor: controlSurface.colors.base.depth0,
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: controlSurface.spatial.depth.overlay,
          }}
          className="lg:hidden"
        />
      )}
      </div>
    </PostureProvider>
  );
};

