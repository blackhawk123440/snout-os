'use client';

import React from 'react';

export interface SitterPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SitterPageHeader({ title, subtitle, action }: SitterPageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-2 shrink-0 sm:mt-0">{action}</div>}
    </div>
  );
}
