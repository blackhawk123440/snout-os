'use client';

import React from 'react';

export interface AppErrorStateProps {
  title?: string;
  message?: string;
  subtitle?: string;
  onRetry: () => void;
  className?: string;
}

export function AppErrorState({
  title,
  message,
  subtitle = "We couldn't load this. Give it another try.",
  onRetry,
  className = '',
}: AppErrorStateProps) {
  const displayTitle = message ?? title ?? 'Oops! Something went wrong';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-8 py-12 text-center ${className}`}
    >
      <p className="text-base font-medium text-neutral-700">{title}</p>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-[44px] min-w-[120px] rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-surface-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)] focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
