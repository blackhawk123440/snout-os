'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CLIENT_TABS } from '@/lib/client-nav';
import { cn } from '@/components/ui/utils';
import { Icon } from '@/components/ui/Icon';

export function ClientBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex h-14 min-h-[56px] items-stretch justify-around border-t border-border-default bg-surface-primary lg:hidden min-[1024px]:hidden"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      aria-label="Primary navigation"
    >
      {CLIENT_TABS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset',
              'min-h-[44px] touch-manipulation',
              active
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            )}
          >
            <Icon name={item.icon} className="w-5 h-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
