/**
 * BuildHash Component
 * 
 * Displays the current git commit hash and build time in the UI footer.
 * Only visible to owners when NEXT_PUBLIC_SHOW_BUILD_HASH is set to 'true'.
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';

export const BuildHash: React.FC = () => {
  const { data: session } = useSession();
  const showBuildHash = process.env.NEXT_PUBLIC_SHOW_BUILD_HASH === 'true';
  const buildHash = process.env.NEXT_PUBLIC_BUILD_HASH || 'unknown';
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown';

  // Only show to authenticated users (owners/sitters)
  // In production, you may want to check role specifically
  if (!showBuildHash || !session?.user) {
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
