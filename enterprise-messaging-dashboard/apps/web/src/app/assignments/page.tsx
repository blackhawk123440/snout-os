'use client';

import { useState, useMemo } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useAssignmentWindows,
  useAssignmentWindow,
  useConflicts,
  useCreateWindow,
  useUpdateWindow,
  useDeleteWindow,
  useResolveConflict,
  useSendReassignmentMessage,
  type AssignmentWindow,
  type Conflict,
} from '@/lib/api/assignments-hooks';
import { useThreads } from '@/lib/api/hooks';
import { useSitters } from '@/lib/api/numbers-hooks';
import { format, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';

/**
 * Assignments & Windows Page
 * 
 * Features:
 * - Calendar view (week)
 * - List view
 * - Conflicts view
 * - Create/edit/delete windows
 * - Reassignment messages
 */
function AssignmentsContent() {
  const { isOwner } = useAuth();
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'conflicts'>('list');
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const { data: windows = [] } = useAssignmentWindows();
  const { data: conflicts = [] } = useConflicts();
  const { data: threads = [] } = useThreads();
  const { data: sitters = [] } = useSitters();
  const selectedWindow = useAssignmentWindow(selectedWindowId);

  const createWindow = useCreateWindow();
  const updateWindow = useUpdateWindow();
  const deleteWindow = useDeleteWindow();
  const resolveConflict = useResolveConflict();
  const sendReassignmentMessage = useSendReassignmentMessage();

  // Form state
  const [formData, setFormData] = useState({
    threadId: '',
    sitterId: '',
    startsAt: '',
    endsAt: '',
    bookingRef: '',
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      future: 'bg-blue-100 text-blue-700',
      past: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status as keyof typeof colors] || colors.past}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getWindowColor = (window: AssignmentWindow) => {
    if (window.status === 'active') return 'bg-green-500';
    if (window.status === 'future') return 'bg-blue-500';
    if (window.status === 'past') return 'bg-gray-400';
    // Check if in conflicts
    const inConflict = conflicts.some(
      (c) => c.windowA.id === window.id || c.windowB.id === window.id,
    );
    if (inConflict) return 'bg-red-500';
    return 'bg-gray-500';
  };

  // Week view: get windows for current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekWindows = useMemo(() => {
    return windows.filter((w) => {
      const weekEnd = addDays(weekStart, 7);
      return (
        isWithinInterval(w.startsAt, { start: weekStart, end: weekEnd }) ||
        isWithinInterval(w.endsAt, { start: weekStart, end: weekEnd }) ||
        (w.startsAt <= weekStart && w.endsAt >= weekEnd)
      );
    });
  }, [windows, weekStart]);

  const handleCreateWindow = async () => {
    if (!formData.threadId || !formData.sitterId || !formData.startsAt || !formData.endsAt) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createWindow.mutateAsync({
        threadId: formData.threadId,
        sitterId: formData.sitterId,
        startsAt: new Date(formData.startsAt).toISOString(),
        endsAt: new Date(formData.endsAt).toISOString(),
        bookingRef: formData.bookingRef || undefined,
      });
      setShowCreateDialog(false);
      setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
    } catch (error: any) {
      alert(`Failed to create window: ${error.message}`);
    }
  };

  const handleUpdateWindow = async () => {
    if (!selectedWindowId) return;

    try {
      await updateWindow.mutateAsync({
        windowId: selectedWindowId,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
        endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
        sitterId: formData.sitterId || undefined,
        bookingRef: formData.bookingRef || undefined,
      });
      setShowEditDialog(false);
      setSelectedWindowId(null);
      setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
    } catch (error: any) {
      alert(`Failed to update window: ${error.message}`);
    }
  };

  const handleDeleteWindow = async (windowId: string, isActive: boolean) => {
    const message = isActive
      ? 'This window is currently active. Deleting it will route messages to owner inbox. Are you sure?'
      : 'Delete this assignment window?';
    if (!confirm(message)) return;

    try {
      await deleteWindow.mutateAsync(windowId);
      setSelectedWindowId(null);
    } catch (error: any) {
      alert(`Failed to delete window: ${error.message}`);
    }
  };

  const handleResolveConflict = async (conflictId: string, strategy: 'keepA' | 'keepB' | 'split') => {
    if (!confirm(`Resolve conflict by ${strategy === 'keepA' ? 'keeping window A' : strategy === 'keepB' ? 'keeping window B' : 'splitting windows'}?`)) {
      return;
    }

    try {
      await resolveConflict.mutateAsync({ conflictId, strategy });
    } catch (error: any) {
      alert(`Failed to resolve conflict: ${error.message}`);
    }
  };

  const handleSendReassignmentMessage = async (threadId: string, windowId: string) => {
    if (!confirm('Send reassignment message to client?')) return;

    try {
      await sendReassignmentMessage.mutateAsync({ threadId, windowId });
      alert('Reassignment message sent');
    } catch (error: any) {
      alert(`Failed to send message: ${error.message}`);
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
            <h1 className="text-3xl font-bold mb-2">Assignments & Windows</h1>
            <p className="text-gray-600">Manage sitter assignments and assignment windows</p>
          </div>
          <button
            onClick={() => {
              setShowCreateDialog(true);
              setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Window
          </button>
        </div>

        {/* Conflicts Banner */}
        {conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-red-800 font-semibold">
                  {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Overlapping assignment windows detected. Resolve conflicts to ensure proper routing.
                </div>
              </div>
              <button
                onClick={() => setActiveView('conflicts')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                View Conflicts
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              {(['calendar', 'list', 'conflicts'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeView === view
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="px-3 py-1 border rounded"
              >
                ← Previous
              </button>
              <div className="text-lg font-semibold">
                {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </div>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="px-3 py-1 border rounded"
              >
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => (
                <div key={idx} className="border rounded p-2 min-h-[200px]">
                  <div className="text-sm font-medium mb-2">{format(day, 'EEE M/d')}</div>
                  <div className="space-y-1">
                    {weekWindows
                      .filter((w) => {
                        const dayStart = new Date(day);
                        dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(day);
                        dayEnd.setHours(23, 59, 59, 999);
                        return (
                          (w.startsAt <= dayEnd && w.endsAt >= dayStart) ||
                          isWithinInterval(day, { start: w.startsAt, end: w.endsAt })
                        );
                      })
                      .map((w) => (
                        <div
                          key={w.id}
                          onClick={() => setSelectedWindowId(w.id)}
                          className={`${getWindowColor(w)} text-white text-xs p-1 rounded cursor-pointer`}
                        >
                          <div className="font-medium">{w.thread.client.name}</div>
                          <div>{w.sitter.name}</div>
                          <div>{format(w.startsAt, 'h:mm a')} - {format(w.endsAt, 'h:mm a')}</div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {activeView === 'list' && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thread</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Sitter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Booking Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {windows.map((window) => {
                  const inConflict = conflicts.some(
                    (c) => c.windowA.id === window.id || c.windowB.id === window.id,
                  );
                  return (
                    <tr key={window.id} className={inConflict ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3">
                        <a
                          href={`/inbox?thread=${window.threadId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {window.thread.client.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm">{window.sitter.name}</td>
                      <td className="px-4 py-3 text-sm">{format(window.startsAt, 'PPp')}</td>
                      <td className="px-4 py-3 text-sm">{format(window.endsAt, 'PPp')}</td>
                      <td className="px-4 py-3">
                        {getStatusBadge(window.status)}
                        {inConflict && (
                          <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                            Conflict
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{window.bookingRef || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedWindowId(window.id);
                              setShowEditDialog(true);
                              setFormData({
                                threadId: window.threadId,
                                sitterId: window.sitterId,
                                startsAt: format(window.startsAt, "yyyy-MM-dd'T'HH:mm"),
                                endsAt: format(window.endsAt, "yyyy-MM-dd'T'HH:mm"),
                                bookingRef: window.bookingRef || '',
                              });
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteWindow(window.id, window.status === 'active')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleSendReassignmentMessage(window.threadId, window.id)}
                            className="text-xs text-green-600 hover:underline"
                          >
                            Send Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {windows.length === 0 && (
              <div className="p-8 text-center text-gray-500">No assignment windows</div>
            )}
          </div>
        )}

        {/* Conflicts View */}
        {activeView === 'conflicts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Conflicts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Overlapping assignment windows for the same thread
              </p>
            </div>
            <div className="divide-y">
              {conflicts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No conflicts detected</div>
              ) : (
                conflicts.map((conflict) => (
                  <div key={conflict.conflictId} className="p-6">
                    <div className="mb-4">
                      <div className="text-sm font-medium text-red-700 mb-2">Overlap Period</div>
                      <div className="text-sm">
                        {format(conflict.overlapStart, 'PPp')} - {format(conflict.overlapEnd, 'PPp')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="border rounded p-4">
                        <div className="text-sm font-medium mb-2">Window A</div>
                        <div className="text-sm">Thread: {conflict.windowA.thread.client.name}</div>
                        <div className="text-sm">Sitter: {conflict.windowA.sitter.name}</div>
                        <div className="text-sm">
                          {format(conflict.windowA.startsAt, 'PPp')} - {format(conflict.windowA.endsAt, 'PPp')}
                        </div>
                      </div>
                      <div className="border rounded p-4">
                        <div className="text-sm font-medium mb-2">Window B</div>
                        <div className="text-sm">Thread: {conflict.windowB.thread.client.name}</div>
                        <div className="text-sm">Sitter: {conflict.windowB.sitter.name}</div>
                        <div className="text-sm">
                          {format(conflict.windowB.startsAt, 'PPp')} - {format(conflict.windowB.endsAt, 'PPp')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveConflict(conflict.conflictId, 'keepA')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Keep Window A
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.conflictId, 'keepB')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Keep Window B
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.conflictId, 'split')}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                      >
                        Split Windows
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Window Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create Assignment Window</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Thread *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.threadId}
                  onChange={(e) => setFormData({ ...formData, threadId: e.target.value })}
                >
                  <option value="">Select thread...</option>
                  {threads.map((thread) => (
                    <option key={thread.id} value={thread.id}>
                      {thread.client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sitter *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.sitterId}
                  onChange={(e) => setFormData({ ...formData, sitterId: e.target.value })}
                >
                  <option value="">Select sitter...</option>
                  {sitters.map((sitter) => (
                    <option key={sitter.id} value={sitter.id}>
                      {sitter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Time *</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time *</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Booking Reference</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={formData.bookingRef}
                  onChange={(e) => setFormData({ ...formData, bookingRef: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWindow}
                disabled={createWindow.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createWindow.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Window Dialog */}
      {showEditDialog && selectedWindow.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Assignment Window</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sitter</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.sitterId}
                  onChange={(e) => setFormData({ ...formData, sitterId: e.target.value })}
                >
                  {sitters.map((sitter) => (
                    <option key={sitter.id} value={sitter.id}>
                      {sitter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded px-3 py-2"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Booking Reference</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={formData.bookingRef}
                  onChange={(e) => setFormData({ ...formData, bookingRef: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedWindowId(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWindow}
                disabled={updateWindow.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updateWindow.isPending ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <RequireAuth requireOwner>
      <AssignmentsContent />
    </RequireAuth>
  );
}
