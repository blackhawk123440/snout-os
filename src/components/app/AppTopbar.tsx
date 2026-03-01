'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import { useTheme } from '@/lib/theme-context';

export interface AppTopbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

export function AppTopbar({ left, right, children }: AppTopbarProps) {
  const { mode, toggleMode, density, setDensity } = useTheme();

  return (
    <header
      className="flex items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-6"
      style={{
        height: tokens.layout.appShell.topBarHeight,
        position: 'sticky',
        top: 0,
        zIndex: tokens.zIndex.sticky,
      }}
    >
      <div className="flex items-center gap-3">{left}</div>
      {children && <div className="flex-1" />}
      <div className="flex items-center gap-2">
        {/* Density selector */}
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable' | 'spacious')}
          className="rounded-lg border border-[var(--color-border-default)] bg-transparent px-2 py-1 text-sm text-[var(--color-text-secondary)]"
          aria-label="UI density"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
        {/* Dark/light toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className="rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <i className={mode === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} />
        </button>
        {right}
      </div>
    </header>
  );
}
