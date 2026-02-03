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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Explicit JWT configuration
  jwt: {
    secret: secretValue,
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user by email
        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            select: { id: true, email: true, name: true, passwordHash: true, sitterId: true },
          });
        } catch (error) {
          console.error('[NextAuth] Database error during authorize:', error);
          return null;
        }

        if (!user) {
          return null;
        }

        // Check password (if passwordHash exists)
        if (user.passwordHash) {
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          if (!isValid) {
            return null;
          }
        } else {
          // For users without password hash (legacy/admin setup), allow login for now
          // TODO: Phase 2.3 - enforce password setup
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sitterId: user.sitterId, // Include sitterId in token
        };
      },
    }),
  ],

  // Callbacks
  callbacks: {
    async session({ session, token }: any) {
      // Add user ID to session from JWT token (no database query to avoid failures)
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        // sitterId is stored in token during jwt callback, no DB query needed
        if (token.sitterId) {
          (session.user as any).sitterId = token.sitterId;
        }
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        // Store sitterId in token so we don't need DB query in session callback
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
