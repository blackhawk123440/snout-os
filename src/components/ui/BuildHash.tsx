/**
 * BuildHash Component
 * 
 * Displays the current git commit hash and build time in the UI footer.
 * Falls back to /api/ops/build if env vars are not available.
 * Only visible to owners.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-client';

export const BuildHash: React.FC = () => {
  const { isOwner } = useAuth();
  const [buildInfo, setBuildInfo] = useState<{ gitSha: string; buildTime: string }>({
    gitSha: process.env.NEXT_PUBLIC_GIT_SHA || process.env.NEXT_PUBLIC_BUILD_HASH || 'loading...',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'loading...',
  });

  useEffect(() => {
    // If env vars are missing, fetch from server endpoint
    if (buildInfo.gitSha === 'loading...' || buildInfo.gitSha === 'unknown') {
      fetch('/api/ops/build')
        .then(res => res.json())
        .then(data => {
          setBuildInfo({
            gitSha: data.gitSha || 'unknown',
            buildTime: data.buildTime || 'unknown',
          });
        })
        .catch(() => {
          setBuildInfo({
            gitSha: 'unknown',
            buildTime: 'unknown',
          });
        });
    }
  }, []);

  // Always show to owners (no flag required)
  if (!isOwner) {
    return null;
  }

  const displaySha = buildInfo.gitSha === 'unknown' ? 'unknown' : buildInfo.gitSha.substring(0, 7);

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
      Build: {displaySha} | {buildInfo.buildTime === 'unknown' ? 'unknown' : new Date(buildInfo.buildTime).toLocaleString()}
    </div>
  );
};
