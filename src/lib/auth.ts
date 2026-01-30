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
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Session strategy - JWT required for Credentials provider
  session: {
    strategy: "jwt",
  },

  // Custom pages
  pages: {
    signIn: "/login",
    error: "/login",
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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

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
        };
      },
    }),
  ],

  // Callbacks
  callbacks: {
    async session({ session, token }: any) {
      // Add user ID to session from JWT token
      if (session.user && token) {
        session.user.id = token.id;
        session.user.email = token.email;
        
        // Get user from database to include sitterId
        if (token.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { id: true, email: true, name: true, sitterId: true },
          });
          if (dbUser) {
            session.user.id = dbUser.id;
            session.user.email = dbUser.email;
            session.user.name = dbUser.name;
            (session.user as any).sitterId = dbUser.sitterId;
          }
        }
      }
      return session;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
  },

  // Security
  secret: env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined),
});
