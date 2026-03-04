'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CLIENT_NAV_GROUPS } from '@/lib/client-nav';
import { cn } from '@/components/ui/utils';

const APP_VERSION = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_VERSION
  ? process.env.NEXT_PUBLIC_APP_VERSION
  : 'staging';

export function ClientSidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="hidden shrink-0 border-r border-slate-200 bg-white lg:flex lg:w-60 lg:flex-col"
      aria-label="Client portal navigation"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Client</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {CLIENT_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className={cn('px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400', groupIndex === 0 ? 'pt-0' : 'pt-2')}>
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex h-9 min-h-[36px] max-h-[40px] items-center gap-2 rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset',
                      active
                        ? 'border-l-2 border-slate-900 bg-slate-50 font-medium text-slate-900'
                        : 'border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <i className={`${item.icon} w-4 shrink-0 text-center text-[16px]`} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="sticky bottom-0 mt-auto border-t border-slate-200 bg-white px-4 py-3">
        <a
          href="/help"
          className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
        >
          Support
        </a>
        <p className="mt-1 text-[11px] text-slate-400 tabular-nums">{APP_VERSION}</p>
      </div>
    </aside>
  );
}
