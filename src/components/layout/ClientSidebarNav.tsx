'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CLIENT_TABS } from '@/lib/client-nav';
import { cn } from '@/components/ui/utils';

export function ClientSidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="hidden shrink-0 border-r border-slate-200 bg-white lg:block lg:w-60"
      aria-label="Client portal navigation"
    >
      <nav className="sticky top-0 flex flex-col py-3">
        {CLIENT_TABS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset',
                active
                  ? 'border-l-2 border-slate-900 bg-slate-50 font-medium text-slate-900'
                  : 'border-l-2 border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <i className={`${item.icon} w-5 shrink-0 text-center`} aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
