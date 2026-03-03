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
  const displayTitle = message ?? title ?? 'Something went wrong';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-8 py-12 text-center ${className}`}
    >
      <p className="text-base font-medium text-slate-900">{displayTitle}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-[40px] min-w-[120px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
