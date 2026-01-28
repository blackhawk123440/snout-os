'use client';

import { useState, useEffect } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useNumbers,
  useNumber,
  useImpactPreview,
  useSitters,
  useBuyNumber,
  useImportNumber,
  useBulkImport,
  useAssignToSitter,
  useReleaseToPool,
  useQuarantineNumber,
  useBulkQuarantine,
  useReleaseFromQuarantine,
  type Number,
} from '@/lib/api/numbers-hooks';
import { formatDistanceToNow } from 'date-fns';

/**
 * Number Inventory Page
 * 
 * Features:
 * - Table with filters, sorting, search
 * - Detail side panel
 * - All lifecycle actions with confirmations
 * - Impact previews
 * - Guardrails enforcement
 * - Health badges
 * - Bulk operations
 * - CSV export
 */
function NumbersContent() {
  const { isOwner } = useAuth();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    class?: string[];
    status?: string[];
    assignedSitterId?: string;
    search?: string;
    health?: string;
  }>({});
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showQuarantineDialog, setShowQuarantineDialog] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState<string | null>(null);
  const [showBulkQuarantineDialog, setShowBulkQuarantineDialog] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [quarantineReason, setQuarantineReason] = useState('');
  const [quarantineReasonDetail, setQuarantineReasonDetail] = useState('');
  const [selectedSitterId, setSelectedSitterId] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [buyE164, setBuyE164] = useState('');
  const [buyClass, setBuyClass] = useState<'front_desk' | 'sitter' | 'pool'>('front_desk');
  const [importE164, setImportE164] = useState('');
  const [importClass, setImportClass] = useState<'front_desk' | 'sitter' | 'pool'>('front_desk');

  const { data: numbers = [], isLoading } = useNumbers(filters);
  const { data: selectedNumber } = useNumber(selectedNumberId);
  const { data: impactPreview } = useImpactPreview(
    showQuarantineDialog || showAssignDialog ? selectedNumberId : null,
    showQuarantineDialog ? 'quarantine' : showAssignDialog ? 'assign' : '',
  );
  const { data: sitters = [] } = useSitters();
  const buyNumber = useBuyNumber();
  const importNumber = useImportNumber();
  const bulkImport = useBulkImport();
  const assignToSitter = useAssignToSitter();
  const releaseToPool = useReleaseToPool();
  const quarantineNumber = useQuarantineNumber();
  const bulkQuarantine = useBulkQuarantine();
  const releaseFromQuarantine = useReleaseFromQuarantine();

  const handleQuarantine = async () => {
    if (!selectedNumberId || !quarantineReason) return;

    try {
      await quarantineNumber.mutateAsync({
        numberId: selectedNumberId,
        reason: quarantineReason,
        reasonDetail: quarantineReasonDetail || undefined,
      });
      setShowQuarantineDialog(null);
      setQuarantineReason('');
      setQuarantineReasonDetail('');
      setSelectedNumberId(null);
      setShowDetailPanel(false);
    } catch (error: any) {
      alert(`Failed to quarantine: ${error.message}`);
    }
  };

  const handleBulkQuarantine = async () => {
    if (selectedNumbers.size === 0 || !quarantineReason) return;

    try {
      await bulkQuarantine.mutateAsync({
        numberIds: Array.from(selectedNumbers),
        reason: quarantineReason,
        reasonDetail: quarantineReasonDetail || undefined,
      });
      setShowBulkQuarantineDialog(false);
      setQuarantineReason('');
      setQuarantineReasonDetail('');
      setSelectedNumbers(new Set());
    } catch (error: any) {
      alert(`Failed to quarantine: ${error.message}`);
    }
  };

  const handleAssign = async () => {
    if (!selectedNumberId || !selectedSitterId) return;

    try {
      await assignToSitter.mutateAsync({
        numberId: selectedNumberId,
        sitterId: selectedSitterId,
      });
      setShowAssignDialog(null);
      setSelectedSitterId('');
    } catch (error: any) {
      alert(`Failed to assign: ${error.message}`);
    }
  };

  const handleReleaseToPool = async (numberId: string) => {
    if (!confirm('Are you sure you want to release this number to the pool?')) return;

    try {
      await releaseToPool.mutateAsync(numberId);
    } catch (error: any) {
      alert(`Failed to release: ${error.message}`);
    }
  };

  const handleReleaseFromQuarantine = async (numberId: string) => {
    if (!confirm('Are you sure you want to release this number from quarantine?')) return;

    try {
      await releaseFromQuarantine.mutateAsync(numberId);
    } catch (error: any) {
      alert(`Failed to release: ${error.message}`);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/numbers/export.csv', '_blank');
  };

  const getHealthBadge = (number: Number) => {
    const health = number.health;
    if (!health) return null;

    const colors = {
      healthy: 'bg-green-100 text-green-700',
      degraded: 'bg-yellow-100 text-yellow-700',
      critical: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[health.status]}`}>
        {health.status}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      quarantined: 'bg-orange-100 text-orange-700',
      inactive: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status as keyof typeof colors] || colors.inactive}`}>
        {status}
      </span>
    );
  };

  const getClassBadge = (numberClass: string) => {
    const labels = {
      front_desk: 'Front Desk',
      sitter: 'Sitter',
      pool: 'Pool',
    };

    const colors = {
      front_desk: 'bg-blue-100 text-blue-700',
      sitter: 'bg-purple-100 text-purple-700',
      pool: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[numberClass as keyof typeof colors]}`}>
        {labels[numberClass as keyof typeof labels] || numberClass}
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Number Inventory</h1>
            <p className="text-gray-600">Manage your messaging numbers and assignments</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBuyDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Buy Number
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Import Number
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Export CSV
            </button>
            {selectedNumbers.size > 0 && (
              <button
                onClick={() => setShowBulkQuarantineDialog(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Bulk Quarantine ({selectedNumbers.size})
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="E164 or sitter name..."
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.class?.[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    class: e.target.value ? [e.target.value] : undefined,
                  })
                }
              >
                <option value="">All</option>
                <option value="front_desk">Front Desk</option>
                <option value="sitter">Sitter</option>
                <option value="pool">Pool</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.status?.[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value ? [e.target.value] : undefined,
                  })
                }
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="quarantined">Quarantined</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Health</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={filters.health || ''}
                onChange={(e) =>
                  setFilters({ ...filters, health: e.target.value || undefined })
                }
              >
                <option value="">All</option>
                <option value="healthy">Healthy</option>
                <option value="degraded">Degraded</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    <input
                      type="checkbox"
                      checked={selectedNumbers.size === numbers.length && numbers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNumbers(new Set(numbers.map((n) => n.id)));
                        } else {
                          setSelectedNumbers(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Messages (7d)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : numbers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No numbers found
                    </td>
                  </tr>
                ) : (
                  numbers.map((number) => (
                    <tr
                      key={number.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedNumberId(number.id);
                        setShowDetailPanel(true);
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedNumbers.has(number.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedNumbers);
                            if (e.target.checked) {
                              newSet.add(number.id);
                            } else {
                              newSet.delete(number.id);
                            }
                            setSelectedNumbers(newSet);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{number.e164}</td>
                      <td className="px-4 py-3">{getClassBadge(number.class)}</td>
                      <td className="px-4 py-3">{getStatusBadge(number.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        {number.class === 'front_desk'
                          ? 'Front Desk'
                          : number.assignedSitter
                            ? number.assignedSitter.name
                            : 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">{getHealthBadge(number)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {number.lastUsedAt
                          ? formatDistanceToNow(number.lastUsedAt, { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {number.health?.messages7d || 0}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setSelectedNumberId(number.id);
                              setShowQuarantineDialog(number.id);
                            }}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                            disabled={number.status === 'quarantined'}
                          >
                            Quarantine
                          </button>
                          {number.status === 'quarantined' && (
                            <button
                              onClick={() => handleReleaseFromQuarantine(number.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Release
                            </button>
                          )}
                          {number.class !== 'front_desk' && number.assignedSitterId && (
                            <button
                              onClick={() => handleReleaseToPool(number.id)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              Release to Pool
                            </button>
                          )}
                          {number.class !== 'front_desk' && !number.assignedSitterId && (
                            <button
                              onClick={() => {
                                setSelectedNumberId(number.id);
                                setShowAssignDialog(number.id);
                              }}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Side Panel */}
      {showDetailPanel && selectedNumber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Number Details</h2>
                <button
                  onClick={() => {
                    setShowDetailPanel(false);
                    setSelectedNumberId(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Number</div>
                  <div className="text-lg font-semibold">{selectedNumber.e164}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Class</div>
                    <div>{getClassBadge(selectedNumber.class)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Status</div>
                    <div>{getStatusBadge(selectedNumber.status)}</div>
                  </div>
                </div>

                {selectedNumber.status === 'quarantined' && selectedNumber.quarantineReleaseAt && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-4">
                    <div className="text-sm font-medium text-orange-800 mb-1">
                      Quarantined - Cooldown Period
                    </div>
                    <div className="text-sm text-orange-700">
                      Release date:{' '}
                      {selectedNumber.quarantineReleaseAt.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-orange-700">
                      Days remaining:{' '}
                      {Math.ceil(
                        (selectedNumber.quarantineReleaseAt.getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24),
                      )}
                    </div>
                    {selectedNumber.quarantinedReason && (
                      <div className="text-sm text-orange-700 mt-2">
                        Reason: {selectedNumber.quarantinedReason}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-500">Active Threads</div>
                  <div className="text-lg">{selectedNumber.activeThreadCount || 0}</div>
                </div>

                {selectedNumber.health && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">Health Metrics</div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Status</div>
                        <div>{getHealthBadge(selectedNumber)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Errors (7d)</div>
                        <div className="text-sm font-medium">
                          {selectedNumber.health.deliveryErrors7d}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Messages (7d)</div>
                        <div className="text-sm font-medium">
                          {selectedNumber.health.messages7d}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showDiagnostics && selectedNumber.providerNumberSid && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Provider SID</div>
                    <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {selectedNumber.providerNumberSid}
                    </div>
                  </div>
                )}

                {selectedNumber.purchaseDate && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Purchase Date</div>
                    <div className="text-sm">
                      {selectedNumber.purchaseDate.toLocaleDateString()}
                    </div>
                  </div>
                )}

                {selectedNumber.lastUsedAt && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Last Used</div>
                    <div className="text-sm">
                      {formatDistanceToNow(selectedNumber.lastUsedAt, { addSuffix: true })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine Dialog */}
      {showQuarantineDialog && impactPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quarantine Number</h3>

            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-sm font-medium text-yellow-800 mb-1">Impact Preview</div>
              <div className="text-sm text-yellow-700">
                {impactPreview.affectedThreads} active conversation(s) will be affected
              </div>
              <div className="text-sm text-yellow-700 mt-1">{impactPreview.impact}</div>
              {impactPreview.cooldownDate && (
                <div className="text-sm text-yellow-700 mt-1">
                  Cooldown period: {impactPreview.cooldownDays} days (until{' '}
                  {new Date(impactPreview.cooldownDate).toLocaleDateString()})
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                <option value="delivery_failures">Delivery Failures</option>
                <option value="policy_violation">Policy Violation</option>
                <option value="manual_review">Manual Review</option>
                <option value="other">Other</option>
              </select>
            </div>

            {quarantineReason === 'other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason Details *</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={quarantineReasonDetail}
                  onChange={(e) => setQuarantineReasonDetail(e.target.value)}
                  placeholder="Provide details..."
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowQuarantineDialog(null);
                  setQuarantineReason('');
                  setQuarantineReasonDetail('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuarantine}
                disabled={!quarantineReason || quarantineNumber.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {quarantineNumber.isPending ? 'Quarantining...' : 'Confirm Quarantine'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Dialog */}
      {showAssignDialog && impactPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Assign Number to Sitter</h3>

            {impactPreview.affectedThreads > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-sm text-yellow-700">
                  {impactPreview.affectedThreads} active conversation(s) will be affected
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Sitter *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedSitterId}
                onChange={(e) => setSelectedSitterId(e.target.value)}
              >
                <option value="">Select sitter...</option>
                {sitters.map((sitter) => (
                  <option key={sitter.id} value={sitter.id}>
                    {sitter.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAssignDialog(null);
                  setSelectedSitterId('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedSitterId || assignToSitter.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {assignToSitter.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buy Dialog */}
      {showBuyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Buy New Number</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">E.164 Number *</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="+15551234567"
                value={buyE164}
                onChange={(e) => setBuyE164(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Class *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={buyClass}
                onChange={(e) => setBuyClass(e.target.value as any)}
              >
                <option value="front_desk">Front Desk</option>
                <option value="sitter">Sitter</option>
                <option value="pool">Pool</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowBuyDialog(false);
                  setBuyE164('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await buyNumber.mutateAsync({ e164: buyE164, class: buyClass });
                    setShowBuyDialog(false);
                    setBuyE164('');
                  } catch (error: any) {
                    alert(`Failed to buy number: ${error.message}`);
                  }
                }}
                disabled={!buyE164 || buyNumber.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {buyNumber.isPending ? 'Purchasing...' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Import Existing Number</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">E.164 Number *</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="+15551234567"
                value={importE164}
                onChange={(e) => setImportE164(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Class *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={importClass}
                onChange={(e) => setImportClass(e.target.value as any)}
              >
                <option value="front_desk">Front Desk</option>
                <option value="sitter">Sitter</option>
                <option value="pool">Pool</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportE164('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await importNumber.mutateAsync({ e164: importE164, class: importClass });
                    setShowImportDialog(false);
                    setImportE164('');
                  } catch (error: any) {
                    alert(`Failed to import number: ${error.message}`);
                  }
                }}
                disabled={!importE164 || importNumber.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {importNumber.isPending ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Quarantine Dialog */}
      {showBulkQuarantineDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Bulk Quarantine ({selectedNumbers.size} numbers)
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
              >
                <option value="">Select reason...</option>
                <option value="delivery_failures">Delivery Failures</option>
                <option value="policy_violation">Policy Violation</option>
                <option value="manual_review">Manual Review</option>
                <option value="other">Other</option>
              </select>
            </div>

            {quarantineReason === 'other' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason Details *</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={quarantineReasonDetail}
                  onChange={(e) => setQuarantineReasonDetail(e.target.value)}
                  placeholder="Provide details..."
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowBulkQuarantineDialog(false);
                  setQuarantineReason('');
                  setQuarantineReasonDetail('');
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkQuarantine}
                disabled={!quarantineReason || bulkQuarantine.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {bulkQuarantine.isPending ? 'Quarantining...' : 'Confirm Bulk Quarantine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NumbersPage() {
  return (
    <RequireAuth requireOwner>
      <NumbersContent />
    </RequireAuth>
  );
}
