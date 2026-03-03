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
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-8 py-12 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-4xl text-slate-300">{icon}</div>}
      <p className="text-base font-medium text-slate-900">{title}</p>
      {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-4 min-h-[40px] min-w-[120px] rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
