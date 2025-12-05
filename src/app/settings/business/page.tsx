"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

export default function BusinessSettingsPage() {
  const [settings, setSettings] = useState({
    businessName: "",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    timeZone: "America/New_York",
    operatingHours: {},
    holidays: [] as string[],
    taxSettings: {},
    contentBlocks: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/business-settings");
      const data = await response.json();
      if (data.settings) {
        setSettings({
          businessName: data.settings.businessName || "",
          businessPhone: data.settings.businessPhone || "",
          businessEmail: data.settings.businessEmail || "",
          businessAddress: data.settings.businessAddress || "",
          timeZone: data.settings.timeZone || "America/New_York",
          operatingHours: data.settings.operatingHours ? JSON.parse(data.settings.operatingHours) : {},
          holidays: data.settings.holidays ? JSON.parse(data.settings.holidays) : [],
          taxSettings: data.settings.taxSettings ? JSON.parse(data.settings.taxSettings) : {},
          contentBlocks: data.settings.contentBlocks ? JSON.parse(data.settings.contentBlocks) : {},
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/business-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          operatingHours: JSON.stringify(settings.operatingHours),
          holidays: JSON.stringify(settings.holidays),
          taxSettings: JSON.stringify(settings.taxSettings),
          contentBlocks: JSON.stringify(settings.contentBlocks),
        }),
      });

      if (response.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.background }}>
        <div className="text-center py-20">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.background }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{ color: COLORS.primary }}>
          Business Settings
        </h1>

        <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
            Business Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2">Business Name *</label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Business Phone</label>
              <input
                type="tel"
                value={settings.businessPhone}
                onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Business Email</label>
              <input
                type="email"
                value={settings.businessEmail}
                onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Business Address</label>
              <textarea
                value={settings.businessAddress}
                onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Time Zone</label>
              <select
                value={settings.timeZone}
                onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: COLORS.primary }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

