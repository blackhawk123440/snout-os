/**
 * BuildHash Component
 * 
 * Displays the current git commit hash and build time in the UI footer.
 * Only visible to owners when NEXT_PUBLIC_SHOW_BUILD_HASH is set to 'true'.
 */

'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-client';

export const BuildHash: React.FC = () => {
  const { isOwner } = useAuth();
  const buildHash = process.env.NEXT_PUBLIC_GIT_SHA || process.env.NEXT_PUBLIC_BUILD_HASH || 'unknown';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown';

  // Always show to owners (no flag required)
  if (!isOwner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontSize: '10px',
        fontFamily: 'monospace',
        zIndex: 9999,
        borderRadius: '4px 0 0 0',
      }}
    >
      Build: {buildHash.substring(0, 7)} | {buildTime}
    </div>
  );
};
