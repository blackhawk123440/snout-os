'use client';

import React from 'react';

export interface AppEmptyStateProps {
  title: string;
  subtitle?: React.ReactNode;
  cta?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
  className?: string;
}

export function AppEmptyState({
  title,
  subtitle,
  cta,
  icon,
  className = '',
}: AppEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center lg:rounded-lg ${className}`}
    >
      {icon && <div className="mb-3 text-4xl text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle && <div className="mt-1 text-sm text-slate-600">{subtitle}</div>}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-4 flex min-h-[44px] min-w-[120px] items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
