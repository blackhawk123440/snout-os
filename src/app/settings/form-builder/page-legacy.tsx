"use client";

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/booking-utils";

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  includeInReport: boolean;
}

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await fetch("/api/form-fields");
      const data = await response.json();
      setFields((data.fields || []).sort((a: FormField, b: FormField) => a.order - b.order));
    } catch (error) {
      console.error("Failed to fetch form fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    
    try {
      const response = await fetch(`/api/form-fields/${id}`, {
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
        <div className="text-center py-20">Loading form fields...</div>
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
                Form Builder
              </h1>
              <p className="text-gray-600">Customize your booking form fields</p>
            </div>
            <button
              onClick={() => window.location.href = "/settings/form-builder/new"}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Add Field
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fields.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Form Fields
              </h3>
              <p className="text-gray-600 mb-6">Create your first form field</p>
              <button
                onClick={() => window.location.href = "/settings/form-builder/new"}
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Add Field
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
                      <span className="text-sm font-semibold text-gray-500">#{field.order}</span>
                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        {field.label}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      {field.visibleToSitter && (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800">Visible to Sitter</span>
                      )}
                      {field.visibleToClient && (
                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Visible to Client</span>
                      )}
                      {field.includeInReport && (
                        <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">In Report</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => window.location.href = `/settings/form-builder/${field.id}`}
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



