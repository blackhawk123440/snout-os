"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface CustomField {
  id: string;
  label: string;
  type: string;
  entityType: string;
  required: boolean;
  visibleToOwner: boolean;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  editableBySitter: boolean;
  editableByClient: boolean;
  showInTemplates: boolean;
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: "" });

  useEffect(() => {
    fetchFields();
  }, [filter]);

  const fetchFields = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.entityType) params.append("entityType", filter.entityType);

      const response = await fetch(`/api/custom-fields?${params}`);
      const data = await response.json();
      setFields(data.fields || []);
    } catch (error) {
      console.error("Failed to fetch custom fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom field?")) return;
    
    try {
      const response = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchFields();
      }
    } catch (error) {
      console.error("Failed to delete field:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading custom fields...</div>
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
                Custom Fields
              </h1>
              <p className="text-gray-600">Manage custom fields for clients, pets, sitters, and bookings</p>
            </div>
            <button
              onClick={() => window.location.href = "/settings/custom-fields/new"}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Create Field
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Entity Types</option>
              <option value="client">Client</option>
              <option value="pet">Pet</option>
              <option value="sitter">Sitter</option>
              <option value="booking">Booking</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Custom Fields
              </h3>
              <p className="text-gray-600 mb-6">Create your first custom field</p>
              <button
                onClick={() => window.location.href = "/settings/custom-fields/new"}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Field
              </button>
            </div>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                className="bg-white rounded-xl p-6 border-2 shadow-sm"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        {field.label}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {field.type}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                        {field.entityType}
                      </span>
                      {field.required && (
                        <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {field.visibleToOwner && (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">Owner</span>
                      )}
                      {field.visibleToSitter && (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800">Sitter</span>
                      )}
                      {field.visibleToClient && (
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Client</span>
                      )}
                      {field.editableBySitter && (
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">Sitter Editable</span>
                      )}
                      {field.editableByClient && (
                        <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">Client Editable</span>
                      )}
                      {field.showInTemplates && (
                        <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">In Templates</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => window.location.href = `/settings/custom-fields/${field.id}`}
                      className="px-4 py-2 rounded-lg font-semibold text-white"
                      style={{ background: COLORS.primary }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteField(field.id)}
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

