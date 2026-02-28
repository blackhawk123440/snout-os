'use client';

import React from 'react';

const CARD_BASE = 'rounded-2xl border border-neutral-200 bg-white shadow-sm';

export interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AppCard({ children, className = '', onClick }: AppCardProps) {
  return (
    <div
      className={`${CARD_BASE} ${onClick ? 'cursor-pointer transition hover:border-neutral-300 hover:shadow' : ''} ${className}`}
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
  children: React.ReactNode;
  className?: string;
}

export function AppCardHeader({ children, className = '' }: AppCardHeaderProps) {
  return <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>;
}

export interface AppCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function AppCardBody({ children, className = '' }: AppCardBodyProps) {
  return <div className={`px-5 py-3 text-sm text-neutral-700 ${className}`}>{children}</div>;
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
