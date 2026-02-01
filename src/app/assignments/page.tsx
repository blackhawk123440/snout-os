/**
 * Assignments Page
 * 
 * Full operational control for assignment windows
 */

'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Card, Button, Badge, Skeleton, Table, TableColumn, EmptyState, Modal, Input, Tabs, TabPanel } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAssignmentWindows,
  useConflicts,
  useCreateWindow,
  useUpdateWindow,
  useDeleteWindow,
  type AssignmentWindow,
  type Conflict,
} from '@/lib/api/assignments-hooks';

export default function AssignmentsPage() {
  const { isOwner, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'windows' | 'conflicts'>('windows');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    threadId: '',
    sitterId: '',
    startsAt: '',
    endsAt: '',
    bookingRef: '',
  });
  const [selectedWindow, setSelectedWindow] = useState<AssignmentWindow | null>(null);

  const { data: windows = [], isLoading } = useAssignmentWindows();
  const { data: conflicts = [], isLoading: conflictsLoading } = useConflicts();
  const createWindow = useCreateWindow();
  const updateWindow = useUpdateWindow();
  const deleteWindow = useDeleteWindow();

  if (authLoading) {
    return (
      <AppShell>
        <PageHeader title="Assignments" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell>
        <PageHeader title="Assignments" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Card>
            <p>Access denied. Owner access required.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleCreate = async () => {
    if (!formData.threadId || !formData.sitterId || !formData.startsAt || !formData.endsAt) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      await createWindow.mutateAsync(formData);
      setShowCreateModal(false);
      setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
    } catch (error: any) {
      alert(`Failed to create window: ${error.message}`);
    }
  };

  const handleEdit = async () => {
    if (!showEditModal) return;
    try {
      await updateWindow.mutateAsync({
        windowId: showEditModal,
        ...formData,
      });
      setShowEditModal(null);
      setFormData({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
      setSelectedWindow(null);
    } catch (error: any) {
      alert(`Failed to update window: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      const result = await deleteWindow.mutateAsync(showDeleteModal);
      if (result.wasActive) {
        alert('Active window deleted. Messages will now route to owner inbox.');
      }
      setShowDeleteModal(null);
      setSelectedWindow(null);
    } catch (error: any) {
      alert(`Failed to delete window: ${error.message}`);
    }
  };

  const openEditModal = (window: AssignmentWindow) => {
    setSelectedWindow(window);
    setFormData({
      threadId: window.threadId,
      sitterId: window.sitterId,
      startsAt: new Date(window.startsAt).toISOString().slice(0, 16),
      endsAt: new Date(window.endsAt).toISOString().slice(0, 16),
      bookingRef: window.bookingRef || '',
    });
    setShowEditModal(window.id);
  };

  const openDeleteModal = (window: AssignmentWindow) => {
    setSelectedWindow(window);
    setShowDeleteModal(window.id);
  };

  const windowColumns: TableColumn<AssignmentWindow>[] = [
    { key: 'thread', label: 'Client', render: (w) => w.thread.client.name },
    { key: 'sitter', label: 'Sitter', render: (w) => w.sitter.name },
    { key: 'startsAt', label: 'Start', render: (w) => new Date(w.startsAt).toLocaleString() },
    { key: 'endsAt', label: 'End', render: (w) => new Date(w.endsAt).toLocaleString() },
    { key: 'status', label: 'Status', render: (w) => (
      <Badge variant={w.status === 'active' ? 'success' : w.status === 'future' ? 'info' : 'secondary'}>
        {w.status}
      </Badge>
    )},
    {
      key: 'actions',
      label: 'Actions',
      render: (w) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <Button size="sm" variant="secondary" onClick={() => openEditModal(w)}>
            Edit
          </Button>
          <Button size="sm" variant="error" onClick={() => openDeleteModal(w)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const conflictColumns: TableColumn<Conflict>[] = [
    { key: 'thread', label: 'Client', render: (c) => c.thread.client.name },
    { key: 'windowA', label: 'Window A Sitter', render: (c) => c.windowA.sitter.name },
    { key: 'windowB', label: 'Window B Sitter', render: (c) => c.windowB.sitter.name },
    { key: 'overlapStart', label: 'Overlap Start', render: (c) => new Date(c.overlapStart).toLocaleString() },
    { key: 'overlapEnd', label: 'Overlap End', render: (c) => new Date(c.overlapEnd).toLocaleString() },
  ];

  const activeCount = windows.filter(w => w.status === 'active').length;
  const futureCount = windows.filter(w => w.status === 'future').length;
  const pastCount = windows.filter(w => w.status === 'past').length;

  return (
    <AppShell>
      <PageHeader
        title="Assignment Windows"
        description="Manage sitter assignment windows for client threads"
        actions={
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Create Window
          </Button>
        }
      />
      <div style={{ padding: tokens.spacing[6] }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {activeCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Active
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {futureCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Future
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {pastCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Past
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {conflicts.length}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Conflicts
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'windows', label: 'Windows' },
            { id: 'conflicts', label: `Conflicts (${conflicts.length})` },
          ]}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
        >
          <TabPanel tabId="windows">
            <Card>
              {isLoading ? (
                <Skeleton height={400} />
              ) : windows.length === 0 ? (
                <EmptyState
                  title="No assignment windows"
                  description="Create assignment windows to route messages to sitters during specific time periods"
                />
              ) : (
                <Table
                  data={windows}
                  columns={windowColumns}
                />
              )}
            </Card>
          </TabPanel>
          <TabPanel tabId="conflicts">
            <Card>
              {conflictsLoading ? (
                <Skeleton height={400} />
              ) : conflicts.length === 0 ? (
                <EmptyState
                  title="No conflicts"
                  description="All assignment windows are properly scheduled"
                />
              ) : (
                <Table
                  data={conflicts}
                  columns={conflictColumns}
                />
              )}
            </Card>
          </TabPanel>
        </Tabs>

        {/* Create Modal */}
        {showCreateModal && (
          <Modal title="Create Assignment Window" onClose={() => setShowCreateModal(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Thread ID
                </label>
                <Input
                  value={formData.threadId}
                  onChange={(e) => setFormData({ ...formData, threadId: e.target.value })}
                  placeholder="Enter thread ID"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Sitter ID
                </label>
                <Input
                  value={formData.sitterId}
                  onChange={(e) => setFormData({ ...formData, sitterId: e.target.value })}
                  placeholder="Enter sitter ID"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  End Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Booking Reference (optional)
                </label>
                <Input
                  value={formData.bookingRef}
                  onChange={(e) => setFormData({ ...formData, bookingRef: e.target.value })}
                  placeholder="Optional booking reference"
                />
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowCreateModal(false)} variant="secondary">Cancel</Button>
                <Button
                  onClick={handleCreate}
                  disabled={createWindow.isPending || !formData.threadId || !formData.sitterId || !formData.startsAt || !formData.endsAt}
                  variant="primary"
                >
                  {createWindow.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedWindow && (
          <Modal title="Edit Assignment Window" onClose={() => setShowEditModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Start Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  End Time
                </label>
                <Input
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Sitter ID (optional)
                </label>
                <Input
                  value={formData.sitterId}
                  onChange={(e) => setFormData({ ...formData, sitterId: e.target.value })}
                  placeholder="Leave empty to keep current"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Booking Reference (optional)
                </label>
                <Input
                  value={formData.bookingRef}
                  onChange={(e) => setFormData({ ...formData, bookingRef: e.target.value })}
                  placeholder="Optional booking reference"
                />
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowEditModal(null)} variant="secondary">Cancel</Button>
                <Button
                  onClick={handleEdit}
                  disabled={updateWindow.isPending}
                  variant="primary"
                >
                  {updateWindow.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedWindow && (
          <Modal title="Delete Assignment Window" onClose={() => setShowDeleteModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              {selectedWindow.status === 'active' ? (
                <div style={{ padding: tokens.spacing[3], backgroundColor: tokens.colors.warning[50], borderRadius: tokens.borderRadius.md }}>
                  <p style={{ color: tokens.colors.warning[700], fontWeight: tokens.typography.fontWeight.medium }}>
                    ⚠️ This window is currently active. Deleting it will route messages to owner inbox.
                  </p>
                </div>
              ) : (
                <p>Delete this assignment window?</p>
              )}
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowDeleteModal(null)} variant="secondary">Cancel</Button>
                <Button onClick={handleDelete} disabled={deleteWindow.isPending} variant="error">
                  {deleteWindow.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
