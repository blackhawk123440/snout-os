"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { COLORS } from "@/lib/booking-utils";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();
      if (data.template) {
        const tpl = data.template;
        setName(tpl.name || "");
        setType(tpl.type || "");
        setCategory(tpl.category || "");
        setTemplateKey(tpl.templateKey || "");
        setSubject(tpl.subject || "");
        setBody(tpl.body || "");
        setIsActive(tpl.isActive !== false);
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !type || !category || !templateKey || !body) {
      alert("Name, type, category, templateKey, and body are required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          category,
          templateKey,
          subject,
          body,
          isActive,
        }),
      });

      if (response.ok) {
        router.push("/templates");
      } else {
        const error = await response.json();
        alert(`Failed to update template: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to update template:", error);
      alert("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
        <div className="text-center py-20">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
            Edit Template
          </h1>
          <p className="text-gray-600">Update your message template</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
            Template Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select type</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Select category</option>
                  <option value="client">Client</option>
                  <option value="sitter">Sitter</option>
                  <option value="owner">Owner</option>
                  <option value="report">Report</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2">Template Key *</label>
              <input
                type="text"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., booking.confirmation"
              />
            </div>

            {type === "email" && (
              <div>
                <label className="block font-semibold mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold mb-2">Body *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={10}
                placeholder="Message body with {{variables}}"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !type || !category || !templateKey || !body}
            className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: COLORS.primary }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}


