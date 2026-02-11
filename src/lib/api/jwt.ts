/**
 * JWT Minting Utility for API Authentication
 * 
 * Converts NextAuth session to API JWT token for cross-domain requests.
 * Uses the API's JWT_SECRET (server-side only).
 */

import { SignJWT } from 'jose';

/**
 * Mint an API JWT token from NextAuth session data
 * 
 * @param userId - User ID from NextAuth session
 * @param orgId - Organization ID from NextAuth session
 * @param role - User role (owner/sitter)
 * @param sitterId - Optional sitter ID if user is a sitter
 * @returns JWT token string
 */
export async function mintApiJWT(params: {
  userId: string;
  orgId: string;
  role: string;
  sitterId?: string | null;
}): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured - required for API authentication');
  }

  const secret = new TextEncoder().encode(jwtSecret);
  
  // Token expires in 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  const jwt = await new SignJWT({
    userId: params.userId,
    orgId: params.orgId,
    role: params.role,
    sitterId: params.sitterId || undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setIssuer('snout-os-web')
    .setAudience('snout-os-api')
    .sign(secret);

  return jwt;
}
