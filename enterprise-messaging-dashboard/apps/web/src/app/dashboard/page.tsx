'use client';

import { useState } from 'react';
import { RequireAuth } from '@/lib/auth';
import InboxContent from './messages-tab';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages'>('overview');

  return (
    <RequireAuth>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Messaging Dashboard</h1>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'messages'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Messages
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-2">Numbers</h2>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-sm text-gray-500">Active numbers</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-2">Threads</h2>
                  <p className="text-3xl font-bold">45</p>
                  <p className="text-sm text-gray-500">Active conversations</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-2">Messages</h2>
                  <p className="text-3xl font-bold">1,234</p>
                  <p className="text-sm text-gray-500">This month</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <a
                    href="/numbers"
                    className="border rounded p-4 hover:bg-gray-50 text-center"
                  >
                    Number Inventory
                  </a>
                  <a
                    href="/routing"
                    className="border rounded p-4 hover:bg-gray-50 text-center"
                  >
                    Routing Control
                  </a>
                  <a
                    href="/inbox"
                    className="border rounded p-4 hover:bg-gray-50 text-center"
                  >
                    Messaging Inbox
                  </a>
                  <a
                    href="/assignments"
                    className="border rounded p-4 hover:bg-gray-50 text-center"
                  >
                    Assignments
                  </a>
                </div>
              </div>
            </>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-lg shadow">
              <InboxContent />
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
