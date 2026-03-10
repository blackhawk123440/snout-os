/**
 * Environment variable parsing and validation.
 *
 * Production runs fail closed:
 * - auth/permission/webhook flags are forced on
 * - critical secrets become mandatory and throw at startup if missing
 */

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return value.toLowerCase() === 'true';
}

function forceEnabledInProduction(explicit: boolean, isProduction: boolean): boolean {
  return isProduction ? true : explicit;
}

export function validateEnv(runtimeEnv: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = runtimeEnv.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const missing: string[] = [];
  const warnings: string[] = [];

  const enableAuthProtection = forceEnabledInProduction(
    parseBoolean(runtimeEnv.ENABLE_AUTH_PROTECTION, false),
    isProduction
  );
  const enablePermissionChecks = forceEnabledInProduction(
    parseBoolean(runtimeEnv.ENABLE_PERMISSION_CHECKS, false),
    isProduction
  );
  const enableWebhookValidation = forceEnabledInProduction(
    parseBoolean(runtimeEnv.ENABLE_WEBHOOK_VALIDATION, true),
    isProduction
  );

  const nextAuthSecret = runtimeEnv.NEXTAUTH_SECRET;
  const stripeWebhookSecret = runtimeEnv.STRIPE_WEBHOOK_SECRET;
  const twilioAuthToken = runtimeEnv.TWILIO_AUTH_TOKEN;
  const twilioWebhookAuthToken = runtimeEnv.TWILIO_WEBHOOK_AUTH_TOKEN;

  const stripeRoutesEnabled =
    parseBoolean(runtimeEnv.ENABLE_STRIPE_WEBHOOKS, false) ||
    Boolean(runtimeEnv.STRIPE_SECRET_KEY) ||
    Boolean(stripeWebhookSecret);
  const twilioRoutesEnabled =
    parseBoolean(runtimeEnv.ENABLE_TWILIO_WEBHOOKS, false) ||
    parseBoolean(runtimeEnv.ENABLE_MESSAGING_V1, false) ||
    Boolean(runtimeEnv.TWILIO_ACCOUNT_SID) ||
    Boolean(runtimeEnv.TWILIO_PHONE_NUMBER);

  if (!runtimeEnv.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (isProduction) {
    if (!nextAuthSecret) {
      missing.push('NEXTAUTH_SECRET');
    } else if (nextAuthSecret.length < 32) {
      missing.push('NEXTAUTH_SECRET (must be >= 32 chars)');
    }
    if (stripeRoutesEnabled && !stripeWebhookSecret) {
      missing.push('STRIPE_WEBHOOK_SECRET (required when Stripe routes are enabled)');
    }
    if (twilioRoutesEnabled && !twilioAuthToken) {
      missing.push('TWILIO_AUTH_TOKEN (required when Twilio routes are enabled)');
    }
    if (twilioRoutesEnabled && !twilioWebhookAuthToken) {
      missing.push('TWILIO_WEBHOOK_AUTH_TOKEN (required when Twilio routes are enabled)');
    }
  } else {
    if (!nextAuthSecret) {
      warnings.push('NEXTAUTH_SECRET is not set (allowed outside production).');
    }
    if (stripeRoutesEnabled && !stripeWebhookSecret) {
      warnings.push('STRIPE_WEBHOOK_SECRET is not set (Stripe signature checks may be bypassed).');
    }
    if (twilioRoutesEnabled && (!twilioAuthToken || !twilioWebhookAuthToken)) {
      warnings.push('Twilio tokens are incomplete (webhook signature checks may be bypassed).');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (warnings.length > 0) {
    console.warn(warnings.join('\n'));
  }

  return {
    NODE_ENV: nodeEnv,
    DATABASE_URL: runtimeEnv.DATABASE_URL,
    PORT: runtimeEnv.PORT || '3000',
    NEXT_PUBLIC_APP_URL: runtimeEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_BASE_URL: runtimeEnv.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    NEXT_PUBLIC_PERSONAL_MODE: parseBoolean(runtimeEnv.NEXT_PUBLIC_PERSONAL_MODE, false),
    PERSONAL_ORG_ID: runtimeEnv.PERSONAL_ORG_ID || 'default',
    PERSONAL_BRAND_NAME: runtimeEnv.PERSONAL_BRAND_NAME,
    PERSONAL_PRIMARY_COLOR: runtimeEnv.PERSONAL_PRIMARY_COLOR,
    OPENPHONE_NUMBER_ID: runtimeEnv.OPENPHONE_NUMBER_ID,
    OPENPHONE_WEBHOOK_SECRET: runtimeEnv.OPENPHONE_WEBHOOK_SECRET,
    STRIPE_SECRET_KEY: runtimeEnv.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: runtimeEnv.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
    REDIS_URL: runtimeEnv.REDIS_URL || 'redis://localhost:6379',
    S3_BUCKET: runtimeEnv.S3_BUCKET,
    S3_REGION: runtimeEnv.S3_REGION,
    S3_ACCESS_KEY_ID: runtimeEnv.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: runtimeEnv.S3_SECRET_ACCESS_KEY,
    OWNER_PHONE: runtimeEnv.OWNER_PHONE,
    OWNER_PERSONAL_PHONE: runtimeEnv.OWNER_PERSONAL_PHONE,
    OWNER_OPENPHONE_PHONE: runtimeEnv.OWNER_OPENPHONE_PHONE,
    ENABLE_AUTH_PROTECTION: enableAuthProtection,
    ENABLE_SITTER_AUTH: parseBoolean(runtimeEnv.ENABLE_SITTER_AUTH, false),
    ENABLE_PERMISSION_CHECKS: enablePermissionChecks,
    ENABLE_WEBHOOK_VALIDATION: enableWebhookValidation,
    ENABLE_FORM_MAPPER_V1: parseBoolean(runtimeEnv.ENABLE_FORM_MAPPER_V1, false),
    USE_PRICING_ENGINE_V1: parseBoolean(runtimeEnv.USE_PRICING_ENGINE_V1, false),
    ENABLE_MESSAGING_V1: parseBoolean(runtimeEnv.ENABLE_MESSAGING_V1, false),
    ENABLE_PROACTIVE_THREAD_CREATION: parseBoolean(runtimeEnv.ENABLE_PROACTIVE_THREAD_CREATION, false),
    ENABLE_SITTER_MESSAGES_V1: parseBoolean(runtimeEnv.ENABLE_SITTER_MESSAGES_V1, false),
    ENABLE_DEBUG_ENDPOINTS: parseBoolean(runtimeEnv.ENABLE_DEBUG_ENDPOINTS, false),
    TWILIO_ACCOUNT_SID: runtimeEnv.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: twilioAuthToken,
    TWILIO_WEBHOOK_AUTH_TOKEN: twilioWebhookAuthToken,
    TWILIO_PHONE_NUMBER: runtimeEnv.TWILIO_PHONE_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID: runtimeEnv.TWILIO_MESSAGING_SERVICE_SID,
    TWILIO_PROXY_SERVICE_SID: runtimeEnv.TWILIO_PROXY_SERVICE_SID,
    TWILIO_WEBHOOK_URL: runtimeEnv.TWILIO_WEBHOOK_URL,
    WEBHOOK_BASE_URL:
      runtimeEnv.WEBHOOK_BASE_URL ||
      runtimeEnv.NEXT_PUBLIC_BASE_URL ||
      runtimeEnv.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000',
    PUBLIC_BASE_URL:
      runtimeEnv.PUBLIC_BASE_URL ||
      runtimeEnv.NEXT_PUBLIC_BASE_URL ||
      runtimeEnv.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000',
    NEXTAUTH_URL: (runtimeEnv.NEXTAUTH_URL || runtimeEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim(),
    NEXTAUTH_SECRET: nextAuthSecret,
    ALLOW_CHAOS_MODE: runtimeEnv.ALLOW_CHAOS_MODE,
    GOOGLE_CLIENT_ID: runtimeEnv.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: runtimeEnv.GOOGLE_CLIENT_SECRET,
    STRIPE_ROUTES_ENABLED: stripeRoutesEnabled,
    TWILIO_ROUTES_ENABLED: twilioRoutesEnabled,
    IS_PRODUCTION: isProduction,
  };
}

export const env = validateEnv();


