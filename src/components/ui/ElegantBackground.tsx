'use client';

import React from 'react';

/**
 * Elegant, professional background for pet sitting business
 * Subtle, refined, sophisticated - no flashy effects
 */
export function ElegantBackground() {
  return (
    <>
      {/* Elegant light background with subtle gradients */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(252, 225, 239, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(254, 236, 244, 0.06) 0%, transparent 50%),
            linear-gradient(180deg, #ffffff 0%, #fefefe 100%)
          `,
          opacity: 1,
        }}
      />
      {/* Subtle texture overlay for depth */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fce1ef' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />
    </>
  );
}

