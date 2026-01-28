'use client';

import { useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useAuditEvents,
  usePolicyViolations,
  usePolicyViolation,
  useResolveViolation,
  useDismissViolation,
  useOverrideViolation,
  useDeliveryFailures,
  useRetryDelivery,
  useResolveFailure,
  useResponseTimes,
  useMessageVolume,
  type AuditEvent,
  type PolicyViolation,
  type DeliveryFailure,
} from '@/lib/api/audit-hooks';
import { formatDistanceToNow, format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Audit & Compliance Page
 * 
 * Features:
 * - Unified audit timeline
 * - Policy violations feed
 * - Delivery failures feed
 * - Response time analytics
 * - Message volume metrics
 * - CSV exports with 10k limit
 */
function AuditContent() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'timeline' | 'violations' | 'failures' | 'analytics'>('timeline');
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);
  const [selectedFailureId, setSelectedFailureId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Timeline filters
  const [timelineFilters, setTimelineFilters] = useState<{
    eventType?: string;
    actorType?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }>({});

  // Violations filters
  const [violationStatus, setViolationStatus] = useState<'open' | 'resolved' | 'dismissed'>('open');

  // Failures filters
  const [failureFilters, setFailureFilters] = useState<{
    startDate?: string;
    endDate?: string;
    errorCode?: string;
  }>({});

  // Analytics date range
  const [analyticsStartDate, setAnalyticsStartDate] = useState(
    format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  );
  const [analyticsEndDate, setAnalyticsEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Queries
  const auditEvents = useAuditEvents({ ...timelineFilters, limit: 100 });
  const policyViolations = usePolicyViolations({ status: violationStatus, limit: 100 });
  const selectedViolation = usePolicyViolation(selectedViolationId);
  const deliveryFailures = useDeliveryFailures({ ...failureFilters, limit: 100 });
  const responseTimes = useResponseTimes({
    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
    groupBy: 'thread',
  });
  const messageVolume = useMessageVolume({
    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
    groupBy: 'day',
  });

  // Mutations
  const resolveViolation = useResolveViolation();
  const dismissViolation = useDismissViolation();
  const overrideViolation = useOverrideViolation();
  const retryDelivery = useRetryDelivery();
  const resolveFailure = useResolveFailure();

  const handleExportAudit = async () => {
    try {
      const params = new URLSearchParams();
      if (timelineFilters.startDate) params.set('startDate', timelineFilters.startDate);
      if (timelineFilters.endDate) params.set('endDate', timelineFilters.endDate);
      if (timelineFilters.eventType) params.set('eventType', timelineFilters.eventType);
      if (timelineFilters.actorType) params.set('actorType', timelineFilters.actorType);

      const response = await fetch(`/api/audit/events/export.csv?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error?.includes('exceeds')) {
          alert(`Export too large: ${error.error}. Please narrow your date range or filters.`);
          return;
        }
        throw new Error(error.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleExportViolations = () => {
    window.open(`/api/policy/violations/export.csv?status=${violationStatus}`, '_blank');
  };

  const handleExportFailures = () => {
    const params = new URLSearchParams();
    if (failureFilters.startDate) params.set('startDate', failureFilters.startDate);
    if (failureFilters.endDate) params.set('endDate', failureFilters.endDate);
    window.open(`/api/deliveries/failures/export.csv?${params.toString()}`, '_blank');
  };

  const getEventDescription = (event: AuditEvent): string => {
    const actor = event.actorType === 'owner' ? 'Owner' : event.actorType === 'sitter' ? 'Sitter' : event.actorType === 'system' ? 'System' : event.actorType;
    const action = event.eventType.split('.').pop() || event.eventType;
    return `${actor} ${action}`;
  };

  const translateError = (errorCode: string | null, errorMessage: string | null): string => {
    if (!errorCode && !errorMessage) return 'Unknown error';
    
    // Translate common Twilio error codes
    const translations: Record<string, string> = {
      '20003': 'Insufficient account balance',
      '21211': 'Invalid phone number format',
      '21608': 'Number not owned by account',
      '21610': 'Number not SMS-capable',
      '30001': 'Queue overflow',
      '30002': 'Account suspended',
      '30003': 'Unreachable destination',
      '30004': 'Message blocked',
      '30005': 'Unknown destination',
      '30006': 'Landline or unreachable carrier',
      '30007': 'Carrier violation',
      '30008': 'Unknown error',
    };

    if (errorCode && translations[errorCode]) {
      return translations[errorCode];
    }

    return errorMessage || errorCode || 'Unknown error';
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
          <h1 className="text-3xl font-bold mb-2">Audit & Compliance</h1>
          <p className="text-gray-600">Complete audit trail, policy violations, and delivery monitoring</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {(['timeline', 'violations', 'failures', 'analytics'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Event Type</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={timelineFilters.eventType || ''}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, eventType: e.target.value || undefined })
                    }
                  >
                    <option value="">All</option>
                    <option value="message">Message</option>
                    <option value="routing">Routing</option>
                    <option value="assignment">Assignment</option>
                    <option value="number">Number</option>
                    <option value="automation">Automation</option>
                    <option value="policy">Policy</option>
                    <option value="webhook">Webhook</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actor</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={timelineFilters.actorType || ''}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, actorType: e.target.value || undefined })
                    }
                  >
                    <option value="">All</option>
                    <option value="owner">Owner</option>
                    <option value="sitter">Sitter</option>
                    <option value="client">Client</option>
                    <option value="system">System</option>
                    <option value="automation">Automation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={timelineFilters.startDate || ''}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, startDate: e.target.value || undefined })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={timelineFilters.endDate || ''}
                    onChange={(e) =>
                      setTimelineFilters({ ...timelineFilters, endDate: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search events..."
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  value={timelineFilters.search || ''}
                  onChange={(e) =>
                    setTimelineFilters({ ...timelineFilters, search: e.target.value || undefined })
                  }
                />
                <button
                  onClick={handleExportAudit}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Audit Timeline</h2>
                {auditEvents.data && (
                  <div className="text-sm text-gray-500 mt-1">
                    {auditEvents.data.total} total events
                  </div>
                )}
              </div>
              <div className="divide-y">
                {auditEvents.isLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading events...</div>
                ) : auditEvents.data?.events.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No events found</div>
                ) : (
                  auditEvents.data?.events.map((event) => (
                    <div key={event.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {event.eventType.split('.')[0]}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(event.ts, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm font-medium">{getEventDescription(event)}</div>
                          {event.entityType && event.entityId && (
                            <div className="text-xs text-gray-500 mt-1">
                              {event.entityType}: {event.entityId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setExpandedEventId(expandedEventId === event.id ? null : event.id)
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {expandedEventId === event.id ? 'Hide' : 'Details'}
                        </button>
                      </div>
                      {expandedEventId === event.id && (
                        <div className="mt-3 bg-gray-50 rounded p-3">
                          <div className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(
                              {
                                correlationIds: event.correlationIds,
                                payload: event.payload,
                                schemaVersion: event.schemaVersion,
                              },
                              null,
                              2,
                            )}
                          </div>
                          {event.entityType && event.entityId && (
                            <div className="mt-2">
                              <a
                                href={
                                  event.entityType === 'thread'
                                    ? `/inbox?thread=${event.entityId}`
                                    : event.entityType === 'messageNumber'
                                      ? `/numbers?number=${event.entityId}`
                                      : '#'
                                }
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View {event.entityType}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Policy Violations Tab */}
        {activeTab === 'violations' && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b">
                <nav className="flex -mb-px">
                  {(['open', 'resolved', 'dismissed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setViolationStatus(status)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        violationStatus === status
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Violations List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Policy Violations</h2>
                <button
                  onClick={handleExportViolations}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                >
                  Export CSV
                </button>
              </div>
              <div className="divide-y">
                {policyViolations.isLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading violations...</div>
                ) : policyViolations.data?.violations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No violations found</div>
                ) : (
                  policyViolations.data?.violations.map((violation) => (
                    <div
                      key={violation.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedViolationId(violation.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                              {violation.violationType}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {violation.actionTaken}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(violation.createdAt, { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {violation.thread.client.name} • Thread {violation.threadId.substring(0, 8)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {violation.detectedRedacted || violation.detectedSummary.substring(0, 100)}
                          </div>
                        </div>
                        {violationStatus === 'open' && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={async () => {
                                try {
                                  await resolveViolation.mutateAsync(violation.id);
                                } catch (error: any) {
                                  alert(`Failed to resolve: ${error.message}`);
                                }
                              }}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await dismissViolation.mutateAsync(violation.id);
                                } catch (error: any) {
                                  alert(`Failed to dismiss: ${error.message}`);
                                }
                              }}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Failures Tab */}
        {activeTab === 'failures' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={failureFilters.startDate || ''}
                    onChange={(e) =>
                      setFailureFilters({ ...failureFilters, startDate: e.target.value || undefined })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={failureFilters.endDate || ''}
                    onChange={(e) =>
                      setFailureFilters({ ...failureFilters, endDate: e.target.value || undefined })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Error Code</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Filter by error code..."
                    value={failureFilters.errorCode || ''}
                    onChange={(e) =>
                      setFailureFilters({ ...failureFilters, errorCode: e.target.value || undefined })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Failures List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">Delivery Failures</h2>
                <button
                  onClick={handleExportFailures}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                >
                  Export CSV
                </button>
              </div>
              <div className="divide-y">
                {deliveryFailures.isLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading failures...</div>
                ) : deliveryFailures.data?.failures.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No failures found</div>
                ) : (
                  deliveryFailures.data?.failures.map((failure) => (
                    <div key={failure.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(failure.createdAt, { addSuffix: true })}
                            </span>
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                              Attempt {failure.attemptNo}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {failure.message.thread.client.name} • {failure.message.thread.messageNumber.e164}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Error: {translateError(failure.providerErrorCode, failure.providerErrorMessage)}
                          </div>
                          {showDiagnostics && failure.providerErrorCode && (
                            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                              Code: {failure.providerErrorCode}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await retryDelivery.mutateAsync(failure.id);
                              } catch (error: any) {
                                alert(`Failed to retry: ${error.message}`);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Retry
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await resolveFailure.mutateAsync(failure.id);
                              } catch (error: any) {
                                alert(`Failed to resolve: ${error.message}`);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Date Range */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={analyticsStartDate}
                    onChange={(e) => setAnalyticsStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={analyticsEndDate}
                    onChange={(e) => setAnalyticsEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Response Times Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Response Time Analytics</h2>
              {responseTimes.isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : responseTimes.data && responseTimes.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimes.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgResponseTimeMinutes" fill="#3b82f6" name="Avg Response (min)" />
                    <Bar dataKey="slaCompliant" fill="#10b981" name="SLA Compliant" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Message Volume Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Message Volume</h2>
              {messageVolume.isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Loading...
                </div>
              ) : messageVolume.data && messageVolume.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={messageVolume.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Messages" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Violation Detail Drawer */}
        {selectedViolationId && selectedViolation.data && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold">Policy Violation Details</h2>
                  <button
                    onClick={() => setSelectedViolationId(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Violation Type</div>
                    <div className="text-lg">{selectedViolation.data.violationType}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Detected Content (Redacted)</div>
                    <div className="text-sm bg-gray-50 p-3 rounded">
                      {selectedViolation.data.detectedRedacted || selectedViolation.data.detectedSummary}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Action Taken</div>
                    <div className="text-sm">{selectedViolation.data.actionTaken}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Thread</div>
                    <div className="text-sm">
                      {selectedViolation.data.thread.client.name}
                      {selectedViolation.data.thread.sitter && (
                        <span> • Sitter: {selectedViolation.data.thread.sitter.name}</span>
                      )}
                    </div>
                    <a
                      href={`/inbox?thread=${selectedViolation.data.threadId}`}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      View Thread
                    </a>
                  </div>

                  {selectedViolation.data.message && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Message Preview</div>
                      <div className="text-sm bg-gray-50 p-3 rounded">
                        {selectedViolation.data.message.redactedBody || selectedViolation.data.message.body}
                      </div>
                    </div>
                  )}

                  {selectedViolation.data.status === 'open' && (
                    <div className="flex gap-2 pt-4 border-t">
                      <button
                        onClick={async () => {
                          try {
                            await resolveViolation.mutateAsync(selectedViolation.data!.id);
                            setSelectedViolationId(null);
                          } catch (error: any) {
                            alert(`Failed to resolve: ${error.message}`);
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await dismissViolation.mutateAsync(selectedViolation.data!.id);
                            setSelectedViolationId(null);
                          } catch (error: any) {
                            alert(`Failed to dismiss: ${error.message}`);
                          }
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequireAuth requireOwner>
      <AuditContent />
    </RequireAuth>
  );
}
