"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface SitterTier {
  id: string;
  name: string;
  pointTarget: number;
  minCompletionRate: number;
  minResponseRate: number;
  priorityLevel: number;
  canTakeHouseSits: boolean;
  canTakeTwentyFourHourCare: boolean;
  isDefault: boolean;
  benefits: string;
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<SitterTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const response = await fetch("/api/sitter-tiers");
      const data = await response.json();
      setTiers((data.tiers || []).sort((a: SitterTier, b: SitterTier) => a.priorityLevel - b.priorityLevel));
    } catch (error) {
      console.error("Failed to fetch tiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;
    
    try {
      const response = await fetch(`/api/sitter-tiers/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTiers();
      }
    } catch (error) {
      console.error("Failed to delete tier:", error);
    }
  };

  const calculateTiers = async () => {
    try {
      const response = await fetch("/api/sitter-tiers/calculate", {
        method: "POST",
      });
      if (response.ok) {
        alert("Tier calculation started!");
      }
    } catch (error) {
      console.error("Failed to calculate tiers:", error);
      alert("Failed to calculate tiers");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading tiers...</div>
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
                Sitter Tiers
              </h1>
              <p className="text-gray-600">Manage sitter performance tiers and requirements</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={calculateTiers}
                className="px-4 py-3 rounded-lg font-semibold bg-blue-100 text-blue-800"
              >
                Calculate Tiers
              </button>
              <button
                onClick={() => window.location.href = "/settings/tiers/new"}
                className="px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                + Create Tier
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {tiers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Tiers Configured
              </h3>
              <p className="text-gray-600 mb-6">Create your first sitter tier</p>
              <button
                onClick={() => window.location.href = "/settings/tiers/new"}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Tier
              </button>
            </div>
          ) : (
            tiers.map((tier) => {
              const benefits = tier.benefits ? JSON.parse(tier.benefits) : {};
              return (
                <div
                  key={tier.id}
                  className="bg-white rounded-xl p-6 border-2 shadow-sm"
                  style={{ borderColor: COLORS.primaryLight }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                          {tier.name}
                        </h3>
                        {tier.isDefault && (
                          <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                            Default
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                          Priority: {tier.priorityLevel}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-semibold">Point Target:</span> {tier.pointTarget}
                        </div>
                        <div>
                          <span className="font-semibold">Min Completion:</span> {tier.minCompletionRate}%
                        </div>
                        <div>
                          <span className="font-semibold">Min Response:</span> {tier.minResponseRate}%
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tier.canTakeHouseSits && (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-800">House Sits</span>
                          )}
                          {tier.canTakeTwentyFourHourCare && (
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">24hr Care</span>
                          )}
                        </div>
                      </div>
                      {Object.keys(benefits).length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-semibold">Benefits:</span> {JSON.stringify(benefits)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => window.location.href = `/settings/tiers/${tier.id}`}
                        className="px-4 py-2 rounded-lg font-semibold text-white"
                        style={{ background: COLORS.primary }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTier(tier.id)}
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

