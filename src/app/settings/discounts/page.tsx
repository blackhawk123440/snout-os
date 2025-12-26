"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface Discount {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  valueType: string;
  usageLimit: number | null;
  usageCount: number;
  enabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const response = await fetch("/api/discounts");
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error("Failed to fetch discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscount = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchDiscounts();
      }
    } catch (error) {
      console.error("Failed to toggle discount:", error);
    }
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    
    try {
      const response = await fetch(`/api/discounts/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchDiscounts();
      }
    } catch (error) {
      console.error("Failed to delete discount:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading discounts...</div>
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
                Discounts
              </h1>
              <p className="text-gray-600">Manage discount codes and automatic discounts</p>
            </div>
            <button
              onClick={() => window.location.href = "/settings/discounts/new"}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Create Discount
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {discounts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">🎟️</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Discounts
              </h3>
              <p className="text-gray-600 mb-6">Create your first discount</p>
              <button
                onClick={() => window.location.href = "/settings/discounts/new"}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Discount
              </button>
            </div>
          ) : (
            discounts.map((discount) => (
              <div
                key={discount.id}
                className="bg-white rounded-xl p-6 border-2 shadow-sm"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        {discount.name}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-sm font-mono bg-gray-100 text-gray-800">
                        {discount.code}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        discount.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {discount.enabled ? "Active" : "Inactive"}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {discount.type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-semibold">Value:</span> {discount.value}
                        {discount.valueType === "percentage" ? "%" : "$"}
                      </div>
                      <div>
                        <span className="font-semibold">Usage:</span> {discount.usageCount}
                        {discount.usageLimit ? ` / ${discount.usageLimit}` : " / unlimited"}
                      </div>
                      {discount.validFrom && (
                        <div>
                          <span className="font-semibold">Valid From:</span> {new Date(discount.validFrom).toLocaleDateString()}
                        </div>
                      )}
                      {discount.validUntil && (
                        <div>
                          <span className="font-semibold">Valid Until:</span> {new Date(discount.validUntil).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleDiscount(discount.id, discount.enabled)}
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        discount.enabled
                          ? "bg-gray-200 text-gray-800"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {discount.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => window.location.href = `/settings/discounts/${discount.id}`}
                      className="px-4 py-2 rounded-lg font-semibold text-white"
                      style={{ background: COLORS.primary }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteDiscount(discount.id)}
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
      </div>
    </div>
  );
}


