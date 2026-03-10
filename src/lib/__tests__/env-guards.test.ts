import { describe, expect, it } from 'vitest';
import { validateEnv } from '@/lib/env';

describe('env production guards', () => {
  it('forces security flags in production even when env says false', () => {
    const parsed = validateEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://db',
      NEXTAUTH_SECRET: 'x'.repeat(32),
      STRIPE_SECRET_KEY: 'sk_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      ENABLE_AUTH_PROTECTION: 'false',
      ENABLE_PERMISSION_CHECKS: 'false',
      ENABLE_WEBHOOK_VALIDATION: 'false',
    });

    expect(parsed.ENABLE_AUTH_PROTECTION).toBe(true);
    expect(parsed.ENABLE_PERMISSION_CHECKS).toBe(true);
    expect(parsed.ENABLE_WEBHOOK_VALIDATION).toBe(true);
  });

  it('fails closed in production when NEXTAUTH_SECRET is missing', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
      })
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it('requires Stripe webhook secret when Stripe routes are enabled in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
        NEXTAUTH_SECRET: 'x'.repeat(32),
        STRIPE_SECRET_KEY: 'sk_test',
      })
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it('requires Twilio auth + webhook tokens when Twilio routes are enabled in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://db',
        NEXTAUTH_SECRET: 'x'.repeat(32),
        ENABLE_MESSAGING_V1: 'true',
      })
    ).toThrow(/TWILIO_AUTH_TOKEN/);
  });

  it('keeps dev mode permissive for local iteration', () => {
    const parsed = validateEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://db',
      ENABLE_AUTH_PROTECTION: 'false',
      ENABLE_PERMISSION_CHECKS: 'false',
      ENABLE_WEBHOOK_VALIDATION: 'false',
    });
    expect(parsed.ENABLE_AUTH_PROTECTION).toBe(false);
    expect(parsed.ENABLE_PERMISSION_CHECKS).toBe(false);
    expect(parsed.ENABLE_WEBHOOK_VALIDATION).toBe(false);
  });
});
