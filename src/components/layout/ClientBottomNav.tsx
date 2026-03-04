'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CLIENT_TABS } from '@/lib/client-nav';

export function ClientBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex min-h-[40px] items-center justify-around border-t border-slate-200 bg-white py-1.5 lg:hidden min-[1024px]:hidden"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      {CLIENT_TABS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 border-t pt-1.5 pb-0.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset ${
              active
                ? 'border-slate-900 text-slate-900 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className={`${item.icon}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
