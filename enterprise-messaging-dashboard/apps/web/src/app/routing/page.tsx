'use client';

import { useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useRoutingRules,
  useSimulateRoutingMutation,
  useRoutingHistory,
  useRoutingOverrides,
  useCreateOverride,
  useRemoveOverride,
  type RoutingDecision,
  type RoutingOverride,
} from '@/lib/api/routing-hooks';
import { useThreads } from '@/lib/api/hooks';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Routing Control & Simulator Page
 * 
 * Features:
 * - Routing Rules table
 * - Routing Simulator (read-only)
 * - Overrides CRUD
 * - Routing history timeline
 */
function RoutingContent() {
  const { isOwner } = useAuth();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [simulatorThreadId, setSimulatorThreadId] = useState<string>('');
  const [simulatorTimestamp, setSimulatorTimestamp] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );
  const [showOverrideDialog, setShowOverrideDialog] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<'owner_inbox' | 'sitter' | 'client'>('owner_inbox');
  const [overrideDuration, setOverrideDuration] = useState<number | null>(1);
  const [overrideReason, setOverrideReason] = useState('');
  const [expandedTraceStep, setExpandedTraceStep] = useState<number | null>(null);

  const { data: rules = [] } = useRoutingRules();
  const { data: threads = [] } = useThreads();
  const simulateRouting = useSimulateRoutingMutation();
  const [simulationResult, setSimulationResult] = useState<RoutingDecision | null>(null);
  const { data: history } = useRoutingHistory(selectedThreadId);
  const { data: overrides = [] } = useRoutingOverrides({ activeOnly: true });

  const createOverride = useCreateOverride();
  const removeOverride = useRemoveOverride();

  const handleSimulate = async () => {
    if (!simulatorThreadId) return;

    try {
      const result = await simulateRouting.mutateAsync({
        threadId: simulatorThreadId,
        timestamp: simulatorTimestamp ? new Date(simulatorTimestamp).toISOString() : undefined,
        direction: 'inbound',
      });
      setSimulationResult(result);
    } catch (error: any) {
      alert(`Simulation failed: ${error.message}`);
    }
  };

  const handleCreateOverride = async () => {
    if (!showOverrideDialog || !overrideReason) return;

    try {
      await createOverride.mutateAsync({
        threadId: showOverrideDialog,
        target: overrideTarget,
        durationHours: overrideDuration || undefined,
        reason: overrideReason,
      });
      setShowOverrideDialog(null);
      setOverrideReason('');
      setOverrideTarget('owner_inbox');
      setOverrideDuration(1);
    } catch (error: any) {
      alert(`Failed to create override: ${error.message}`);
    }
  };

  const handleRemoveOverride = async (overrideId: string) => {
    if (!confirm('Remove this routing override?')) return;

    try {
      await removeOverride.mutateAsync(overrideId);
    } catch (error: any) {
      alert(`Failed to remove override: ${error.message}`);
    }
  };

  const getTargetBadge = (target: string) => {
    const colors = {
      owner_inbox: 'bg-blue-100 text-blue-700',
      sitter: 'bg-purple-100 text-purple-700',
      client: 'bg-green-100 text-green-700',
    };
    const labels = {
      owner_inbox: 'Owner Inbox',
      sitter: 'Sitter',
      client: 'Client',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[target as keyof typeof colors] || colors.owner_inbox}`}>
        {labels[target as keyof typeof labels] || target}
      </span>
    );
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Access denied. Owner access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Routing Control & Simulator</h1>
          <p className="text-gray-600">Manage routing rules, test routing decisions, and view history</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {(['rules', 'simulator', 'overrides', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    // Tab switching handled by scroll/visibility
                  }}
                  className="px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600"
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Routing Rules Table */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Routing Rules</h2>
            <p className="text-sm text-gray-600 mb-4">
              Routing rules are evaluated in priority order. Higher priority rules are checked first.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Rule Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rules.map((rule) => (
                    <tr key={rule.priority}>
                      <td className="px-4 py-3 text-sm font-medium">{rule.priority}</td>
                      <td className="px-4 py-3 text-sm font-medium">{rule.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rule.description}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            rule.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Routing Simulator</h2>
            <p className="text-sm text-gray-600 mb-4">
              Test routing decisions without affecting real messages. This is read-only.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Thread</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={simulatorThreadId}
                  onChange={(e) => setSimulatorThreadId(e.target.value)}
                >
                  <option value="">Select a thread...</option>
                  {threads.map((thread) => (
                    <option key={thread.id} value={thread.id}>
                      {thread.client.name} - {thread.id.substring(0, 8)}...
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={simulatorTimestamp}
                  onChange={(e) => setSimulatorTimestamp(e.target.value)}
                />
              </div>
              <button
                onClick={handleSimulate}
                disabled={!simulatorThreadId || simulateRouting.isPending}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {simulateRouting.isPending ? 'Simulating...' : 'Preview Routing'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Evaluation Trace</h2>
            {simulationResult ? (
              <div className="space-y-2">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm font-medium text-blue-800 mb-1">Final Target</div>
                  <div className="flex items-center gap-2">
                    {getTargetBadge(simulationResult.target)}
                    {simulationResult.targetId && (
                      <span className="text-xs text-gray-600">({simulationResult.targetId.substring(0, 8)}...)</span>
                    )}
                  </div>
                  <div className="text-sm text-blue-700 mt-2">{simulationResult.reason}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ruleset Version: {simulationResult.rulesetVersion}
                  </div>
                </div>
                <div className="text-sm font-medium mb-2">Step-by-Step Evaluation:</div>
                {simulationResult.evaluationTrace.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded ${
                      step.result ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          Step {step.step}: {step.rule}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{step.condition}</div>
                        <div className="text-xs text-gray-700 mt-1">{step.explanation}</div>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedTraceStep(expandedTraceStep === idx ? null : idx)
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {expandedTraceStep === idx ? 'Hide' : 'Details'}
                      </button>
                    </div>
                    {expandedTraceStep === idx && (
                      <div className="mt-2 text-xs font-mono bg-white p-2 rounded">
                        {JSON.stringify(step, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select a thread and click "Preview Routing" to see evaluation trace</div>
            )}
          </div>
        </div>

        {/* Overrides */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Active Routing Overrides</h2>
              <button
                onClick={() => {
                  // Open dialog with thread picker
                  if (threads.length > 0) {
                    setShowOverrideDialog(threads[0].id);
                  } else {
                    alert('No threads available');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Create Override
              </button>
            </div>
            <div className="space-y-3">
              {overrides.length === 0 ? (
                <div className="text-sm text-gray-500">No active overrides</div>
              ) : (
                overrides.map((override) => (
                  <div key={override.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getTargetBadge(override.targetType)}
                          <span className="text-sm font-medium">
                            {override.thread?.client.name || 'Thread ' + override.threadId.substring(0, 8)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Starts: {format(override.startsAt, 'PPp')}
                        </div>
                        {override.endsAt && (
                          <div className="text-xs text-gray-600">
                            Ends: {format(override.endsAt, 'PPp')}
                          </div>
                        )}
                        <div className="text-sm text-gray-700 mt-2">{override.reason}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveOverride(override.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Routing History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Routing History</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Thread</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedThreadId || ''}
                onChange={(e) => setSelectedThreadId(e.target.value || null)}
              >
                <option value="">Select a thread...</option>
                {threads.map((thread) => (
                  <option key={thread.id} value={thread.id}>
                    {thread.client.name} - {thread.id.substring(0, 8)}...
                  </option>
                ))}
              </select>
            </div>
            {selectedThreadId && history && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.events.length === 0 ? (
                  <div className="text-sm text-gray-500">No routing history for this thread</div>
                ) : (
                  history.events.map((event) => (
                    <div key={event.eventId} className="border rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getTargetBadge(event.decision.target)}
                            {event.overrideId && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                                Override
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm">{event.decision.reason}</div>
                        </div>
                        <a
                          href={`/inbox?thread=${selectedThreadId}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Thread
                        </a>
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">View Trace</summary>
                        <div className="mt-2 space-y-1">
                          {event.decision.evaluationTrace.map((step, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="font-medium">
                                Step {step.step}: {step.rule}
                              </div>
                              <div className="text-gray-600">{step.explanation}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Override Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create Routing Override</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Thread *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={showOverrideDialog}
                onChange={(e) => setShowOverrideDialog(e.target.value || null)}
              >
                {threads.map((thread) => (
                  <option key={thread.id} value={thread.id}>
                    {thread.client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Target *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={overrideTarget}
                onChange={(e) => setOverrideTarget(e.target.value as any)}
              >
                <option value="owner_inbox">Owner Inbox</option>
                <option value="sitter">Sitter</option>
                <option value="client">Client</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Duration</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={overrideDuration === null ? 'permanent' : overrideDuration.toString()}
                onChange={(e) =>
                  setOverrideDuration(e.target.value === 'permanent' ? null : parseInt(e.target.value))
                }
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="24">24 hours</option>
                <option value="permanent">Until manually removed</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={3}
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this override is needed..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowOverrideDialog(null);
                  setOverrideReason('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOverride}
                disabled={!overrideReason || createOverride.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createOverride.isPending ? 'Creating...' : 'Create Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoutingPage() {
  return (
    <RequireAuth requireOwner>
      <RoutingContent />
    </RequireAuth>
  );
}
