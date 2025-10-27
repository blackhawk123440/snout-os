"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  calendarId: string;
  active: boolean;
  syncEnabled: boolean;
  sitterId?: string;
  sitter?: { firstName: string; lastName: string };
  lastSyncAt?: string;
}

export default function GoogleCalendarAccountsPage() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

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
      console.error("Failed to fetch accounts:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: "#e0e0e0" }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#432f21" }}>
                <i className="fab fa-google" style={{ color: "#fce1ef" }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: "#432f21" }}>
                  Google Calendar Accounts
                </h1>
                <p className="text-xs text-gray-500">Connect calendars for owner & sitters • Live two-way sync</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: "#432f21" }}
              >
                <i className="fab fa-google mr-2"></i>Add Calendar Account
              </button>
              <Link
                href="/calendar"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: "#432f21", borderColor: "#d0d0d0" }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Info Panel */}
        <div className="mb-6 border-l-4 rounded-lg p-5" style={{ background: "#fce1ef", borderColor: "#432f21" }}>
          <div className="flex items-start gap-3">
            <i className="fab fa-google text-2xl" style={{ color: "#432f21" }}></i>
            <div className="text-sm" style={{ color: "#432f21" }}>
              <h3 className="font-bold mb-2">How Multi-Calendar Sync Works</h3>
              <ul className="space-y-1">
                <li>• Connect your Google Calendar + each sitter's Google Calendar</li>
                <li>• Bookings automatically sync to the assigned sitter's calendar</li>
                <li>• View all calendars combined or filter by person</li>
                <li>• Live updates - changes in Snout OS reflect in Google Calendar</li>
                <li>• Each person sees only their bookings in their Google Calendar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg border shadow-sm p-5" style={{ borderColor: "#e0e0e0" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#fce1ef" }}>
                    <i className="fab fa-google text-xl" style={{ color: "#432f21" }}></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: "#432f21" }}>
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-600">{account.email}</p>
                    {account.sitter && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Linked to: {account.sitter.firstName} {account.sitter.lastName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    account.active && account.syncEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {account.active && account.syncEnabled ? "✓ SYNCING" : "○ PAUSED"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Calendar ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{account.calendarId}</code>
                </div>
                {account.lastSyncAt && (
                  <div className="flex items-center justify-between">
                    <span>Last synced:</span>
                    <span className="font-medium">
                      {new Date(account.lastSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
                  style={{ background: "#432f21" }}
                >
                  <i className="fas fa-sync mr-2"></i>Sync Now
                </button>
                <button
                  className="px-3 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: "#666", borderColor: "#d0d0d0" }}
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>
            </div>
          ))}

          {accounts.length === 0 && !loading && (
            <div className="col-span-2 text-center py-16 bg-white rounded-lg border" style={{ borderColor: "#e0e0e0" }}>
              <i className="fab fa-google text-6xl text-gray-300 mb-4"></i>
              <h3 className="font-bold text-lg text-gray-700 mb-2">No Calendar Accounts Connected</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add your Google Calendar and your sitters' calendars for automatic syncing
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-all"
                style={{ background: "#432f21" }}
              >
                <i className="fab fa-google mr-2"></i>Connect First Calendar
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg border p-6" style={{ borderColor: "#e0e0e0" }}>
          <h3 className="font-bold text-base mb-3" style={{ color: "#432f21" }}>
            <i className="fas fa-book mr-2"></i>Setup Instructions
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "#432f21" }}>1</div>
              <div>
                <strong>Enable Google Calendar API</strong>
                <p className="text-xs text-gray-500 mt-1">Go to Google Cloud Console → Enable "Google Calendar API" for your project</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "#432f21" }}>2</div>
              <div>
                <strong>Create OAuth Credentials</strong>
                <p className="text-xs text-gray-500 mt-1">Create OAuth 2.0 client ID with redirect URI: http://localhost:3000/api/calendar/callback</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "#432f21" }}>3</div>
              <div>
                <strong>Get Refresh Tokens</strong>
                <p className="text-xs text-gray-500 mt-1">For each person (owner + sitters), authorize and get their refresh token</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "#432f21" }}>4</div>
              <div>
                <strong>Add Accounts Here</strong>
                <p className="text-xs text-gray-500 mt-1">Click "Add Calendar Account" and enter name, email, and refresh token for each person</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <i className="fas fa-book-open mr-2" style={{ color: "#432f21" }}></i>
              <strong>Full setup guide:</strong> See <code className="bg-white px-2 py-1 rounded ml-1">CALENDAR_SETUP.md</code> for detailed instructions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

