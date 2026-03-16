'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`rounded-lg p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] ${className}`.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      <i className={isDark ? 'fas fa-sun' : 'fas fa-moon'} />
    </button>
  );
}
