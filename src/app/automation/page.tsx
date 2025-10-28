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

interface AutomationSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  autoConfirm: boolean;
  reminderTiming: string;
  paymentReminders: boolean;
  sitterNotifications: boolean;
  ownerAlerts: boolean;
}

export default function AutomationPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [settings, setSettings] = useState<AutomationSettings>({
    smsEnabled: true,
    emailEnabled: false,
    autoConfirm: false,
    reminderTiming: "24h",
    paymentReminders: true,
    sitterNotifications: true,
    ownerAlerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "preview">("templates");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "booking_confirmation",
    content: "",
  });

  useEffect(() => {
    fetchTemplates();
    fetchSettings();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/message-templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.automation) {
        setSettings(data.automation);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
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
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Failed to save template");
    }
  };

  const handleSettingsSave = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation: settings }),
      });

      if (response.ok) {
        alert("Automation settings saved!");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
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
    { value: "booking_confirmation", label: "Booking Confirmation", icon: "fa-check-circle" },
    { value: "visit_started", label: "Visit Started", icon: "fa-play" },
    { value: "visit_completed", label: "Visit Completed", icon: "fa-check-double" },
    { value: "payment_reminder", label: "Payment Reminder", icon: "fa-credit-card" },
    { value: "sitter_assignment", label: "Sitter Assignment", icon: "fa-user-plus" },
    { value: "owner_notification", label: "Owner Notification", icon: "fa-bell" },
    { value: "night_before_reminder", label: "Night Before Reminder", icon: "fa-moon" },
    { value: "thank_you_message", label: "Thank You Message", icon: "fa-heart" },
  ];

  const availableFields = [
    { name: "clientName", description: "Client's full name" },
    { name: "firstName", description: "Client's first name" },
    { name: "lastName", description: "Client's last name" },
    { name: "service", description: "Service type (Dog Walking, Pet Sitting, etc.)" },
    { name: "date", description: "Booking date" },
    { name: "time", description: "Booking time" },
    { name: "petNames", description: "Pet names (comma separated)" },
    { name: "petQuantities", description: "Pet quantities (e.g., '2 Dogs, 1 Cat')" },
    { name: "totalPrice", description: "Total booking price" },
    { name: "sitterName", description: "Assigned sitter's name" },
    { name: "address", description: "Service address" },
    { name: "phone", description: "Client's phone number" },
    { name: "email", description: "Client's email" },
    { name: "paymentLink", description: "Stripe payment link" },
    { name: "specialNotes", description: "Special instructions" },
  ];

  return (
    <div className="min-h-screen" style={{ background: COLORS.primaryLighter }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: COLORS.border }}>
        <div className="max-w-[1600px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.primary }}>
                <i className="fas fa-robot" style={{ color: COLORS.primaryLight }}></i>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                  Automation Center
                </h1>
                <p className="text-xs text-gray-500">Manage message templates and automation settings</p>
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

      <div className="max-w-[1600px] mx-auto px-8 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "templates" ? "" : "hover:bg-gray-100"
            }`}
            style={activeTab === "templates" ? { background: COLORS.primary, color: COLORS.primaryLight } : { color: COLORS.primary }}
          >
            <i className="fas fa-envelope mr-2"></i>Message Templates
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "settings" ? "" : "hover:bg-gray-100"
            }`}
            style={activeTab === "settings" ? { background: COLORS.primary, color: COLORS.primaryLight } : { color: COLORS.primary }}
          >
            <i className="fas fa-cog mr-2"></i>Automation Settings
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "preview" ? "" : "hover:bg-gray-100"
            }`}
            style={activeTab === "preview" ? { background: COLORS.primary, color: COLORS.primaryLight } : { color: COLORS.primary }}
          >
            <i className="fas fa-eye mr-2"></i>Field Reference
          </button>
        </div>

        {/* Templates Tab */}
        {activeTab === "templates" && (
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
                const templateType = templateTypes.find(t => t.value === template.type);
                return (
                  <div
                    key={template.id}
                    className="bg-white rounded-lg p-6 border-2 hover:shadow-md transition-all"
                    style={{ borderColor: COLORS.primaryLight }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <i className={`fas ${templateType?.icon || 'fa-envelope'} text-xl`} style={{ color: COLORS.primary }}></i>
                          <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>
                            {template.name}
                          </h3>
                          <span className="px-3 py-1 text-xs font-bold rounded"
                                style={{ background: COLORS.primaryLight, color: COLORS.primary }}>
                            {templateType?.label || template.type}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-4">
                          <div className="font-semibold mb-2">Template Content:</div>
                          <div className="bg-gray-50 p-4 rounded border whitespace-pre-wrap" style={{ borderColor: COLORS.border }}>
                            {template.content}
                          </div>
                        </div>
                        
                        {fields.length > 0 && (
                          <div className="text-sm text-gray-600">
                            <div className="font-semibold mb-2">Dynamic Fields:</div>
                            <div className="flex flex-wrap gap-2">
                              {fields.map((field) => (
                                <span key={field} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                                  {`{{${field}}}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-6">
                        <button
                          onClick={() => startEdit(template)}
                          className="px-4 py-2 text-sm font-bold border rounded-lg hover:opacity-90 transition-all"
                          style={{ color: COLORS.primary, borderColor: COLORS.primaryLight }}
                        >
                          <i className="fas fa-edit mr-2"></i>Edit
                        </button>
                        <button
                          onClick={() => {
                            setPreviewData({});
                            // Show preview modal
                          }}
                          className="px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                          style={{ background: COLORS.primary, color: COLORS.primaryLight }}
                        >
                          <i className="fas fa-eye mr-2"></i>Preview
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: COLORS.primary }}>
              <i className="fas fa-cog mr-2"></i>Automation Settings
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>Communication</h3>
                
                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">SMS Notifications</div>
                    <div className="text-sm text-gray-600">Send automated SMS messages</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsEnabled}
                      onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.smsEnabled ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">Email Notifications</div>
                    <div className="text-sm text-gray-600">Send automated email messages</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailEnabled}
                      onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.emailEnabled ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg" style={{ color: COLORS.primary }}>Automation Rules</h3>
                
                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">Auto-Confirm Bookings</div>
                    <div className="text-sm text-gray-600">Automatically confirm new bookings</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoConfirm}
                      onChange={(e) => setSettings({ ...settings, autoConfirm: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.autoConfirm ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>

                <div className="p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="font-semibold mb-2">Reminder Timing</div>
                  <select
                    value={settings.reminderTiming}
                    onChange={(e) => setSettings({ ...settings, reminderTiming: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    style={{ borderColor: COLORS.border }}
                  >
                    <option value="24h">24 hours before</option>
                    <option value="12h">12 hours before</option>
                    <option value="6h">6 hours before</option>
                    <option value="1h">1 hour before</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: COLORS.border }}>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">Payment Reminders</div>
                    <div className="text-sm text-gray-600">Send payment reminder messages</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentReminders}
                      onChange={(e) => setSettings({ ...settings, paymentReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.paymentReminders ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">Sitter Notifications</div>
                    <div className="text-sm text-gray-600">Notify sitters of assignments</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sitterNotifications}
                      onChange={(e) => setSettings({ ...settings, sitterNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.sitterNotifications ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div>
                    <div className="font-semibold">Owner Alerts</div>
                    <div className="text-sm text-gray-600">Send alerts to owner</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ownerAlerts}
                      onChange={(e) => setSettings({ ...settings, ownerAlerts: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div 
                      className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                      style={{
                        backgroundColor: settings.ownerAlerts ? COLORS.primary : '#e5e7eb',
                        '--tw-ring-color': COLORS.primaryLight + '40',
                      } as React.CSSProperties}
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSettingsSave}
                className="px-6 py-3 text-sm font-bold rounded-lg hover:opacity-90 transition-all"
                style={{ background: COLORS.primary, color: COLORS.primaryLight }}
              >
                <i className="fas fa-save mr-2"></i>Save Settings
              </button>
              <button
                onClick={fetchSettings}
                className="px-6 py-3 text-sm font-bold border rounded-lg hover:opacity-90 transition-all"
                style={{ color: COLORS.gray, borderColor: COLORS.border }}
              >
                <i className="fas fa-undo mr-2"></i>Reset
              </button>
            </div>
          </div>
        )}

        {/* Field Reference Tab */}
        {activeTab === "preview" && (
          <div className="bg-white rounded-lg p-6 border-2" style={{ borderColor: COLORS.primaryLight }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: COLORS.primary }}>
              <i className="fas fa-code mr-2"></i>Available Fields Reference
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {availableFields.map((field) => (
                <div key={field.name} className="p-4 border rounded-lg" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-center gap-3 mb-2">
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded font-mono">
                      {`{{${field.name}}}`}
                    </code>
                  </div>
                  <div className="text-sm text-gray-600">{field.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg" style={{ borderColor: COLORS.border }}>
              <h3 className="font-bold mb-2" style={{ color: COLORS.primary }}>Usage Example:</h3>
              <div className="text-sm text-gray-600">
                <p className="mb-2">Use fields in your templates like this:</p>
                <code className="block p-3 bg-white border rounded" style={{ borderColor: COLORS.border }}>
                  Hi {`{{firstName}}`}, your {`{{service}}`} booking is confirmed for {`{{date}}`} at {`{{time}}`}.<br/>
                  Pets: {`{{petQuantities}}`}<br/>
                  Total: ${`{{totalPrice}}`}
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>
              {editingTemplate ? "Edit Template" : "Add Template"}
            </h3>
            
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
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
