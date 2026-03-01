'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tokens } from '@/lib/design-tokens';
import type { NavItem } from '@/lib/navigation';

export interface AppSidebarProps {
  items: NavItem[];
  brand?: React.ReactNode;
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({
  items,
  brand,
  collapsed = false,
  onNavigate,
}: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/command-center' || href === '/') return pathname === href || pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex flex-col border-r border-[var(--color-border-default)] bg-[var(--color-surface-primary)]"
            style={{
              width: collapsed ? tokens.layout.appShell.sidebarWidthCollapsed : tokens.layout.appShell.sidebarWidth,
              transition: `width ${tokens.transitions.duration.slow} ease-in-out`,
            }}
    >
      {brand ?? (
        <div
          className="flex items-center gap-3 border-b border-[var(--color-border-default)] px-6"
          style={{ height: tokens.layout.appShell.topBarHeight }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-teal-600)] text-white"
            style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}
          >
            S
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-[var(--color-text-primary)]">Snout OS</div>
              <div className="text-xs text-[var(--color-text-secondary)]">Enterprise</div>
            </div>
          )}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm no-underline transition ${
                active
                  ? 'bg-[var(--color-teal-50)] font-semibold text-[var(--color-teal-700)] dark:bg-teal-900/30 dark:text-teal-300'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
              }`}
            >
              {item.icon && (
                <i className={`${item.icon} w-5 shrink-0 text-center`} style={{ width: '1.25rem' }} />
              )}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
