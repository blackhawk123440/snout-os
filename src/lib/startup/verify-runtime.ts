/**
 * Runtime verification - fail fast on critical misconfigurations.
 * Called once on server boot. Do not use in edge runtime.
 */

import { PrismaClient } from '@prisma/client';

const isProduction = process.env.NODE_ENV === 'production';

export interface VerifyResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function verifyRuntime(): Promise<VerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. DATABASE_URL + Prisma connect
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  } else {
    try {
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
    } catch (e) {
      errors.push(`Database unreachable: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2. Production: REDIS_URL required (queues + realtime are enabled)
  // Skip in CI where Redis may not be available for smoke tests
  if (isProduction && !process.env.REDIS_URL && process.env.CI !== 'true') {
    errors.push('REDIS_URL is required in production (queues and realtime depend on it)');
  }

  // 3. Stripe: if any Stripe key present, require both (relax in smoke/e2e mode)
  const isSmokeOrE2E =
    process.env.SMOKE === 'true' ||
    (process.env.CI === 'true' && process.env.ENABLE_E2E_LOGIN === 'true');
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  const hasStripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  if (hasStripeKey || hasStripeWebhook) {
    if (!hasStripeKey && !isSmokeOrE2E) {
      errors.push('STRIPE_SECRET_KEY required when Stripe webhook is configured');
    }
    if (!hasStripeWebhook && !isSmokeOrE2E) {
      errors.push('STRIPE_WEBHOOK_SECRET required when Stripe is configured');
    }
  }

  // 4. S3: if any S3 var present, require all
  const hasS3Bucket = !!process.env.S3_BUCKET;
  const hasS3Region = !!process.env.S3_REGION;
  const hasS3Access = !!process.env.S3_ACCESS_KEY_ID;
  const hasS3Secret = !!process.env.S3_SECRET_ACCESS_KEY;
  const anyS3 = hasS3Bucket || hasS3Region || hasS3Access || hasS3Secret;
  if (anyS3) {
    if (!hasS3Bucket) errors.push('S3_BUCKET required when S3 is configured');
    if (!hasS3Region) errors.push('S3_REGION required when S3 is configured');
    if (!hasS3Access) errors.push('S3_ACCESS_KEY_ID required when S3 is configured');
    if (!hasS3Secret) errors.push('S3_SECRET_ACCESS_KEY required when S3 is configured');
  }

  // 5. NEXTAUTH in production
  if (isProduction) {
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters in production');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
