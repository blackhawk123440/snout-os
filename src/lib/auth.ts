/**
 * Authentication Configuration (Gate B Phase 2.2)
 * 
 * NextAuth.js v5 configuration for Snout OS with credentials provider.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";
import { env } from "./env";
import * as bcrypt from "bcryptjs";

/**
 * NextAuth configuration with credentials provider
 */
// Ensure secret is ALWAYS defined - NextAuth requires it
const getSecret = () => {
  // Try multiple sources
  const secret = 
    process.env.NEXTAUTH_SECRET || 
    env.NEXTAUTH_SECRET || 
    (process.env.NODE_ENV === 'development' 
      ? 'dev-secret-key-change-in-production-min-32-chars' 
      : 'staging-fallback-secret-minimum-32-characters-required-for-nextauth');
  
  if (!process.env.NEXTAUTH_SECRET && !env.NEXTAUTH_SECRET) {
    console.warn('[NextAuth] WARNING: NEXTAUTH_SECRET not set in environment, using fallback.');
    console.warn('[NextAuth] Set NEXTAUTH_SECRET in Render Environment tab to avoid this warning.');
  }
  
  return secret;
};

const secretValue = getSecret();

// Ensure NEXTAUTH_URL is trimmed (fixes Render trailing newline issue)
// NextAuth reads from process.env, so we need to set it explicitly
if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.trim();
}
// Also use trimmed value from env.ts as fallback
const nextAuthUrl = env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Session strategy - JWT required for Credentials provider
  // Force JWT sessions for deterministic E2E tests
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Cookie settings for HTTPS (production)
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Secure cookies on HTTPS
      },
    },
  },

  // Providers - credentials (email/password) for Phase 2.2
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const hasEmail = !!credentials?.email;
        const hasPassword = !!credentials?.password;
        let outcome = "unknown";
        let userFound = false;
        let userHasPasswordHash = false;
        let passwordValid: boolean | null = null;
        let bypassedPassword = false;
        const enableE2eAuth = process.env.ENABLE_E2E_AUTH === "true" || process.env.NODE_ENV === "test";

        console.log('[NextAuth] Login attempt for:', credentials?.email);
        console.log('[NextAuth] DATABASE_URL set:', !!process.env.DATABASE_URL);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[NextAuth] Missing credentials');
          outcome = "missing_credentials";
          return null;
        }

        // Find user by email
        let user;
        try {
          console.log('[NextAuth] Querying database for user...');
          // Note: API schema doesn't have sitterId directly, it's a relation
          // We'll get it via the sitter relation if needed
          // Use type assertion since Prisma client types may not match exactly
          user = await (prisma as any).user.findUnique({
            where: { email: credentials.email as string },
            select: { 
              id: true, 
              email: true, 
              name: true, 
              passwordHash: true,
              orgId: true,
              role: true,
              sitter: { select: { id: true } },
              client: { select: { id: true } },
            },
          });
          console.log('[NextAuth] User query result:', user ? 'Found' : 'Not found');
          userFound = !!user;
          userHasPasswordHash = !!user?.passwordHash;
        } catch (error: any) {
          console.error('[NextAuth] Database error during authorize:', error);
          console.error('[NextAuth] Error message:', error?.message);
          console.error('[NextAuth] Error code:', error?.code);
          console.error('[NextAuth] Error stack:', error?.stack);
          outcome = "db_error";
          return null;
        }

        if (!user) {
          console.log('[NextAuth] User not found in database');
          outcome = "user_not_found";
          return null;
        }

        console.log('[NextAuth] User found, checking password...');
        console.log('[NextAuth] User has passwordHash:', !!user.passwordHash);

        // Credentials auth requires a bcrypt password hash.
        if (user.passwordHash) {
          try {
            const isValid = await bcrypt.compare(
              credentials.password as string,
              user.passwordHash
            );
            console.log('[NextAuth] Password comparison result:', isValid);
            passwordValid = isValid;
            if (!isValid) {
              // For E2E tests, allow bypassing password when E2E_AUTH is enabled
              // This allows deterministic E2E authentication without password verification
              if (enableE2eAuth) {
                // Allow login for E2E - password check bypassed
                console.log('[NextAuth] E2E auth enabled - bypassing password check for:', user.email);
                bypassedPassword = true;
              } else {
                console.log('[NextAuth] Password invalid');
                outcome = "password_invalid";
                return null;
              }
            }
          } catch (error: any) {
            console.error('[NextAuth] Password comparison error:', error);
            outcome = "password_compare_error";
            return null;
          }
        } else {
          console.log('[NextAuth] No password hash found for user');
          outcome = "missing_password_hash";
          return null;
        }

        // Resolve clientId: from User.client relation, or by Client lookup (orgId + email)
        let clientId: string | null = (user as any).client?.id || null;
        if (!clientId && (user as any).role === 'client' && (user as any).orgId && user.email) {
          const client = await (prisma as any).client.findFirst({
            where: { orgId: (user as any).orgId, email: user.email },
            select: { id: true },
          });
          clientId = client?.id || null;
        }

        console.log('[NextAuth] Authentication successful for:', user.email);
        outcome = "success";
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: (user as any).orgId,
          role: (user as any).role,
          sitterId: (user as any).sitter?.id || null,
          clientId,
        };
      },
    }),
  ],

  // Callbacks
  callbacks: {
    async session({ session, token }: any) {
      // Ensure session.user exists (NextAuth might not create it initially)
      if (!session.user) {
        session.user = {} as any;
      }
      
      // Populate user from JWT token (no database query to avoid failures)
      // Token should have id, email, name, orgId, role, sitterId from jwt callback
      if (token) {
        if (token.id) session.user.id = token.id as string;
        if (token.email) session.user.email = token.email as string;
        if (token.name) session.user.name = token.name as string;
        if (token.orgId) (session.user as any).orgId = token.orgId;
        if (token.role) (session.user as any).role = token.role;
        if (token.sitterId) (session.user as any).sitterId = token.sitterId;
        if (token.clientId) (session.user as any).clientId = token.clientId;
      } else {
        // If token is null/undefined, NextAuth couldn't decode the JWT
        // This means our manually created JWT isn't being decoded correctly
        console.warn('[NextAuth] Session callback received null token - JWT decode may have failed');
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.orgId = (user as any).orgId;
        token.role = (user as any).role;
        token.sitterId = (user as any).sitterId;
        token.clientId = (user as any).clientId;
      }
      return token;
    },
  },

  // Security - ensure secret is always defined
  secret: secretValue,
  
  // Trust proxy for Render (HTTPS behind proxy)
  trustHost: true,
});
