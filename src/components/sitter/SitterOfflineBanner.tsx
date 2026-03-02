'use client';

import React from 'react';
import { useOffline } from '@/hooks/useOffline';

export function SitterOfflineBanner() {
  const { isOnline, queuedCount, queuedPhotosCount, syncing, syncNow } = useOffline();

  if (isOnline && queuedCount === 0 && queuedPhotosCount === 0) return null;

  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
      {!isOnline ? (
        <>
          <i className="fas fa-wifi text-amber-600" />
          <span>You&apos;re offline. Actions will sync when you reconnect.</span>
          {queuedPhotosCount > 0 && (
            <span className="ml-1 rounded bg-amber-200 px-2 py-0.5 text-xs">Photos queued: {queuedPhotosCount}</span>
          )}
        </>
      ) : (
        <>
          <i className="fas fa-cloud-upload-alt text-amber-600" />
          <span>{queuedCount} action{queuedCount !== 1 ? 's' : ''} queued</span>
          {queuedPhotosCount > 0 && (
            <span className="rounded bg-amber-200 px-2 py-0.5 text-xs">Photos queued: {queuedPhotosCount}</span>
          )}
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing}
            className="ml-2 rounded-lg bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </>
      )}
    </div>
  );
}
