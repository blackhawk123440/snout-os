'use client';

import React from 'react';

const CARD_BASE = 'rounded-2xl border border-neutral-200 bg-white shadow-sm';

export interface SitterCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SitterCard({ children, className = '', onClick }: SitterCardProps) {
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

export interface SitterCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SitterCardHeader({ children, className = '' }: SitterCardHeaderProps) {
  return <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>;
}

export interface SitterCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function SitterCardBody({ children, className = '' }: SitterCardBodyProps) {
  return <div className={`px-5 py-3 text-sm text-neutral-700 ${className}`}>{children}</div>;
}

export interface SitterCardActionsProps {
  children: React.ReactNode;
  className?: string;
  /** Stop click propagation (e.g. when card is tappable but actions should not trigger navigation) */
  stopPropagation?: boolean;
}

export function SitterCardActions({ children, className = '', stopPropagation: stop = false }: SitterCardActionsProps) {
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
