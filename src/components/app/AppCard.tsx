'use client';

import React from 'react';

const CARD_BASE = 'rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-primary)] shadow-sm';

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
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function AppCardHeader({ title, children, className = '' }: AppCardHeaderProps) {
  return (
    <div className={`${className}`} style={{ padding: 'var(--density-padding)' }}>
      {title ? <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h3> : children}
    </div>
  );
}

export interface AppCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function AppCardBody({ children, className = '' }: AppCardBodyProps) {
  return (
    <div className={`text-sm text-[var(--color-text-primary)] ${className}`} style={{ padding: 'var(--density-padding)' }}>
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
