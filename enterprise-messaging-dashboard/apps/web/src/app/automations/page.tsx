'use client';

import { useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useAutomations,
  useAutomation,
  useExecutionLogs,
  useExecutionLog,
  useCreateAutomation,
  useUpdateAutomation,
  usePauseAutomation,
  useActivateAutomation,
  useArchiveAutomation,
  useTestAutomation,
  type Automation,
  type AutomationExecution,
} from '@/lib/api/automations-hooks';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Automations Page
 * 
 * Features:
 * - Automations list with filters
 * - Detail view with overview, trigger, conditions, actions, templates
 * - Builder (create/edit) with stepper
 * - Test mode UI
 * - Execution logs timeline
 * - Activation gating
 */
function AutomationsContent() {
  const { isOwner } = useAuth();
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState<string | null>(null);
  const [showLogDetail, setShowLogDetail] = useState<string | null>(null);
  const [testContext, setTestContext] = useState<Record<string, unknown>>({});
  const [filters, setFilters] = useState<{
    status?: string;
    lane?: string;
    search?: string;
  }>({});

  const { data: automations = [], isLoading } = useAutomations(filters);
  const { data: selectedAutomation } = useAutomation(selectedAutomationId);
  const { data: executionLogs } = useExecutionLogs(selectedAutomationId, { limit: 50 });
  const { data: logDetail } = useExecutionLog(showLogDetail);

  const pauseAutomation = usePauseAutomation();
  const activateAutomation = useActivateAutomation();
  const archiveAutomation = useArchiveAutomation();
  const testAutomation = useTestAutomation();

  const getLaneBadge = (lane: string) => {
    const colors = {
      front_desk: 'bg-blue-100 text-blue-700',
      sitter: 'bg-purple-100 text-purple-700',
      billing: 'bg-green-100 text-green-700',
      system: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[lane as keyof typeof colors] || colors.system}`}>
        {lane.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-gray-100 text-gray-700',
      archived: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const describeTrigger = (trigger: any): string => {
    if (!trigger || typeof trigger !== 'object') return 'Unknown trigger';
    if (trigger.type === 'message_received') return 'When message received';
    if (trigger.type === 'thread_created') return 'When thread created';
    if (trigger.type === 'assignment_window_start') return 'When assignment window starts';
    return `Trigger: ${trigger.type || 'unknown'}`;
  };

  const canActivate = (automation: Automation): boolean => {
    if (automation.status === 'active') return false;
    if (!automation.lastTestedAt) return false;
    if (automation.lastTestedAt < automation.updatedAt) return false;
    return true;
  };

  const handleActivate = async (automationId: string) => {
    try {
      await activateAutomation.mutateAsync(automationId);
    } catch (error: any) {
      if (error.message?.includes('test')) {
        alert('Automation must be tested after last edit. Run test mode first.');
      } else {
        alert(`Failed to activate: ${error.message}`);
      }
    }
  };

  const handleTest = async () => {
    if (!selectedAutomationId) return;

    try {
      const result = await testAutomation.mutateAsync({
        automationId: selectedAutomationId,
        context: testContext,
      });
      alert('Test completed! Check execution logs for details.');
      setShowTestDialog(null);
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    }
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Automations</h1>
            <p className="text-gray-600">Create and manage automated messaging workflows</p>
          </div>
          <a
            href="/automations/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
          >
            Create Automation
          </a>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lane</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.lane || ''}
                onChange={(e) => setFilters({ ...filters, lane: e.target.value || undefined })}
              >
                <option value="">All</option>
                <option value="front_desk">Front Desk</option>
                <option value="sitter">Sitter</option>
                <option value="billing">Billing</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name..."
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading automations...</div>
            ) : automations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No automations found</div>
            ) : (
              automations.map((automation) => (
                <div
                  key={automation.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAutomationId(automation.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{automation.name}</h3>
                        {getLaneBadge(automation.lane)}
                        {getStatusBadge(automation.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {describeTrigger(automation.trigger)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Last executed:{' '}
                          {automation.lastExecutedAt
                            ? formatDistanceToNow(automation.lastExecutedAt, { addSuffix: true })
                            : 'Never'}
                        </span>
                        <span>Executions (24h): {automation.executionCount24h || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {automation.status === 'active' ? (
                        <button
                          onClick={async () => {
                            if (confirm('Pause this automation?')) {
                              try {
                                await pauseAutomation.mutateAsync(automation.id);
                              } catch (error: any) {
                                alert(`Failed: ${error.message}`);
                              }
                            }
                          }}
                          className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          Pause
                        </button>
                      ) : automation.status === 'paused' ? (
                        <button
                          onClick={() => handleActivate(automation.id)}
                          disabled={!canActivate(automation)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      ) : automation.status === 'draft' ? (
                        <button
                          onClick={() => handleActivate(automation.id)}
                          disabled={!canActivate(automation)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          title={
                            !canActivate(automation)
                              ? 'Must test after last edit to activate'
                              : ''
                          }
                        >
                          Activate
                        </button>
                      ) : null}
                      {automation.status !== 'archived' && (
                        <>
                          <a
                            href={`/automations/${automation.id}/edit`}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </a>
                          <button
                            onClick={async () => {
                              if (confirm('Archive this automation?')) {
                                try {
                                  await archiveAutomation.mutateAsync(automation.id);
                                } catch (error: any) {
                                  alert(`Failed: ${error.message}`);
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Side Panel */}
      {selectedAutomationId && selectedAutomation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-3xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">{selectedAutomation.name}</h2>
                <button
                  onClick={() => {
                    setSelectedAutomationId(null);
                    setShowTestDialog(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Overview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div>{getStatusBadge(selectedAutomation.status)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Lane</div>
                    <div>{getLaneBadge(selectedAutomation.lane)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Created</div>
                    <div className="text-sm">{format(selectedAutomation.createdAt, 'PPp')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Last Updated</div>
                    <div className="text-sm">{format(selectedAutomation.updatedAt, 'PPp')}</div>
                  </div>
                </div>
                {selectedAutomation.description && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-500">Description</div>
                    <div className="text-sm">{selectedAutomation.description}</div>
                  </div>
                )}
              </div>

              {/* Test Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowTestDialog(selectedAutomation.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Test Automation
                </button>
                {!canActivate(selectedAutomation) && selectedAutomation.status !== 'active' && (
                  <div className="mt-2 text-sm text-yellow-600">
                    ⚠️ Must test after last edit to activate
                  </div>
                )}
              </div>

              {/* Trigger */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Trigger</h3>
                <div className="bg-gray-50 rounded p-3">
                  <div className="text-sm">{describeTrigger(selectedAutomation.trigger)}</div>
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">View Details</summary>
                    <pre className="mt-2 text-xs font-mono bg-white p-2 rounded overflow-auto">
                      {JSON.stringify(selectedAutomation.trigger, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>

              {/* Conditions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Conditions</h3>
                <div className="bg-gray-50 rounded p-3">
                  {selectedAutomation.conditions &&
                  Array.isArray(selectedAutomation.conditions) &&
                  selectedAutomation.conditions.length > 0 ? (
                    <div className="space-y-2">
                      {(selectedAutomation.conditions as any[]).map((condition, idx) => (
                        <div key={idx} className="text-sm">
                          {condition.field} {condition.operator} {condition.value}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No conditions (always runs)</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Actions</h3>
                <div className="bg-gray-50 rounded p-3">
                  {selectedAutomation.actions &&
                  Array.isArray(selectedAutomation.actions) &&
                  selectedAutomation.actions.length > 0 ? (
                    <ol className="space-y-2">
                      {(selectedAutomation.actions as any[]).map((action, idx) => (
                        <li key={idx} className="text-sm">
                          {idx + 1}. {action.type} - {action.config?.description || 'No description'}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="text-sm text-gray-500">No actions configured</div>
                  )}
                </div>
              </div>

              {/* Templates */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Templates</h3>
                <div className="bg-gray-50 rounded p-3">
                  {selectedAutomation.templates &&
                  Object.keys(selectedAutomation.templates).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(selectedAutomation.templates).map(([key, value]) => (
                        <div key={key}>
                          <div className="text-xs font-medium text-gray-500">{key}</div>
                          <div className="text-sm mt-1">{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No templates configured</div>
                  )}
                </div>
              </div>

              {/* Execution Logs */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Execution Logs</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {executionLogs?.logs.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 text-center">No executions yet</div>
                  ) : (
                    executionLogs?.logs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100"
                        onClick={() => setShowLogDetail(log.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  log.status === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : log.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : log.status === 'test'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {log.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            {log.error && (
                              <div className="text-xs text-red-600 mt-1">{log.error.substring(0, 100)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Test Automation</h3>
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-sm font-medium text-blue-800 mb-1">⚠️ Test Mode</div>
              <div className="text-sm text-blue-700">No messages will be sent. This is a simulation.</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Test Context (JSON)</label>
              <textarea
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={6}
                placeholder='{"threadId": "...", "clientId": "..."}'
                value={JSON.stringify(testContext, null, 2)}
                onChange={(e) => {
                  try {
                    setTestContext(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowTestDialog(null);
                  setTestContext({});
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTest}
                disabled={testAutomation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {testAutomation.isPending ? 'Testing...' : 'Run Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Detail Drawer */}
      {showLogDetail && logDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Execution Details</h2>
                <button
                  onClick={() => setShowLogDetail(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <div className="text-sm">{logDetail.status}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Timestamp</div>
                  <div className="text-sm">{format(logDetail.createdAt, 'PPp')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Trigger Context</div>
                  <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(logDetail.triggerContext, null, 2)}
                  </pre>
                </div>
                {logDetail.conditionResults && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Condition Results</div>
                    <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-auto">
                      {JSON.stringify(logDetail.conditionResults, null, 2)}
                    </pre>
                  </div>
                )}
                {logDetail.actionResults && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Action Results</div>
                    <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-auto">
                      {JSON.stringify(logDetail.actionResults, null, 2)}
                    </pre>
                  </div>
                )}
                {logDetail.error && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Error</div>
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{logDetail.error}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AutomationsPage() {
  return (
    <RequireAuth requireOwner>
      <AutomationsContent />
    </RequireAuth>
  );
}
