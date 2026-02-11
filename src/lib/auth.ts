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
        console.log('[NextAuth] Login attempt for:', credentials?.email);
        console.log('[NextAuth] DATABASE_URL set:', !!process.env.DATABASE_URL);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[NextAuth] Missing credentials');
          return null;
        }

        // Find user by email
        let user;
        try {
          console.log('[NextAuth] Querying database for user...');
          // Note: API schema doesn't have sitterId directly, it's a relation
          // We'll get it via the sitter relation if needed
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            select: { 
              id: true, 
              email: true, 
              name: true, 
              passwordHash: true,
              orgId: true,
              role: true,
              sitter: {
                select: { id: true },
              },
            },
          });
          console.log('[NextAuth] User query result:', user ? 'Found' : 'Not found');
        } catch (error: any) {
          console.error('[NextAuth] Database error during authorize:', error);
          console.error('[NextAuth] Error message:', error?.message);
          console.error('[NextAuth] Error code:', error?.code);
          console.error('[NextAuth] Error stack:', error?.stack);
          return null;
        }

        if (!user) {
          console.log('[NextAuth] User not found in database');
          return null;
        }

        console.log('[NextAuth] User found, checking password...');
        console.log('[NextAuth] User has passwordHash:', !!user.passwordHash);

        // Check password (if passwordHash exists)
        if (user.passwordHash) {
          try {
            const isValid = await bcrypt.compare(
              credentials.password as string,
              user.passwordHash
            );
            console.log('[NextAuth] Password comparison result:', isValid);
            if (!isValid) {
              // For E2E tests, allow bypassing password when E2E_AUTH is enabled
              // This allows deterministic E2E authentication without password verification
              if (process.env.ENABLE_E2E_AUTH === 'true' || process.env.NODE_ENV === 'test') {
                // Allow login for E2E - password check bypassed
                console.log('[NextAuth] E2E auth enabled - bypassing password check for:', user.email);
              } else {
                console.log('[NextAuth] Password invalid');
                return null;
              }
            }
          } catch (error: any) {
            console.error('[NextAuth] Password comparison error:', error);
            return null;
          }
        } else {
          console.log('[NextAuth] No password hash found for user');
          // For users without password hash (legacy/admin setup), allow login for now
          // TODO: Phase 2.3 - enforce password setup
        }

        console.log('[NextAuth] Authentication successful for:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId,
          role: user.role,
          sitterId: user.sitter?.id || null,
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
      }
      return token;
    },
  },

  // Security - ensure secret is always defined
  secret: secretValue,
  
  // Trust proxy for Render (HTTPS behind proxy)
  trustHost: true,
});
