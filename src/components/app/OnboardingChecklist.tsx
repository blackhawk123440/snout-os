'use client';

/**
 * OnboardingChecklist - Enterprise setup card with progress.
 * Compact UI, direct tone, CTA links.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { OnboardingChecklist, OnboardingItem } from '@/lib/onboarding';

export function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data || data.total === 0) return null;
  if (data.completed >= data.total) return null;

  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Setup</h3>
        <span className="text-xs text-[var(--color-text-tertiary)]">{pct}% complete</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-tertiary)]">
        <div
          className="h-full bg-[var(--color-accent-primary)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {data.items.map((item) => (
          <OnboardingItemRow key={item.key} item={item} />
        ))}
      </ul>
    </div>
  );
}

function OnboardingItemRow({ item }: { item: OnboardingItem }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {item.done ? (
        <span className="text-emerald-600" aria-hidden="true">
          <i className="fas fa-check-circle" />
        </span>
      ) : (
        <span className="text-[var(--color-text-tertiary)]" aria-hidden="true">
          <i className="fas fa-circle" style={{ fontSize: '0.4rem' }} />
        </span>
      )}
      <span className={item.done ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}>
        {item.label}
      </span>
      {!item.done && (
        <Link
          href={item.href}
          className="ml-auto text-xs font-medium text-[var(--color-accent-primary)] hover:underline"
        >
          {item.label.includes('Connect') || item.label.includes('Add') ? 'Go' : 'Complete'}
        </Link>
      )}
    </li>
  );
}
