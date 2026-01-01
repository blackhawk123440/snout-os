"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface PricingRule {
  id: string;
  name: string;
  type: string;
  value: number;
  conditions: string;
  enabled: boolean;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/pricing-rules");
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Failed to fetch pricing rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing rule?")) return;
    
    try {
      const response = await fetch(`/api/pricing-rules/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading pricing rules...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
                Pricing Rules
              </h1>
              <p className="text-gray-600">Manage dynamic pricing rules and fees</p>
            </div>
            <button
              onClick={() => window.location.href = "/settings/pricing/new"}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Create Rule
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Pricing Rules
              </h3>
              <p className="text-gray-600 mb-6">Create your first pricing rule</p>
              <button
                onClick={() => window.location.href = "/settings/pricing/new"}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Rule
              </button>
            </div>
          ) : (
            rules.map((rule) => {
              const conditions = rule.conditions ? JSON.parse(rule.conditions) : {};
              return (
                <div
                  key={rule.id}
                  className="bg-white rounded-xl p-6 border-2 shadow-sm"
                  style={{ borderColor: COLORS.primaryLight }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                          {rule.name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          rule.enabled
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {rule.enabled ? "Active" : "Inactive"}
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          {rule.type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div><span className="font-semibold">Value:</span> {rule.value}</div>
                        {Object.keys(conditions).length > 0 && (
                          <div className="mt-1">
                            <span className="font-semibold">Conditions:</span> {JSON.stringify(conditions)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleRule(rule.id, rule.enabled)}
                        className={`px-4 py-2 rounded-lg font-semibold ${
                          rule.enabled
                            ? "bg-gray-200 text-gray-800"
                            : "bg-green-200 text-green-800"
                        }`}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => window.location.href = `/settings/pricing/${rule.id}`}
                        className="px-4 py-2 rounded-lg font-semibold text-white"
                        style={{ background: COLORS.primary }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}



