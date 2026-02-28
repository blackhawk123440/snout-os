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
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-8 py-12 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-4xl text-neutral-300">{icon}</div>}
      <p className="text-base font-medium text-neutral-700">{title}</p>
      {subtitle && <div className="mt-1 text-sm text-neutral-500">{subtitle}</div>}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-4 min-h-[44px] min-w-[120px] rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
