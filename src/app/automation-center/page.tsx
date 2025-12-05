"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  enabled: boolean;
  priority: number;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    logic: string | null;
    order: number;
  }>;
  actions: Array<{
    id: string;
    type: string;
    config: string;
    order: number;
    delayMinutes: number | null;
  }>;
  _count?: {
    logs: number;
  };
}

export default function AutomationCenterPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchAutomations = async () => {
    try {
      const response = await fetch("/api/automations");
      const data = await response.json();
      setAutomations(data.automations || []);
    } catch (error) {
      console.error("Failed to fetch automations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (automationId: string) => {
    try {
      const response = await fetch(`/api/automations/logs?automationId=${automationId}&limit=50`);
      const data = await response.json();
      setLogs(data.logs || []);
      setShowLogs(true);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error("Failed to toggle automation:", error);
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error("Failed to delete automation:", error);
    }
  };

  const runAutomation = async (id: string) => {
    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: {} }),
      });
      if (response.ok) {
        alert("Automation triggered successfully");
        fetchAutomations();
      }
    } catch (error) {
      console.error("Failed to run automation:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-xl">Loading automations...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
                Automation Center
              </h1>
              <p className="text-gray-600">
                Manage all automated workflows and triggers
              </p>
            </div>
            <Link
              href="/automation-center/new"
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Create Automation
            </Link>
          </div>
        </div>

        {/* Automation List */}
        <div className="space-y-4">
          {automations.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Automations Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first automation to automate workflows
              </p>
              <Link
                href="/automation-center/new"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Automation
              </Link>
            </div>
          ) : (
            automations.map((automation) => (
              <div
                key={automation.id}
                className="bg-white rounded-xl p-6 border-2 shadow-sm"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        {automation.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          automation.enabled
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {automation.enabled ? "Active" : "Inactive"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        Priority: {automation.priority}
                      </span>
                    </div>
                    {automation.description && (
                      <p className="text-gray-600 mb-3">{automation.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Trigger:</span> {automation.trigger}
                      </div>
                      <div>
                        <span className="font-semibold">Conditions:</span> {automation.conditions.length}
                      </div>
                      <div>
                        <span className="font-semibold">Actions:</span> {automation.actions.length}
                      </div>
                      {automation._count && (
                        <div>
                          <span className="font-semibold">Executions:</span> {automation._count.logs}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleAutomation(automation.id, automation.enabled)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        automation.enabled
                          ? "bg-gray-200 text-gray-800"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {automation.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => fetchLogs(automation.id)}
                      className="px-4 py-2 rounded-lg font-semibold bg-blue-100 text-blue-800"
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => runAutomation(automation.id)}
                      className="px-4 py-2 rounded-lg font-semibold bg-purple-100 text-purple-800"
                    >
                      Run
                    </button>
                    <Link
                      href={`/automation-center/${automation.id}`}
                      className="px-4 py-2 rounded-lg font-semibold text-white"
                      style={{ background: COLORS.primary }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteAutomation(automation.id)}
                      className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Logs Modal */}
        {showLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                  Automation Logs
                </h2>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-gray-600">No logs yet</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border ${
                        log.success
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{log.trigger}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(log.executedAt).toLocaleString()}
                        </div>
                      </div>
                      {log.error && (
                        <div className="text-red-600 text-sm mt-2">{log.error}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

