"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface Template {
  id: string;
  name: string;
  type: string;
  category: string;
  templateKey: string;
  subject: string | null;
  body: string;
  version: number;
  isActive: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", type: "" });

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append("category", filter.category);
      if (filter.type) params.append("type", filter.type);

      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.background }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
                Message Templates
              </h1>
              <p className="text-gray-600">Manage all message templates</p>
            </div>
            <Link
              href="/templates/new"
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Create Template
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              <option value="client">Client</option>
              <option value="sitter">Sitter</option>
              <option value="owner">Owner</option>
              <option value="report">Report</option>
              <option value="invoice">Invoice</option>
            </select>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Types</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border-2" style={{ borderColor: COLORS.primaryLight }}>
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
                No Templates Yet
              </h3>
              <p className="text-gray-600 mb-6">Create your first message template</p>
              <Link
                href="/templates/new"
                className="inline-block px-6 py-3 rounded-lg font-semibold text-white"
                style={{ background: COLORS.primary }}
              >
                Create Template
              </Link>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl p-6 border-2 shadow-sm"
                style={{ borderColor: COLORS.primaryLight }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                        {template.name}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        {template.type.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                        {template.category}
                      </span>
                      {template.isActive ? (
                        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Key: {template.templateKey}</p>
                    <p className="text-sm text-gray-600 mb-2">Version: {template.version}</p>
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {template.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/templates/${template.id}`}
                      className="px-4 py-2 rounded-lg font-semibold text-white"
                      style={{ background: COLORS.primary }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteTemplate(template.id)}
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

