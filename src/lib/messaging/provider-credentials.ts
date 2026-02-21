/**
 * Provider Credentials Helper
 * 
 * Resolves provider credentials from database (encrypted) with env fallback.
 * Used by TwilioProvider and other provider services.
 */

import { prisma } from "@/lib/db";
import { decrypt } from "./encryption";
import { env } from "@/lib/env";

export interface ProviderCredentials {
  accountSid: string;
  authToken: string;
  source: 'database' | 'environment';
}

/**
 * Get provider credentials for an organization
 * 
 * Priority:
 * 1. Database (encrypted) - production
 * 2. Environment variables - development fallback
 * 
 * @param orgId - Organization ID
 * @returns Provider credentials or null if not configured
 */
export async function getProviderCredentials(orgId: string): Promise<ProviderCredentials | null> {
  try {
    const credential = await prisma.providerCredential.findUnique({
      where: { orgId },
    });

  if (!credential) {
      return env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
        ? {
            accountSid: String(env.TWILIO_ACCOUNT_SID).trim(),
            authToken: String(env.TWILIO_AUTH_TOKEN).trim(),
            source: 'environment',
          }
        : null;
    }
    const decrypted = decrypt(credential.encryptedConfig);
    const config = JSON.parse(decrypted);
    return {
      accountSid: String(config.accountSid ?? '').trim(),
      authToken: String(config.authToken ?? '').trim(),
      source: 'database',
    };
  } catch (error) {
    console.error('[provider-credentials] Failed to load/decrypt credentials:', error);
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      return {
        accountSid: String(env.TWILIO_ACCOUNT_SID).trim(),
        authToken: String(env.TWILIO_AUTH_TOKEN).trim(),
        source: 'environment',
      };
    }
    return null;
  }
}
