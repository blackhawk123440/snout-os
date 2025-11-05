"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface IntegrationStatus {
  name: string;
  status: "working" | "not_configured" | "error" | "testing";
  message: string;
  credentials: Array<{
    key: string;
    value: string;
    required: boolean;
    description: string;
    whereToGet: string;
  }>;
  webhookUrl?: string;
  setupSteps: string[];
  icon: string;
  color: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    
    // Check all integrations
    const [stripeStatus, openphoneStatus, databaseStatus, googleCalendarStatus] = await Promise.all([
      checkStripe(),
      checkOpenPhone(),
      checkDatabase(),
      checkGoogleCalendar(),
    ]);

    setIntegrations([
      {
        name: "Stripe Payments",
        status: stripeStatus.status,
        message: stripeStatus.message,
        credentials: [
          {
            key: "STRIPE_SECRET_KEY",
            value: stripeStatus.details?.secretKeyConfigured ? "✅ Set" : "❌ Not set",
            required: true,
            description: "Your Stripe secret key (starts with sk_live_ for production)",
            whereToGet: "Stripe Dashboard → Developers → API Keys → Secret key"
          },
          {
            key: "STRIPE_PUBLISHABLE_KEY",
            value: stripeStatus.details?.publishableKeyConfigured ? "✅ Set" : "❌ Not set",
            required: true,
            description: "Your Stripe publishable key (starts with pk_live_ for production)",
            whereToGet: "Stripe Dashboard → Developers → API Keys → Publishable key"
          },
          {
            key: "STRIPE_WEBHOOK_SECRET",
            value: stripeStatus.details?.webhookSecretConfigured ? "✅ Set" : "❌ Not set",
            required: false,
            description: "Webhook signing secret for payment confirmations",
            whereToGet: "Stripe Dashboard → Developers → Webhooks → Add endpoint → Signing secret"
          }
        ],
        webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/stripe`,
        setupSteps: [
          "1. Sign up for Stripe at https://stripe.com",
          "2. Go to Developers → API Keys",
          "3. Copy your Secret Key (sk_live_...) and Publishable Key (pk_live_...)",
          "4. Add them to your .env.local file as STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY",
          "5. Go to Developers → Webhooks",
          "6. Click 'Add endpoint' and enter: https://yourdomain.com/api/webhooks/stripe",
          "7. Select events: payment_intent.succeeded, invoice.payment_succeeded",
          "8. Copy the webhook signing secret and add as STRIPE_WEBHOOK_SECRET in .env.local",
          "9. Set up your products in Stripe (see product IDs below)"
        ],
        icon: "fa-credit-card",
        color: "#635BFF"
      },
      {
        name: "OpenPhone SMS",
        status: openphoneStatus.status,
        message: openphoneStatus.message,
        credentials: [
          {
            key: "OPENPHONE_API_KEY",
            value: openphoneStatus.details?.apiKeyConfigured ? (openphoneStatus.status === "error" ? "⚠️ Set but invalid" : "✅ Set") : "❌ Not set",
            required: true,
            description: "Your OpenPhone API key (should be 40+ characters long)",
            whereToGet: "OpenPhone Dashboard → Settings → API → Generate API Key (copy the COMPLETE key)"
          },
          {
            key: "OPENPHONE_NUMBER_ID",
            value: openphoneStatus.details?.numberIdConfigured ? "✅ Set" : "❌ Not set",
            required: true,
            description: "The ID of your OpenPhone phone number",
            whereToGet: "OpenPhone Dashboard → Numbers → Select your number → Copy ID from URL or API"
          }
        ],
        webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/sms`,
        setupSteps: [
          "1. Sign up for OpenPhone at https://www.openphone.com",
          "2. Purchase a phone number",
          "3. Go to Settings → API",
          "4. Generate an API key",
          "5. Copy your phone number ID (found in the API or in your number settings)",
          "6. Add OPENPHONE_API_KEY and OPENPHONE_NUMBER_ID to your .env.local file",
          "7. Go to Settings → Webhooks",
          "8. Add webhook URL: https://yourdomain.com/api/webhooks/sms",
          "9. Select events: message.received"
        ],
        icon: "fa-phone",
        color: "#00D9FF"
      },
      {
        name: "Database (PostgreSQL)",
        status: databaseStatus.status,
        message: databaseStatus.message,
        credentials: [
          {
            key: "DATABASE_URL",
            value: databaseStatus.details?.databaseUrlConfigured ? "✅ Set" : "❌ Not set",
            required: true,
            description: "PostgreSQL connection string",
            whereToGet: "Your hosting provider (Render, Railway, etc.) → Database → Connection String"
          }
        ],
        setupSteps: [
          "1. Set up a PostgreSQL database (Render, Railway, Supabase, etc.)",
          "2. Copy your database connection string",
          "3. Add DATABASE_URL to your .env.local file",
          "4. Run: npm run db:push (to create tables)",
          "5. Run: npm run db:seed (to seed initial data)"
        ],
        icon: "fa-database",
        color: "#336791"
      },
      {
        name: "Google Calendar (Optional)",
        status: googleCalendarStatus.status,
        message: googleCalendarStatus.message,
        credentials: [
          {
            key: "GOOGLE_CLIENT_ID",
            value: googleCalendarStatus.details?.clientIdConfigured ? "✅ Set" : "❌ Not set",
            required: false,
            description: "Google OAuth Client ID",
            whereToGet: "Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client"
          },
          {
            key: "GOOGLE_CLIENT_SECRET",
            value: googleCalendarStatus.details?.clientSecretConfigured ? "✅ Set" : "❌ Not set",
            required: false,
            description: "Google OAuth Client Secret",
            whereToGet: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Client Secret"
          }
        ],
        setupSteps: [
          "1. Go to https://console.cloud.google.com",
          "2. Create a new project",
          "3. Enable Google Calendar API",
          "4. Go to APIs & Services → Credentials",
          "5. Create OAuth 2.0 Client ID",
          "6. Add authorized redirect URIs: https://yourdomain.com/api/calendar/accounts",
          "7. Copy Client ID and Client Secret",
          "8. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local"
        ],
        icon: "fa-calendar",
        color: "#4285F4"
      }
    ]);
    
    setLoading(false);
  };

  const checkStripe = async (): Promise<{ status: "working" | "not_configured" | "error" | "testing", message: string, details?: any }> => {
    try {
      const response = await fetch("/api/integrations/test/stripe");
      const data = await response.json();
      if (data.working) {
        return { status: "working", message: data.message || "Stripe is connected and working", details: data.details };
      }
      return { status: data.status || "not_configured", message: data.message || "Stripe is not configured", details: data.details };
    } catch (error) {
      return { status: "error", message: "Failed to test Stripe connection" };
    }
  };

  const checkOpenPhone = async (): Promise<{ status: "working" | "not_configured" | "error" | "testing", message: string, details?: any }> => {
    try {
      const response = await fetch("/api/integrations/test/openphone");
      if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        status: "error", 
        message: `Failed to test OpenPhone: HTTP ${response.status} - ${errorData.message || "Unauthorized"}`,
        details: { 
          statusCode: response.status,
          error: errorData.message || "Invalid API key",
          help: "Please verify your OPENPHONE_API_KEY in the OpenPhone dashboard and update .env.local"
        }
      };
      }
      const data = await response.json();
      if (data.working) {
        return { status: "working", message: data.message || "OpenPhone is connected and working", details: data.details };
      }
      return { status: data.status || "not_configured", message: data.message || "OpenPhone is not configured", details: data.details };
    } catch (error: any) {
      return { 
        status: "error", 
        message: `Failed to test OpenPhone connection: ${error.message || "Network error"}`,
        details: { error: error.message }
      };
    }
  };

  const checkDatabase = async (): Promise<{ status: "working" | "not_configured" | "error" | "testing", message: string, details?: any }> => {
    try {
      const response = await fetch("/api/integrations/test/database");
      const data = await response.json();
      if (data.working) {
        return { status: "working", message: data.message || "Database is connected and working", details: data.details };
      }
      return { status: data.status || "not_configured", message: data.message || "Database is not configured", details: data.details };
    } catch (error) {
      return { status: "error", message: "Failed to test database connection" };
    }
  };

  const checkGoogleCalendar = async (): Promise<{ status: "working" | "not_configured" | "error" | "testing", message: string, details?: any }> => {
    try {
      const response = await fetch("/api/integrations/test/google-calendar");
      const data = await response.json();
      if (data.working) {
        return { status: "working", message: data.message || "Google Calendar is connected", details: data.details };
      }
      return { status: data.status || "not_configured", message: data.message || "Google Calendar is not configured (optional)", details: data.details };
    } catch (error) {
      return { status: "not_configured", message: "Google Calendar is optional and not configured" };
    }
  };

  const testIntegration = async (integrationName: string) => {
    setTesting(prev => ({ ...prev, [integrationName]: true }));
    
    // Reload integrations to get fresh status
    await loadIntegrations();
    
    setTesting(prev => ({ ...prev, [integrationName]: false }));
  };

  const startEdit = (integrationName: string, credKey: string, currentValue: string) => {
    setEditing(prev => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        [credKey]: currentValue.replace("✅ Set", "").replace("❌ Not set", "").trim(),
      }
    }));
  };

  const cancelEdit = (integrationName: string, credKey: string) => {
    setEditing(prev => {
      const updated = { ...prev };
      if (updated[integrationName]) {
        const { [credKey]: removed, ...rest } = updated[integrationName];
        updated[integrationName] = rest;
        if (Object.keys(rest).length === 0) {
          delete updated[integrationName];
        }
      }
      return updated;
    });
  };

  const saveCredential = async (integrationName: string, credKey: string) => {
    const value = editing[integrationName]?.[credKey];
    if (value === undefined) return;

    setSaving(prev => ({ ...prev, [integrationName]: true }));

    try {
      const response = await fetch("/api/integrations/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: credKey,
          value: value,
        }),
      });

      if (response.ok) {
        alert(`${credKey} saved successfully! Note: You may need to restart your server for environment variable changes to take effect.`);
        cancelEdit(integrationName, credKey);
        // Reload to get updated status
        await loadIntegrations();
      } else {
        const data = await response.json();
        alert(`Failed to save: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Failed to save credential");
    }

    setSaving(prev => ({ ...prev, [integrationName]: false }));
  };

  const updateEditingValue = (integrationName: string, credKey: string, value: string) => {
    setEditing(prev => ({
      ...prev,
      [integrationName]: {
        ...prev[integrationName],
        [credKey]: value,
      }
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "working":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">
            <i className="fas fa-check-circle mr-1"></i> Working
          </span>
        );
      case "not_configured":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
            <i className="fas fa-exclamation-triangle mr-1"></i> Not Configured
          </span>
        );
      case "error":
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">
            <i className="fas fa-times-circle mr-1"></i> Error
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
            <i className="fas fa-question-circle mr-1"></i> Unknown
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-4xl mb-4" style={{ color: COLORS.primary }}></i>
            <p className="text-lg font-semibold" style={{ color: COLORS.primary }}>Loading integrations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>
                <i className="fas fa-plug mr-3"></i>Integrations Dashboard
              </h1>
              <p className="text-gray-600">Manage and test all your third-party integrations</p>
            </div>
            <Link
              href="/automation"
              className="px-4 py-2 font-bold rounded-lg transition-all touch-manipulation min-h-[44px] sm:min-h-[auto] flex items-center gap-2"
              style={{ background: COLORS.primaryLight, color: COLORS.primary }}
            >
              <i className="fas fa-robot"></i>
              <span className="hidden sm:inline">Automation</span>
            </Link>
          </div>
        </div>

        {/* Stripe Product IDs Reference */}
        <div className="bg-white rounded-lg p-6 mb-8 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
            <i className="fas fa-list mr-2"></i>Stripe Product IDs Reference
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_Rl01hX4ZnMjyUw</code>
                <span className="text-sm text-gray-600">30 min Drop-in</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_ShJTVMShHBwi0o</code>
                <span className="text-sm text-gray-600">60 min Drop-in</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_Rl026cvNa4BMWR</code>
                <span className="text-sm text-gray-600">30 min Walk</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_TL04HXcE0bnF0P</code>
                <span className="text-sm text-gray-600">60 min Walk</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_Rl02B1KaOPO5pt</code>
                <span className="text-sm text-gray-600">House Sitting</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_ShJRl7fx9eG6Q8</code>
                <span className="text-sm text-gray-600">24/7 Care</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_ShJPPmGgqrJoFL</code>
                <span className="text-sm text-gray-600">Additional Pet (Drop/Walk/Taxi)</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">prod_ShJNSDo3hN9JDj</code>
                <span className="text-sm text-gray-600">Additional Pet (House/24-7)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations List */}
        <div className="space-y-6">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="bg-white rounded-lg p-6 border-2 transition-all hover:shadow-lg"
              style={{ borderColor: COLORS.primaryLight }}
            >
              {/* Integration Header */}
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                    style={{ background: integration.color }}
                  >
                    <i className={`fas ${integration.icon}`}></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                      {integration.name}
                    </h2>
                    <p className="text-sm text-gray-600">{integration.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(integration.status)}
                  <button
                    onClick={() => testIntegration(integration.name)}
                    disabled={testing[integration.name]}
                    className="px-4 py-2 text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] sm:min-h-[auto] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      background: testing[integration.name] ? COLORS.secondary : COLORS.primary, 
                      color: COLORS.white 
                    }}
                  >
                    {testing[integration.name] ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sync-alt"></i>
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Credentials */}
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: COLORS.primary }}>
                  Required Credentials
                </h3>
                <div className="space-y-3">
                  {integration.credentials.map((cred) => {
                    const isEditing = editing[integration.name]?.[cred.key] !== undefined;
                    const editValue = editing[integration.name]?.[cred.key] || "";
                    const isSaving = saving[integration.name];

                    return (
                      <div
                        key={cred.key}
                        className="p-3 rounded-lg border-2"
                        style={{ borderColor: cred.required ? COLORS.primaryLight : COLORS.secondary }}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-mono font-bold" style={{ color: COLORS.primary }}>
                                {cred.key}
                              </code>
                              {cred.required && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{cred.description}</p>
                            <p className="text-xs text-gray-500 mb-2">
                              <i className="fas fa-info-circle mr-1"></i>
                              Where to get: {cred.whereToGet}
                            </p>
                            {isEditing ? (
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type={cred.key.toLowerCase().includes("secret") || cred.key.toLowerCase().includes("key") ? "password" : "text"}
                                  value={editValue}
                                  onChange={(e) => updateEditingValue(integration.name, cred.key, e.target.value)}
                                  className="flex-1 px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2"
                                  style={{ borderColor: COLORS.primaryLight }}
                                  placeholder={`Enter ${cred.key}`}
                                  disabled={isSaving}
                                />
                                <button
                                  onClick={() => saveCredential(integration.name, cred.key)}
                                  disabled={isSaving}
                                  className="px-3 py-2 text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] sm:min-h-[auto] disabled:opacity-50"
                                  style={{ background: COLORS.primary, color: COLORS.white }}
                                >
                                  {isSaving ? (
                                    <i className="fas fa-spinner fa-spin"></i>
                                  ) : (
                                    <i className="fas fa-check"></i>
                                  )}
                                </button>
                                <button
                                  onClick={() => cancelEdit(integration.name, cred.key)}
                                  disabled={isSaving}
                                  className="px-3 py-2 text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] sm:min-h-[auto] disabled:opacity-50"
                                  style={{ background: COLORS.secondary, color: COLORS.primary }}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-2">
                                <div className={`text-sm font-semibold flex-1 px-3 py-2 rounded-lg ${
                                  cred.value.includes("✅") ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-600"
                                }`}>
                                  {cred.value.includes("✅") ? (
                                    <span className="flex items-center gap-2">
                                      <i className="fas fa-check-circle"></i>
                                      <span>Set (hidden for security)</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <i className="fas fa-times-circle"></i>
                                      <span>Not set</span>
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => startEdit(integration.name, cred.key, cred.value)}
                                  className="px-3 py-2 text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] sm:min-h-[auto] hover:opacity-90"
                                  style={{ background: COLORS.primary, color: COLORS.white }}
                                  title="Edit credential"
                                >
                                  <i className="fas fa-edit"></i>
                                  <span className="hidden sm:inline ml-2">Edit</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Webhook URL */}
              {integration.webhookUrl && (
                <div className="mb-4 p-3 rounded-lg" style={{ background: COLORS.primaryLight }}>
                  <h3 className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: COLORS.primary }}>
                    Webhook URL
                  </h3>
                  <code className="text-sm font-mono break-all" style={{ color: COLORS.primary }}>
                    {integration.webhookUrl}
                  </code>
                  <p className="text-xs text-gray-600 mt-2">
                    Copy this URL and add it to your {integration.name} webhook settings
                  </p>
                </div>
              )}

              {/* Setup Steps */}
              <div>
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wide" style={{ color: COLORS.primary }}>
                  Setup Instructions
                </h3>
                <ol className="space-y-2">
                  {integration.setupSteps.map((step, index) => (
                    <li key={index} className="flex gap-3 text-sm">
                      <span className="font-bold" style={{ color: COLORS.primary }}>
                        {step.split(".")[0]}.
                      </span>
                      <span className="text-gray-700">{step.substring(step.indexOf(" ") + 1)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
            <i className="fas fa-link mr-2"></i>Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all touch-manipulation text-center"
              style={{ borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-credit-card text-2xl mb-2" style={{ color: "#635BFF" }}></i>
              <p className="font-bold text-sm">Stripe Dashboard</p>
            </a>
            <a
              href="https://app.openphone.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all touch-manipulation text-center"
              style={{ borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-phone text-2xl mb-2" style={{ color: "#00D9FF" }}></i>
              <p className="font-bold text-sm">OpenPhone Dashboard</p>
            </a>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all touch-manipulation text-center"
              style={{ borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-calendar text-2xl mb-2" style={{ color: "#4285F4" }}></i>
              <p className="font-bold text-sm">Google Cloud Console</p>
            </a>
            <Link
              href="/settings"
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all touch-manipulation text-center"
              style={{ borderColor: COLORS.primaryLight }}
            >
              <i className="fas fa-cog text-2xl mb-2" style={{ color: COLORS.primary }}></i>
              <p className="font-bold text-sm">System Settings</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
















