"use client";

import { useState, useEffect } from "react";
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
  automation: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    autoConfirm: boolean;
    reminderTiming: string;
    paymentReminders: boolean;
    sitterNotifications: boolean;
    ownerAlerts: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    businessName: "Snout Services",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    stripeSecretKey: "",
    stripePublishableKey: "",
    openphoneApiKey: "",
    openphoneNumberId: "",
    automation: {
      smsEnabled: true,
      emailEnabled: false,
      autoConfirm: false,
      reminderTiming: "24h",
      paymentReminders: true,
      sitterNotifications: true,
      ownerAlerts: true,
    },
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
        setSettings({ ...settings, ...data.settings });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
    setLoading(false);
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
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
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
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-cog" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Settings
                </h1>
                <p className="text-xs text-gray-500">Configure your pet care business</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                style={{ background: COLORS.primary }}
              >
                <i className={`fas fa-save mr-2 ${saving ? 'animate-spin' : ''}`}></i>
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <a
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Business Information */}
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
              <i className="fas fa-building mr-2"></i>Business Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
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
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
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
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
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
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
              <i className="fas fa-key mr-2"></i>API Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Stripe Secret Key
                </label>
                <input
                  type="password"
                  value={settings.stripeSecretKey}
                  onChange={(e) => handleInputChange("stripeSecretKey", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="sk_live_..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Stripe Publishable Key
                </label>
                <input
                  type="text"
                  value={settings.stripePublishableKey}
                  onChange={(e) => handleInputChange("stripePublishableKey", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="pk_live_..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  OpenPhone API Key
                </label>
                <input
                  type="password"
                  value={settings.openphoneApiKey}
                  onChange={(e) => handleInputChange("openphoneApiKey", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  OpenPhone Number ID
                </label>
                <input
                  type="text"
                  value={settings.openphoneNumberId}
                  onChange={(e) => handleInputChange("openphoneNumberId", e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="mt-6 bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.primary }}>
            <i className="fas fa-robot mr-2"></i>Automation Settings
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold" style={{ color: COLORS.primary }}>Communication</h3>
              
              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">SMS Notifications</div>
                  <div className="text-sm text-gray-600">Send automated SMS messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.smsEnabled}
                    onChange={(e) => handleInputChange("automation.smsEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">Email Notifications</div>
                  <div className="text-sm text-gray-600">Send automated email messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.emailEnabled}
                    onChange={(e) => handleInputChange("automation.emailEnabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold" style={{ color: COLORS.primary }}>Automation Rules</h3>
              
              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">Auto-Confirm Bookings</div>
                  <div className="text-sm text-gray-600">Automatically confirm new bookings</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.autoConfirm}
                    onChange={(e) => handleInputChange("automation.autoConfirm", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div className="font-semibold mb-2">Reminder Timing</div>
                <select
                  value={settings.automation.reminderTiming}
                  onChange={(e) => handleInputChange("automation.reminderTiming", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
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

          <div className="mt-6 pt-6 border-t" style={{ borderColor: COLORS.border }}>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">Payment Reminders</div>
                  <div className="text-sm text-gray-600">Send payment reminder messages</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.paymentReminders}
                    onChange={(e) => handleInputChange("automation.paymentReminders", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">Sitter Notifications</div>
                  <div className="text-sm text-gray-600">Notify sitters of assignments</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.sitterNotifications}
                    onChange={(e) => handleInputChange("automation.sitterNotifications", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                <div>
                  <div className="font-semibold">Owner Alerts</div>
                  <div className="text-sm text-gray-600">Send alerts to owner</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.automation.ownerAlerts}
                    onChange={(e) => handleInputChange("automation.ownerAlerts", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}