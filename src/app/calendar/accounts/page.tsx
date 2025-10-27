"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface CalendarAccount {
  id: string;
  email: string;
  provider: string;
  isActive: boolean;
  createdAt: Date;
}

export default function CalendarAccountsPage() {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    accessToken: "",
    refreshToken: "",
    provider: "google",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/calendar/accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Failed to fetch calendar accounts:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/calendar/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Calendar account added!");
        resetForm();
        fetchAccounts();
      }
    } catch (error) {
      console.error("Failed to save calendar account:", error);
      alert("Failed to save calendar account");
    }
  };

  const resetForm = () => {
    setFormData({ email: "", accessToken: "", refreshToken: "", provider: "google" });
    setShowAddForm(false);
  };

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error("Failed to toggle account status:", error);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-calendar-alt" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Calendar Accounts
                </h1>
                <p className="text-xs text-gray-500">Manage calendar integrations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary }}
              >
                <i className="fas fa-plus mr-2"></i>Add Account
              </button>
              <a
                href="/calendar"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Calendar
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Accounts List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
              <p className="mt-2 text-gray-600">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-calendar-alt text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">No calendar accounts found</p>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-lg p-6 border-2 hover:shadow-md transition-all"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: COLORS.primaryLight }}>
                        <i className={`fab fa-${account.provider} text-xl`} style={{ color: COLORS.primary }}></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>
                          {account.email}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700">
                            {account.provider}
                          </span>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            account.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {account.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-calendar w-4"></i>
                        <span>Added {new Date(account.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => handleToggleActive(account.id, account.isActive)}
                      className={`px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all ${
                        account.isActive 
                          ? "bg-red-500 text-white" 
                          : "bg-green-500 text-white"
                      }`}
                    >
                      <i className={`fas fa-${account.isActive ? 'pause' : 'play'} mr-2`}></i>
                      {account.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              Add Calendar Account
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Provider *
                </label>
                <select
                  required
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                >
                  <option value="google">Google Calendar</option>
                  <option value="outlook">Outlook</option>
                  <option value="apple">Apple Calendar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Access Token *
                </label>
                <input
                  type="password"
                  required
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="Paste your access token here"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Refresh Token
                </label>
                <input
                  type="password"
                  value={formData.refreshToken}
                  onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="Paste your refresh token here (optional)"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary }}
                >
                  Add Account
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-sm font-bold border-2 rounded-lg hover:opacity-90 transition-all"
                  style={{ color: COLORS.gray, borderColor: COLORS.border }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}