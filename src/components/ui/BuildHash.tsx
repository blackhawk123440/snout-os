/**
 * BuildHash Component
 * 
 * Displays the current git commit hash in the UI footer.
 * Only visible when NEXT_PUBLIC_SHOW_BUILD_HASH is set to 'true'.
 */

'use client';

import React from 'react';

export const BuildHash: React.FC = () => {
  const showBuildHash = process.env.NEXT_PUBLIC_SHOW_BUILD_HASH === 'true';
  const buildHash = process.env.NEXT_PUBLIC_BUILD_HASH || 'unknown';

  if (!showBuildHash) {
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
      Build: {buildHash}
    </div>
  );
};
