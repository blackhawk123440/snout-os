/**
 * ThemeToggle — Dark/Light mode toggle for topbar
 * Drop into: src/components/app/ThemeToggle.tsx
 *
 * Closes UI_DONE_CHECKLIST:
 * - [x] Theme toggle (dark/light) in topbar
 */

'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/components/ui/utils';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-fast',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-sm`} />
    </button>
  );
};


/**
 * DensitySelector — Compact/Comfortable/Spacious toggle for topbar
 * Drop into: src/components/app/DensitySelector.tsx
 *
 * Closes UI_DONE_CHECKLIST:
 * - [x] Density selector (Compact/Comfortable/Spacious) in topbar
 * - [x] data-density="compact" | "comfortable" | "spacious" on html
 */

export type Density = 'compact' | 'comfortable' | 'spacious';

// Hook: reads/writes data-density on <html>
export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensityState] = React.useState<Density>(() => {
    if (typeof document === 'undefined') return 'comfortable';
    return (document.documentElement.dataset.density as Density) || 'comfortable';
  });

  const setDensity = React.useCallback((d: Density) => {
    document.documentElement.dataset.density = d;
    setDensityState(d);
    try { localStorage.setItem('snout-density', d); } catch {}
  }, []);

  // Restore from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('snout-density') as Density | null;
      if (saved && ['compact', 'comfortable', 'spacious'].includes(saved)) {
        document.documentElement.dataset.density = saved;
        setDensityState(saved);
      }
    } catch {}
  }, []);

  return [density, setDensity];
}

export const DensitySelector: React.FC<{ className?: string }> = ({ className }) => {
  const [density, setDensity] = useDensity();

  const options: { value: Density; icon: string; label: string }[] = [
    { value: 'compact', icon: 'fa-compress-alt', label: 'Compact' },
    { value: 'comfortable', icon: 'fa-equals', label: 'Comfortable' },
    { value: 'spacious', icon: 'fa-expand-alt', label: 'Spacious' },
  ];

  return (
    <div className={cn('flex items-center rounded-md border border-border-default overflow-hidden', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setDensity(opt.value)}
          className={cn(
            'flex h-7 w-7 items-center justify-center text-[10px] transition-colors duration-fast',
            density === opt.value
              ? 'bg-accent-primary text-text-inverse'
              : 'text-text-tertiary hover:bg-surface-secondary hover:text-text-primary'
          )}
          title={opt.label}
          aria-label={opt.label}
        >
          <i className={`fas ${opt.icon}`} />
        </button>
      ))}
    </div>
  );
};
