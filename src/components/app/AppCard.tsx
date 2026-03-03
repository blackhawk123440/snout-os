'use client';

import React from 'react';

/** Tier 1 primary card: key summary panels, main dashboard blocks */
const CARD_BASE =
  'rounded-lg border border-slate-200 bg-white shadow-sm';

export interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AppCard({ children, className = '', onClick }: AppCardProps) {
  return (
    <div
      className={`${CARD_BASE} ${onClick ? 'cursor-pointer transition hover:border-slate-300 hover:bg-slate-50/50' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

export interface AppCardHeaderProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function AppCardHeader({ title, children, className = '' }: AppCardHeaderProps) {
  return (
    <div className={`px-5 pt-5 pb-2 ${className}`}>
      {title ? (
        <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
      ) : (
        children
      )}
    </div>
  );
}

export interface AppCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function AppCardBody({ children, className = '' }: AppCardBodyProps) {
  return (
    <div className={`px-5 pb-5 text-sm text-slate-700 ${className}`}>
      {children}
    </div>
  );
}

export interface AppCardActionsProps {
  children: React.ReactNode;
  className?: string;
  /** Stop click propagation (e.g. when card is tappable but actions should not trigger navigation) */
  stopPropagation?: boolean;
}

export function AppCardActions({ children, className = '', stopPropagation: stop = false }: AppCardActionsProps) {
  return (
    <div
      className={`flex flex-wrap gap-2 px-5 pb-5 pt-2 ${className}`}
      onClick={stop ? (e) => e.stopPropagation() : undefined}
      onKeyDown={stop ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </div>
  );
}
