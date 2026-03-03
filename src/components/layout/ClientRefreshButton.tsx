'use client';

/**
 * Small icon button for client portal page headers.
 * Replaces floating "Refresh" text links with a restrained, accessible control.
 */

export interface ClientRefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

export function ClientRefreshButton({ onRefresh, loading, className = '' }: ClientRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onRefresh()}
      disabled={loading}
      aria-label="Refresh"
      title="Refresh"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <i className="fas fa-circle-notch fa-spin text-sm" aria-hidden />
      ) : (
        <i className="fas fa-rotate-right text-sm" aria-hidden />
      )}
    </button>
  );
}
