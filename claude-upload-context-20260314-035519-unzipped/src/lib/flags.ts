/**
 * Feature Flags
 * 
 * Centralized feature flag checking for client and server components.
 * Checks both NEXT_PUBLIC_* (client-accessible) and server-only env vars.
 */

/**
 * Check if messaging V1 is enabled
 * 
 * Checks:
 * - NEXT_PUBLIC_ENABLE_MESSAGING_V1 (client-accessible)
 * - ENABLE_MESSAGING_V1 (server-only, fallback)
 * 
 * @returns true if messaging is enabled, false otherwise
 */
export function isMessagingEnabled(): boolean {
  // Check client-accessible env var first (for client components)
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_ENABLE_MESSAGING_V1 === 'true';
  }
  
  // Server-side: check both public and private env vars
  return (
    process.env.NEXT_PUBLIC_ENABLE_MESSAGING_V1 === 'true' ||
    process.env.ENABLE_MESSAGING_V1 === 'true'
  );
}

/**
 * Check if bookings V2 is enabled
 */
export const ENABLE_BOOKINGS_V2 = 
  process.env.NEXT_PUBLIC_ENABLE_BOOKINGS_V2 === 'true' ||
  process.env.ENABLE_BOOKINGS_V2 === 'true';

/**
 * Check if resonance V1 is enabled
 */
export const ENABLE_RESONANCE_V1 = 
  process.env.NEXT_PUBLIC_ENABLE_RESONANCE_V1 === 'true' ||
  process.env.ENABLE_RESONANCE_V1 === 'true';
