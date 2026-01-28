'use client';

import { useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useAlerts,
  useAlert,
  useResolveAlert,
  useDismissAlert,
  type Alert,
} from '@/lib/api/alerts-hooks';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Alerts & Escalation Page
 * 
 * Features:
 * - Alerts dashboard grouped by severity
 * - Resolve/Dismiss flows with guardrails
 * - Deep links to related entities
 * - Escalation rules/history (MVP)
 */
function AlertsContent() {
  const { isOwner } = useAuth();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'escalations'>('alerts');
  const [filters, setFilters] = useState<{
    severity?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }>({});
  const [dismissReason, setDismissReason] = useState('');

  const { data: alertsData, isLoading } = useAlerts({ ...filters, limit: 200 });
  const selectedAlert = useAlert(selectedAlertId);
  const resolveAlert = useResolveAlert();
  const dismissAlert = useDismissAlert();

  const alerts = alertsData?.alerts || [];

  // Group by severity
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status === 'open');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning' && a.status === 'open');
  const infoAlerts = alerts.filter((a) => a.severity === 'info' && a.status === 'open');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');
  const dismissedAlerts = alerts.filter((a) => a.status === 'dismissed');

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      warning: 'bg-yellow-100 text-yellow-700',
      info: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[severity as keyof typeof colors] || colors.info}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-red-100 text-red-700',
      resolved: 'bg-green-100 text-green-700',
      dismissed: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status as keyof typeof colors] || colors.open}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getEntityLink = (alert: Alert): { href: string; label: string } | null => {
    if (!alert.entityType || !alert.entityId) return null;

    switch (alert.entityType) {
      case 'thread':
        return { href: `/inbox?thread=${alert.entityId}`, label: 'View Thread' };
      case 'message':
        return { href: `/inbox?message=${alert.entityId}`, label: 'View Message' };
      case 'messageNumber':
        return { href: `/numbers?number=${alert.entityId}`, label: 'View Number' };
      case 'automation':
        return { href: `/automations?automation=${alert.entityId}`, label: 'View Automation' };
      case 'policyViolation':
        return { href: `/audit?violation=${alert.entityId}`, label: 'View Violation' };
      default:
        return null;
    }
  };

  const getSuggestedNextSteps = (alert: Alert): string[] => {
    const steps: string[] = [];

    if (alert.type.includes('delivery')) {
      steps.push('Check delivery failure details');
      steps.push('Verify recipient number is valid');
      steps.push('Retry delivery if applicable');
    } else if (alert.type.includes('policy')) {
      steps.push('Review policy violation details');
      steps.push('Approve or override if appropriate');
    } else if (alert.type.includes('automation')) {
      steps.push('Check automation execution logs');
      steps.push('Review automation configuration');
      steps.push('Test automation if needed');
    } else if (alert.type.includes('number')) {
      steps.push('Review number health metrics');
      steps.push('Consider quarantining if degraded');
    }

    return steps.length > 0 ? steps : ['Review alert details and take appropriate action'];
  };

  const handleResolve = async (alertId: string) => {
    if (!confirm('Mark this alert as resolved?')) return;

    try {
      await resolveAlert.mutateAsync(alertId);
      setSelectedAlertId(null);
    } catch (error: any) {
      alert(`Failed to resolve: ${error.message}`);
    }
  };

  const handleDismiss = async (alertId: string) => {
    if (!confirm('Dismiss this alert? You can add an optional reason.')) return;

    try {
      await dismissAlert.mutateAsync({ alertId, reason: dismissReason || undefined });
      setSelectedAlertId(null);
      setDismissReason('');
    } catch (error: any) {
      if (error.message?.includes('Critical')) {
        alert('Critical alerts cannot be dismissed. They must be resolved.');
      } else {
        alert(`Failed to dismiss: ${error.message}`);
      }
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Alerts & Escalation</h1>
          <p className="text-gray-600">Monitor system alerts and critical issues</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'alerts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Alerts
              </button>
              <button
                onClick={() => setActiveTab('escalations')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'escalations'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Escalations
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'alerts' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={filters.severity || ''}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
                  >
                    <option value="">All</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  >
                    <option value="">All</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={filters.startDate || ''}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
                  />
                </div>
              </div>
            </div>

            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-red-700">Critical Alerts</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {criticalAlerts.length} critical alert{criticalAlerts.length !== 1 ? 's' : ''} requiring immediate attention
                  </p>
                </div>
                <div className="divide-y">
                  {criticalAlerts.map((alert) => {
                    const entityLink = getEntityLink(alert);
                    return (
                      <div
                        key={alert.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAlertId(alert.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityBadge(alert.severity)}
                              <span className="text-sm font-medium">{alert.title}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">{alert.description}</div>
                            {entityLink && (
                              <a
                                href={entityLink.href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {entityLink.label}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {warningAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-yellow-700">Warnings</h2>
                  <p className="text-sm text-gray-600 mt-1">{warningAlerts.length} warning alert{warningAlerts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y">
                  {warningAlerts.map((alert) => {
                    const entityLink = getEntityLink(alert);
                    return (
                      <div
                        key={alert.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAlertId(alert.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityBadge(alert.severity)}
                              <span className="text-sm font-medium">{alert.title}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">{alert.description}</div>
                            {entityLink && (
                              <a
                                href={entityLink.href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {entityLink.label}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAlertId(alert.id);
                                // Will show dismiss in detail drawer
                              }}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info Alerts */}
            {infoAlerts.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-blue-700">Info</h2>
                  <p className="text-sm text-gray-600 mt-1">{infoAlerts.length} info alert{infoAlerts.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y">
                  {infoAlerts.map((alert) => {
                    const entityLink = getEntityLink(alert);
                    return (
                      <div
                        key={alert.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedAlertId(alert.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityBadge(alert.severity)}
                              <span className="text-sm font-medium">{alert.title}</span>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">{alert.description}</div>
                            {entityLink && (
                              <a
                                href={entityLink.href}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {entityLink.label}
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleResolve(alert.id)}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAlertId(alert.id);
                              }}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resolved/Dismissed */}
            {(resolvedAlerts.length > 0 || dismissedAlerts.length > 0) && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Resolved & Dismissed</h2>
                </div>
                <div className="divide-y">
                  {[...resolvedAlerts, ...dismissedAlerts].map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAlertId(alert.id)}
                    >
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                        <span className="text-sm font-medium">{alert.title}</span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.length === 0 && !isLoading && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No alerts found
              </div>
            )}
          </>
        )}

        {activeTab === 'escalations' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Escalation Rules</h2>
            <p className="text-sm text-gray-600 mb-4">
              Escalation rules are automatically applied when critical alerts are created. Owner is notified in the dashboard.
            </p>
            <div className="space-y-3">
              <div className="border rounded p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">Critical Alert Escalation</div>
                    <div className="text-xs text-gray-600 mt-1">
                      When a critical alert is created, owner is notified in dashboard
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Escalation History</h3>
              <div className="text-sm text-gray-500">
                Escalation events are logged in the audit trail. Check the Audit & Compliance page for details.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Detail Drawer */}
      {selectedAlertId && selectedAlert.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">{selectedAlert.data.title}</h2>
                <button
                  onClick={() => {
                    setSelectedAlertId(null);
                    setDismissReason('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Severity</div>
                  <div>{getSeverityBadge(selectedAlert.data.severity)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <div>{getStatusBadge(selectedAlert.data.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Type</div>
                  <div className="text-sm">{selectedAlert.data.type}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Description</div>
                  <div className="text-sm">{selectedAlert.data.description}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">Created</div>
                  <div className="text-sm">{format(selectedAlert.data.createdAt, 'PPp')}</div>
                </div>

                {selectedAlert.data.entityType && selectedAlert.data.entityId && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Related Entity</div>
                    {getEntityLink(selectedAlert.data) && (
                      <a
                        href={getEntityLink(selectedAlert.data)!.href}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {getEntityLink(selectedAlert.data)!.label}
                      </a>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">Suggested Next Steps</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {getSuggestedNextSteps(selectedAlert.data).map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {selectedAlert.data.status === 'open' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleResolve(selectedAlert.data!.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                    {selectedAlert.data.severity !== 'critical' && (
                      <>
                        <input
                          type="text"
                          placeholder="Optional reason..."
                          className="flex-1 border rounded px-3 py-2 text-sm"
                          value={dismissReason}
                          onChange={(e) => setDismissReason(e.target.value)}
                        />
                        <button
                          onClick={() => handleDismiss(selectedAlert.data!.id)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {selectedAlert.data.severity === 'critical' && (
                      <div className="text-sm text-red-600 flex items-center">
                        Critical alerts cannot be dismissed. They must be resolved.
                      </div>
                    )}
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

export default function AlertsPage() {
  return (
    <RequireAuth requireOwner>
      <AlertsContent />
    </RequireAuth>
  );
}
