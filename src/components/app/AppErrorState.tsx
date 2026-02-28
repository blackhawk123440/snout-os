'use client';

import React from 'react';

export interface AppErrorStateProps {
  title?: string;
  subtitle?: string;
  onRetry: () => void;
  className?: string;
}

export function AppErrorState({
  title = 'Oops! Something went wrong',
  subtitle = "We couldn't load this. Give it another try.",
  onRetry,
  className = '',
}: AppErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-8 py-12 text-center ${className}`}
    >
      <p className="text-base font-medium text-neutral-700">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-[44px] min-w-[120px] rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
