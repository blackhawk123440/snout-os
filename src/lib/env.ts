/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  OPENPHONE_API_KEY: process.env.OPENPHONE_API_KEY,
} as const;

const optionalEnvVars = {
  PORT: process.env.PORT || "3000",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  OPENPHONE_NUMBER_ID: process.env.OPENPHONE_NUMBER_ID,
  OPENPHONE_WEBHOOK_SECRET: process.env.OPENPHONE_WEBHOOK_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  OWNER_PHONE: process.env.OWNER_PHONE,
  OWNER_PERSONAL_PHONE: process.env.OWNER_PERSONAL_PHONE,
  OWNER_OPENPHONE_PHONE: process.env.OWNER_OPENPHONE_PHONE,
  // Gate B Phase 1: Auth feature flags (all default to false for zero-risk deployment)
  ENABLE_AUTH_PROTECTION: process.env.ENABLE_AUTH_PROTECTION === "true",
  ENABLE_SITTER_AUTH: process.env.ENABLE_SITTER_AUTH === "true",
  ENABLE_PERMISSION_CHECKS: process.env.ENABLE_PERMISSION_CHECKS === "true",
  ENABLE_WEBHOOK_VALIDATION: process.env.ENABLE_WEBHOOK_VALIDATION === "true",
  // Phase 1: Form mapping layer (default to false for zero-risk deployment)
  ENABLE_FORM_MAPPER_V1: process.env.ENABLE_FORM_MAPPER_V1 === "true",
  // Phase 2: Pricing engine v1 (default to false for zero-risk deployment)
  USE_PRICING_ENGINE_V1: process.env.USE_PRICING_ENGINE_V1 === "true",
  // Messaging Master Spec V1 (default to false for zero-risk deployment)
  ENABLE_MESSAGING_V1: process.env.ENABLE_MESSAGING_V1 === "true",
  // Phase 4.3: Proactive thread creation (default to false for zero-risk deployment)
  ENABLE_PROACTIVE_THREAD_CREATION: process.env.ENABLE_PROACTIVE_THREAD_CREATION === "true",
  // Phase 4.2: Sitter messages UI (default to false for zero-risk deployment)
  ENABLE_SITTER_MESSAGES_V1: process.env.ENABLE_SITTER_MESSAGES_V1 === "true",
  // Debug endpoints (default to false for security)
  ENABLE_DEBUG_ENDPOINTS: process.env.ENABLE_DEBUG_ENDPOINTS === "true",
  // Twilio configuration (required when ENABLE_MESSAGING_V1 is true)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WEBHOOK_AUTH_TOKEN: process.env.TWILIO_WEBHOOK_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
  TWILIO_PROXY_SERVICE_SID: process.env.TWILIO_PROXY_SERVICE_SID, // Gate 2: For masking/routing
  TWILIO_WEBHOOK_URL: process.env.TWILIO_WEBHOOK_URL,
  // Base URL for webhooks (falls back to NEXT_PUBLIC_APP_URL)
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  // Auth configuration (optional until flags enabled)
  // Trim whitespace/newlines from NEXTAUTH_URL (common Render issue)
  NEXTAUTH_URL: (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim(),
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'dev-secret-key-change-in-production' : undefined),
  // Chaos mode (staging/dev only, requires explicit opt-in)
  ALLOW_CHAOS_MODE: process.env.ALLOW_CHAOS_MODE,
} as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env file or .env.local file"
    );
    // Don't throw - allow app to start but log warning
    // Individual API routes will handle missing env vars gracefully
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/9e5ae23b-cce3-4d45-9753-b6e23d53220c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H2',location:'src/lib/env.ts:82',message:'validateEnv result',data:{missing,missingCount:missing.length,nodeEnv:process.env.NODE_ENV || 'NOT SET'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return {
    ...requiredEnvVars,
    ...optionalEnvVars,
  };
}

// Export validated environment (will warn but not throw if invalid)
export const env = validateEnv();


