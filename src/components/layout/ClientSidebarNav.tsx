'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CLIENT_NAV_GROUPS } from '@/lib/client-nav';
import { cn } from '@/components/ui/utils';

export function ClientSidebarNav() {
  const pathname = usePathname();
  const [deployInfo, setDeployInfo] = useState<{
    envName: string;
    commitSha: string;
    buildTime: string | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        const sha = data.commitSha ?? data.version;
        const envName = data.envName ?? 'staging';
        const buildTime = data.buildTime ?? null;
        if (sha && sha !== 'unknown') {
          setDeployInfo({
            envName: String(envName),
            commitSha: typeof sha === 'string' ? sha.slice(0, 7) : String(sha).slice(0, 7),
            buildTime: buildTime ? String(buildTime) : null,
          });
        } else {
          setDeployInfo({ envName: String(envName), commitSha: '', buildTime: buildTime ? String(buildTime) : null });
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === '/client/home') return pathname === '/client/home' || pathname === '/client';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="hidden shrink-0 border-r border-border-default bg-surface-primary lg:flex lg:w-60 lg:flex-col min-[1024px]:flex min-[1024px]:w-60 min-[1024px]:flex-col"
      aria-label="Client portal navigation"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Client</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {CLIENT_NAV_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className={cn('px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-text-disabled', groupIndex === 0 ? 'pt-0' : 'pt-2')}>
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex h-9 min-h-[36px] max-h-[40px] items-center gap-2 rounded-md px-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset',
                      active
                        ? 'border-l-2 border-text-primary bg-surface-secondary font-medium text-text-primary'
                        : 'border-l-2 border-transparent text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
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
      <div className="sticky bottom-0 mt-auto border-t border-border-default bg-surface-primary px-4 py-3">
        <a
          href="/help"
          className="text-xs text-text-tertiary hover:text-text-secondary hover:underline"
        >
          Support
        </a>
        <p
          className="mt-1 text-[11px] text-text-disabled tabular-nums"
          title={deployInfo?.buildTime ? `Built: ${deployInfo.buildTime}` : undefined}
        >
          {deployInfo?.envName ?? 'staging'}
          {deployInfo?.commitSha ? ` · ${deployInfo.commitSha}` : ''}
        </p>
      </div>
    </aside>
  );
}
