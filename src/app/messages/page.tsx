"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/booking-utils";

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  fields: string[];
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "booking_confirmation",
    content: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/message-templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingTemplate ? `/api/message-templates/${editingTemplate.id}` : "/api/message-templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingTemplate ? "Template updated!" : "Template added!");
        resetForm();
        fetchTemplates();
      }
    } catch {
      alert("Failed to save template");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "booking_confirmation", content: "" });
    setShowAddForm(false);
    setEditingTemplate(null);
    setPreviewData({});
  };

  const startEdit = (template: MessageTemplate) => {
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
    });
    setEditingTemplate(template);
    setShowAddForm(true);
  };

  const extractFields = (content: string): string[] => {
    const fieldRegex = /\{\{(\w+)\}\}/g;
    const fields: string[] = [];
    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
      }
    }
    return fields;
  };

  const renderPreview = (content: string, data: Record<string, string>): string => {
    let rendered = content;
    Object.entries(data).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    return rendered;
  };

  const templateTypes = [
    { value: "booking_confirmation", label: "Booking Confirmation" },
    { value: "visit_started", label: "Visit Started" },
    { value: "visit_completed", label: "Visit Completed" },
    { value: "payment_reminder", label: "Payment Reminder" },
    { value: "sitter_assignment", label: "Sitter Assignment" },
    { value: "owner_notification", label: "Owner Notification" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-envelope" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Message Templates
                </h1>
                <p className="text-xs text-gray-500">Manage automated messages and notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-plus mr-2"></i>Add Template
              </button>
              <Link
                href="/bookings"
                className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: COLORS.primary, borderColor: COLORS.border }}
              >
                <i className="fas fa-arrow-left mr-2"></i>Back to Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Template List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl" style={{ color: COLORS.primary }}></i>
              <p className="mt-2 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-envelope text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">No templates found</p>
            </div>
          ) : (
            templates.map((template) => {
              const fields = extractFields(template.content);
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg p-4 border-2 hover:shadow-md transition-all"
                  style={{ borderColor: COLORS.primaryLight }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>
                          {template.name}
                        </h3>
                        <span className="px-2 py-1 text-xs font-bold rounded"
                              style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                          {templateTypes.find(t => t.value === template.type)?.label || template.type}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        <div className="font-semibold mb-1">Template Content:</div>
                        <div className="bg-gray-50 p-3 rounded border" style={{ borderColor: COLORS.border }}>
                          {template.content}
                        </div>
                      </div>
                      
                      {fields.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <div className="font-semibold mb-1">Available Fields:</div>
                          <div className="flex flex-wrap gap-1">
                            {fields.map((field) => (
                              <span key={field} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {`{{${field}}}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEdit(template)}
                        className="px-3 py-1 text-xs font-bold border rounded-lg hover:opacity-90 transition-all"
                        style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setPreviewData({});
                          // Show preview modal
                        }}
                        className="px-3 py-1 text-xs font-bold rounded-lg hover:opacity-90 transition-all"
                        style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              {editingTemplate ? "Edit Template" : "Add Template"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Template Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                    style={{ borderColor: COLORS.primaryLight }}
                  >
                    {templateTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                  Message Content *
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: COLORS.primaryLight }}
                  placeholder="Use {{fieldName}} for dynamic fields. Available fields: {{clientName}}, {{service}}, {{date}}, {{time}}, {{sitterName}}, {{totalPrice}}, etc."
                />
              </div>
              
              {/* Field Preview */}
              {formData.content && extractFields(formData.content).length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: COLORS.primary }}>
                    Field Preview
                  </label>
                  <div className="bg-gray-50 p-3 rounded border" style={{ borderColor: COLORS.border }}>
                    <div className="text-sm text-gray-600 mb-2">Available fields:</div>
                    <div className="flex flex-wrap gap-1">
                      {extractFields(formData.content).map((field) => (
                        <span key={field} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {`{{${field}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                  style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                >
                  {editingTemplate ? "Update" : "Add"} Template
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
