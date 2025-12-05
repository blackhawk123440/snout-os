"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/booking-utils";

const TRIGGERS = [
  "booking.created",
  "booking.updated",
  "booking.status.changed",
  "booking.assigned",
  "booking.completed",
  "sitter.assigned",
  "sitter.unassigned",
  "sitter.checked_in",
  "sitter.checked_out",
  "payment.success",
  "payment.failed",
  "visit.completed",
  "client.created",
  "sitter.tier.changed",
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "in", label: "In List" },
];

const ACTION_TYPES = [
  { value: "sendSMS", label: "Send SMS" },
  { value: "sendEmail", label: "Send Email" },
  { value: "updateBookingStatus", label: "Update Booking Status" },
  { value: "assignSitter", label: "Assign Sitter" },
  { value: "notifyOwner", label: "Notify Owner" },
  { value: "writeInternalNote", label: "Write Internal Note" },
];

export default function NewAutomationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [priority, setPriority] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: "",
        operator: "equals",
        value: "",
        logic: "AND",
        order: conditions.length,
      },
    ]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: "sendSMS",
        config: JSON.stringify({ recipient: "client", template: "", phone: "" }),
        order: actions.length,
        delayMinutes: 0,
      },
    ]);
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    if (field === "config") {
      try {
        const config = JSON.parse(value);
        updated[index] = { ...updated[index], config: JSON.stringify(config) };
      } catch {
        updated[index] = { ...updated[index], config: value };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !trigger) {
      alert("Name and trigger are required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          trigger,
          priority,
          enabled,
          conditions,
          actions,
        }),
      });

      if (response.ok) {
        router.push("/automation-center");
      } else {
        const error = await response.json();
        alert(`Failed to create automation: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to create automation:", error);
      alert("Failed to create automation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ background: COLORS.primaryLighter }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.primary }}>
            Create Automation
          </h1>
          <p className="text-gray-600">Build a new automated workflow</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.primary }}>
            Basic Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., Send confirmation when booking is created"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
                placeholder="Describe what this automation does"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Trigger *</label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select a trigger</option>
                {TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2">Priority</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Status</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <span>Enabled</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              Conditions
            </h2>
            <button
              onClick={addCondition}
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Add Condition
            </button>
          </div>

          {conditions.length === 0 ? (
            <p className="text-gray-600 italic">No conditions (automation will always run)</p>
          ) : (
            <div className="space-y-4">
              {conditions.map((condition, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <label className="block text-sm font-semibold mb-1">Field</label>
                      <input
                        type="text"
                        value={condition.field}
                        onChange={(e) => updateCondition(index, "field", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="e.g., service"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold mb-1">Operator</label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, "operator", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-semibold mb-1">Value</label>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, "value", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Value to compare"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold mb-1">Logic</label>
                      <select
                        value={condition.logic || "AND"}
                        onChange={(e) => updateCondition(index, "logic", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => removeCondition(index)}
                        className="w-full px-3 py-2 bg-red-100 text-red-800 rounded font-semibold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl p-6 border-2 shadow-sm mb-6" style={{ borderColor: COLORS.primaryLight }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              Actions
            </h2>
            <button
              onClick={addAction}
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ background: COLORS.primary }}
            >
              + Add Action
            </button>
          </div>

          {actions.length === 0 ? (
            <p className="text-gray-600 italic">No actions (add at least one action)</p>
          ) : (
            <div className="space-y-4">
              {actions.map((action, index) => {
                let config = {};
                try {
                  config = JSON.parse(action.config || "{}");
                } catch {}

                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-12 gap-2 items-end mb-2">
                      <div className="col-span-4">
                        <label className="block text-sm font-semibold mb-1">Action Type</label>
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, "type", e.target.value)}
                          className="w-full px-3 py-2 border rounded"
                        >
                          {ACTION_TYPES.map((at) => (
                            <option key={at.value} value={at.value}>
                              {at.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-semibold mb-1">Delay (minutes)</label>
                        <input
                          type="number"
                          value={action.delayMinutes || 0}
                          onChange={(e) => updateAction(index, "delayMinutes", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                      <div className="col-span-4">
                        <button
                          onClick={() => removeAction(index)}
                          className="w-full px-3 py-2 bg-red-100 text-red-800 rounded font-semibold"
                        >
                          Remove Action
                        </button>
                      </div>
                    </div>

                    {action.type === "sendSMS" && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="block text-sm font-semibold mb-1">Recipient</label>
                          <select
                            value={config.recipient || "client"}
                            onChange={(e) => {
                              const newConfig = { ...config, recipient: e.target.value };
                              updateAction(index, "config", JSON.stringify(newConfig));
                            }}
                            className="w-full px-3 py-2 border rounded"
                          >
                            <option value="client">Client</option>
                            <option value="sitter">Sitter</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1">Message Template</label>
                          <textarea
                            value={config.template || ""}
                            onChange={(e) => {
                              const newConfig = { ...config, template: e.target.value };
                              updateAction(index, "config", JSON.stringify(newConfig));
                            }}
                            className="w-full px-3 py-2 border rounded"
                            rows={3}
                            placeholder="Message template with {{variables}}"
                          />
                        </div>
                      </div>
                    )}

                    {action.type === "updateBookingStatus" && (
                      <div className="mt-2">
                        <label className="block text-sm font-semibold mb-1">New Status</label>
                        <input
                          type="text"
                          value={config.status || ""}
                          onChange={(e) => {
                            const newConfig = { ...config, status: e.target.value };
                            updateAction(index, "config", JSON.stringify(newConfig));
                          }}
                          className="w-full px-3 py-2 border rounded"
                          placeholder="e.g., confirmed"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name || !trigger}
            className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: COLORS.primary }}
          >
            {saving ? "Saving..." : "Create Automation"}
          </button>
        </div>
      </div>
    </div>
  );
}

