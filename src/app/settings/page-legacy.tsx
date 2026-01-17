"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Settings {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  stripeSecretKey: string;
  stripePublishableKey: string;
  openphoneApiKey: string;
  openphoneNumberId: string;
  ownerPersonalPhone: string;
  ownerOpenphonePhone: string;
  ownerPhoneType: "personal" | "openphone"; // Which phone to use for owner messages
  automation: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    autoConfirm: boolean;
    reminderTiming: string;
    paymentReminders: boolean;
    sitterNotifications: boolean;
    ownerAlerts: boolean;
  };
  conflictNoticeEnabled: boolean;
}

type SettingsTab = "general" | "integrations" | "automations" | "advanced";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<Settings>({
    businessName: "Snout Services",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    stripeSecretKey: "",
    stripePublishableKey: "",
    openphoneApiKey: "",
    openphoneNumberId: "",
    ownerPersonalPhone: "",
    ownerOpenphonePhone: "",
    ownerPhoneType: "personal",
    automation: {
      smsEnabled: true,
      emailEnabled: false,
      autoConfirm: false,
      reminderTiming: "24h",
      paymentReminders: true,
      sitterNotifications: true,
      ownerAlerts: true,
    },
    conflictNoticeEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.settings) {
        setSettings(prev => ({
          businessName: data.settings.businessName ?? prev.businessName ?? '',
          businessPhone: data.settings.businessPhone ?? prev.businessPhone ?? '',
          businessEmail: data.settings.businessEmail ?? prev.businessEmail ?? '',
          businessAddress: data.settings.businessAddress ?? prev.businessAddress ?? '',
          stripeSecretKey: data.settings.stripeSecretKey ?? prev.stripeSecretKey ?? '',
          stripePublishableKey: data.settings.stripePublishableKey ?? prev.stripePublishableKey ?? '',
          openphoneApiKey: data.settings.openphoneApiKey ?? prev.openphoneApiKey ?? '',
          openphoneNumberId: data.settings.openphoneNumberId ?? prev.openphoneNumberId ?? '',
          ownerPersonalPhone: data.settings.ownerPersonalPhone ?? prev.ownerPersonalPhone ?? '',
          ownerOpenphonePhone: data.settings.ownerOpenphonePhone ?? prev.ownerOpenphonePhone ?? '',
          ownerPhoneType: data.settings.ownerPhoneType ?? prev.ownerPhoneType ?? 'personal',
          automation: data.settings.automation ?? prev.automation,
          conflictNoticeEnabled: data.settings.conflictNoticeEnabled ?? prev.conflictNoticeEnabled ?? true
        }));
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // Phase 3: Use canonical value returned from API (hard requirement per master spec line 255)
        const data = await response.json();
        
        // Update local state with canonical automation settings from server
        if (data.automation) {
          setSettings(prev => ({
            ...prev,
            automation: data.automation, // Use canonical value from server
          }));
        }
        
        alert("Settings saved successfully!");
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to save settings: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setSaving(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith("automation.")) {
      const automationField = field.split(".")[1];
      setSettings(prev => ({
        ...prev,
        automation: {
          ...prev.automation,
          [automationField]: value,
        },
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl" style={{ color: COLORS.primary }}></i>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primary }}>
                <i className="fas fa-cog text-sm sm:text-base" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold" style={{ color: COLORS.primary }}>
                  Settings
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Configure your pet care business</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 touch-manipulation min-h-[44px]"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className={`fas fa-save mr-1 sm:mr-2 ${saving ? 'animate-spin' : ''}`}></i>
                <span className="hidden sm:inline">{saving ? "Saving..." : "Save Settings"}</span>
                <span className="sm:hidden">{saving ? "Saving..." : "Save"}</span>
              </button>
              <Link
                href="/bookings"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] flex items-center"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Back to Bookings</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg p-1 mb-4 sm:mb-6 border-2 flex flex-wrap gap-1" style={{ borderColor: COLORS.primaryLight }}>
          <button
            onClick={() => setActiveTab("general")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2 ${
              activeTab === "general" ? "shadow-sm" : "hover:bg-gray-50"
            }`}
            style={{
              background: activeTab === "general" ? COLORS.primary : "transparent",
              color: activeTab === "general" ? COLORS.primaryLight : COLORS.primary,
            }}
          >
            <i className="fas fa-building"></i>
            <span className="hidden sm:inline">General</span>
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2 ${
              activeTab === "integrations" ? "shadow-sm" : "hover:bg-gray-50"
            }`}
            style={{
              background: activeTab === "integrations" ? COLORS.primary : "transparent",
              color: activeTab === "integrations" ? COLORS.primaryLight : COLORS.primary,
            }}
          >
            <i className="fas fa-plug"></i>
            <span className="hidden sm:inline">Integrations</span>
          </button>
          <button
            onClick={() => setActiveTab("automations")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2 ${
              activeTab === "automations" ? "shadow-sm" : "hover:bg-gray-50"
            }`}
            style={{
              background: activeTab === "automations" ? COLORS.primary : "transparent",
              color: activeTab === "automations" ? COLORS.primaryLight : COLORS.primary,
            }}
          >
            <i className="fas fa-robot"></i>
            <span className="hidden sm:inline">Automations</span>
          </button>
          <Link
            href="/settings/automations/ledger"
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2 hover:bg-gray-50"
            style={{
              background: "transparent",
              color: COLORS.primary,
            }}
          >
            <i className="fas fa-history"></i>
            <span className="hidden sm:inline">Run Ledger</span>
            <span className="sm:hidden">Ledger</span>
          </Link>
          <button
            onClick={() => setActiveTab("advanced")}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all touch-manipulation min-h-[44px] flex items-center gap-2 ${
              activeTab === "advanced" ? "shadow-sm" : "hover:bg-gray-50"
            }`}
            style={{
              background: activeTab === "advanced" ? COLORS.primary : "transparent",
              color: activeTab === "advanced" ? COLORS.primaryLight : COLORS.primary,
            }}
          >
            <i className="fas fa-cog"></i>
            <span className="hidden sm:inline">Advanced</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Business Information */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
                <i className="fas fa-building mr-2"></i>Business Information
              </h2>
              
              <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] text-sm sm:text-base"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Business Phone
                </label>
                  <input
                  type="tel"
                  value={settings.businessPhone}
                  onChange={(e) => handleInputChange("businessPhone", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] text-sm sm:text-base"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Business Email
                </label>
                <input
                  type="email"
                  value={settings.businessEmail}
                  onChange={(e) => handleInputChange("businessEmail", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] text-sm sm:text-base"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Business Address
                </label>
                <textarea
                  value={settings.businessAddress}
                  onChange={(e) => handleInputChange("businessAddress", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 touch-manipulation min-h-[44px] text-sm sm:text-base"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Unified API Configuration */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
                <i className="fas fa-plug mr-2"></i>API Integrations & Credentials
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                Configure all API credentials in one place. These are used for live payments, SMS messaging, and all integrations.
              </p>
              
              {/* Stripe Configuration */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <i className="fas fa-credit-card text-lg sm:text-xl" style={{ color: COLORS.primary }}></i>
                  <h3 className="font-bold text-sm sm:text-base" style={{ color: COLORS.primary }}>Stripe Payments</h3>
                  <span className="px-2 py-1 text-xs font-bold rounded whitespace-nowrap" style={{ background: COLORS.primary, color: COLORS.white }}>
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      Secret Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={settings.stripeSecretKey}
                      onChange={(e) => handleInputChange("stripeSecretKey", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="sk_live_..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Your Stripe secret key (starts with sk_live_)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      Publishable Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.stripePublishableKey}
                      onChange={(e) => handleInputChange("stripePublishableKey", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="pk_live_..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Your Stripe publishable key (starts with pk_live_)</p>
                  </div>
                </div>
              </div>

              {/* OpenPhone Configuration */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <i className="fas fa-phone text-lg sm:text-xl" style={{ color: COLORS.primary }}></i>
                  <h3 className="font-bold text-sm sm:text-base" style={{ color: COLORS.primary }}>OpenPhone SMS</h3>
                  <span className="px-2 py-1 text-xs font-bold rounded whitespace-nowrap" style={{ background: COLORS.primary, color: COLORS.white }}>
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      API Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={settings.openphoneApiKey}
                      onChange={(e) => handleInputChange("openphoneApiKey", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="Your OpenPhone API key"
                    />
                    <p className="text-xs text-gray-500 mt-1">Get this from OpenPhone Dashboard → Settings → API</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      Phone Number ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settings.openphoneNumberId}
                      onChange={(e) => handleInputChange("openphoneNumberId", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="PNSExWe6aR"
                    />
                    <p className="text-xs text-gray-500 mt-1">Your OpenPhone number ID from the dashboard</p>
                  </div>
                </div>
              </div>

              {/* Owner Phone Configuration */}
              <div className="bg-white rounded-lg p-4 sm:p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
                <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
                  <i className="fas fa-user-shield mr-2"></i>Owner Phone Numbers
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Configure which phone number to use for owner notifications. You can set different numbers for different types of messages in the Automation page.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      Personal Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={settings.ownerPersonalPhone}
                      onChange={(e) => handleInputChange("ownerPersonalPhone", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="(555) 123-4567"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Used for:</strong> Owner alerts, booking notifications, internal notifications
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                      OpenPhone Number
                    </label>
                    <input
                      type="tel"
                      value={settings.ownerOpenphonePhone}
                      onChange={(e) => handleInputChange("ownerOpenphonePhone", e.target.value)}
                      className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 min-h-[44px]"
                      style={{ borderColor: COLORS.primaryLight }}
                      placeholder="(555) 123-4567"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Used for:</strong> Client confirmations, customer-facing messages (configure per automation)
                    </p>
                  </div>

                  <div className="sm:col-span-2 p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                    <label className="block text-sm font-bold mb-2 sm:mb-3" style={{ color: COLORS.primary }}>
                      Default Phone Number Type
                    </label>
                    <p className="text-xs text-gray-600 mb-2 sm:mb-3">
                      This is the default for owner messages. You can override this for specific automations in the Automation page.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ownerPhoneType"
                          value="personal"
                          checked={settings.ownerPhoneType === "personal"}
                          onChange={(e) => handleInputChange("ownerPhoneType", e.target.value)}
                          className="w-4 h-4"
                          style={{ accentColor: COLORS.primary }}
                        />
                        <div>
                          <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Personal Phone</span>
                          <p className="text-xs text-gray-500">For owner alerts and internal notifications</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ownerPhoneType"
                          value="openphone"
                          checked={settings.ownerPhoneType === "openphone"}
                          onChange={(e) => handleInputChange("ownerPhoneType", e.target.value)}
                          className="w-4 h-4"
                          style={{ accentColor: COLORS.primary }}
                        />
                        <div>
                          <span className="text-sm font-medium" style={{ color: COLORS.primary }}>OpenPhone</span>
                          <p className="text-xs text-gray-500">For customer-facing messages</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "automations" && (
          <div className="bg-white rounded-lg p-4 sm:p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
              <i className="fas fa-robot mr-2"></i>Automation Settings
            </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <h3 className="font-bold" style={{ color: COLORS.primary }}>Communication</h3>
              
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">SMS Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-600">Send automated SMS messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.smsEnabled}
                    onChange={(e) => handleInputChange("automation.smsEnabled", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.smsEnabled ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.smsEnabled ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Email Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-600">Send automated email messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.emailEnabled}
                    onChange={(e) => handleInputChange("automation.emailEnabled", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.emailEnabled ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.emailEnabled ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold" style={{ color: COLORS.primary }}>Automation Rules</h3>
              
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Auto-Confirm Bookings</div>
                  <div className="text-xs sm:text-sm text-gray-600">Automatically confirm new bookings</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.autoConfirm}
                    onChange={(e) => handleInputChange("automation.autoConfirm", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.autoConfirm ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.autoConfirm ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>

              <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div className="font-semibold text-sm sm:text-base mb-2">Reminder Timing</div>
                <select
                  value={settings.automation.reminderTiming}
                  onChange={(e) => handleInputChange("automation.reminderTiming", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm sm:text-base touch-manipulation min-h-[44px]"
                  style={{ borderColor: COLORS.border }}
                >
                  <option value="24h">24 hours before</option>
                  <option value="12h">12 hours before</option>
                  <option value="6h">6 hours before</option>
                  <option value="1h">1 hour before</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t" style={{ borderColor: COLORS.border }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Payment Reminders</div>
                  <div className="text-xs sm:text-sm text-gray-600">Send payment reminder messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.paymentReminders}
                    onChange={(e) => handleInputChange("automation.paymentReminders", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.paymentReminders ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.paymentReminders ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Sitter Notifications</div>
                  <div className="text-xs sm:text-sm text-gray-600">Notify sitters of assignments</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.sitterNotifications}
                    onChange={(e) => handleInputChange("automation.sitterNotifications", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.sitterNotifications ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.sitterNotifications ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Owner Alerts</div>
                  <div className="text-xs sm:text-sm text-gray-600">Send alerts to owner</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.ownerAlerts}
                    onChange={(e) => handleInputChange("automation.ownerAlerts", e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.automation.ownerAlerts ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.automation.ownerAlerts ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="bg-white rounded-lg p-4 sm:p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.primary }}>
              <i className="fas fa-cog mr-2"></i>Advanced Settings
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation min-h-[44px]" style={{ borderColor: COLORS.border }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Scheduling Conflict Notices</div>
                  <div className="text-xs sm:text-sm text-gray-600">Show warnings when assigning sitters with scheduling conflicts</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.conflictNoticeEnabled}
                    onChange={(e) => setSettings({ ...settings, conflictNoticeEnabled: e.target.checked })}
                    className="sr-only"
                  />
                  <span
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${settings.conflictNoticeEnabled ? 'bg-[#432f21]' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-gray-300 bg-white transition-transform duration-200 ${settings.conflictNoticeEnabled ? 'translate-x-5' : ''}`}
                    />
                  </span>
                </label>
              </div>

              <div className="p-3 sm:p-4 border rounded-lg" style={{ borderColor: COLORS.border, background: COLORS.primaryLighter }}>
                <div className="text-sm font-semibold mb-2" style={{ color: COLORS.primary }}>Message Template Versioning</div>
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  All message templates are automatically versioned. You can view and restore previous versions in the Automation page.
                </p>
                <Link
                  href="/automation"
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                  style={{ color: COLORS.primary, borderColor: COLORS.border }}
                >
                  <i className="fas fa-history"></i>
                  View Template History
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}