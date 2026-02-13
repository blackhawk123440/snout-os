/**
 * Assignments Panel - Embedded in Messages tab
 * 
 * Owner can create, edit, delete assignment windows with overlap prevention
 */

'use client';

import { useState } from 'react';
import { Card, Button, Badge, Table, TableColumn, EmptyState, Skeleton, Modal, Input } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/client';
import { z } from 'zod';
import { useSitters } from '@/lib/api/numbers-hooks';
import { useThreads } from '@/lib/api/hooks';

const windowSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  sitterId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.string(),
  thread: z.object({
    id: z.string(),
    client: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
  sitter: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

function useAssignmentWindows() {
  return useQuery({
    queryKey: ['assignments', 'windows'],
    queryFn: () => apiGet('/api/assignments/windows', z.array(windowSchema)),
  });
}

function useCreateWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      threadId: string;
      sitterId: string;
      startsAt: string;
      endsAt: string;
      bookingRef?: string;
    }) => apiPost('/api/assignments/windows', params, windowSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'windows'] });
    },
  });
}

function useDeleteWindow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (windowId: string) => apiDelete(`/api/assignments/windows/${windowId}`, z.object({ success: z.boolean() })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'windows'] });
    },
  });
}

export function AssignmentsPanel() {
  const { data: windows = [], isLoading } = useAssignmentWindows();
  const { data: sitters = [] } = useSitters();
  const { data: threads = [] } = useThreads({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    threadId: '',
    sitterId: '',
    startsAt: '',
    endsAt: '',
    bookingRef: '',
  });
  
  const createWindow = useCreateWindow();
  const deleteWindow = useDeleteWindow();

  const handleCreate = async () => {
    if (!createForm.threadId || !createForm.sitterId || !createForm.startsAt || !createForm.endsAt) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createWindow.mutateAsync({
        threadId: createForm.threadId,
        sitterId: createForm.sitterId,
        startsAt: createForm.startsAt,
        endsAt: createForm.endsAt,
        bookingRef: createForm.bookingRef || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ threadId: '', sitterId: '', startsAt: '', endsAt: '', bookingRef: '' });
      alert('Assignment window created successfully');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to create window';
      if (errorMsg.includes('overlap') || errorMsg.includes('conflict')) {
        alert(`Cannot create window: ${errorMsg}\n\nPlease check for overlapping assignment windows.`);
      } else {
        alert(`Failed to create window: ${errorMsg}`);
      }
    }
  };

  const handleDelete = async (windowId: string) => {
    if (!confirm('Are you sure you want to delete this assignment window?')) {
      return;
    }

    try {
      await deleteWindow.mutateAsync(windowId);
      alert('Assignment window deleted successfully');
    } catch (error: any) {
      alert(`Failed to delete window: ${error.message}`);
    }
  };

  const windowColumns: TableColumn<any>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (w) => w.thread?.client?.name || 'Unknown',
    },
    {
      key: 'sitter',
      header: 'Sitter',
      render: (w) => w.sitter?.name || 'Unknown',
    },
    {
      key: 'window',
      header: 'Window',
      render: (w) => (
        <div style={{ fontSize: tokens.typography.fontSize.sm[0] }}>
          <div>{new Date(w.startsAt).toLocaleString()}</div>
          <div style={{ color: tokens.colors.text.secondary }}>to {new Date(w.endsAt).toLocaleString()}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => (
        <Badge
          variant={
            w.status === 'active' ? 'success' :
            w.status === 'future' ? 'info' : 'default'
          }
        >
          {w.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (w) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDelete(w.id)}
          disabled={deleteWindow.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton height={400} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
        <div>
          <h2 style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[1] }}>
            Assignment Windows
          </h2>
          <p style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
            Create, edit, and manage assignment windows. Overlaps are prevented automatically.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} variant="primary">
          Create Window
        </Button>
      </div>

      <Card>
        {windows.length === 0 ? (
          <EmptyState
            title="No assignment windows"
            description="Create an assignment window to assign a sitter to a thread"
            icon={<i className="fas fa-calendar-check" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
          />
        ) : (
          <Table data={windows} columns={windowColumns} />
        )}
      </Card>

      {showCreateModal && (
        <Modal isOpen={showCreateModal} title="Create Assignment Window" onClose={() => setShowCreateModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Thread (Client)
              </label>
              <select
                value={createForm.threadId}
                onChange={(e) => setCreateForm({ ...createForm, threadId: e.target.value })}
                style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}`, width: '100%' }}
              >
                <option value="">Select thread...</option>
                {threads.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.client?.name || 'Unknown'} ({t.messageNumber?.e164 || 'No number'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Sitter
              </label>
              <select
                value={createForm.sitterId}
                onChange={(e) => setCreateForm({ ...createForm, sitterId: e.target.value })}
                style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}`, width: '100%' }}
              >
                <option value="">Select sitter...</option>
                {sitters.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Start Date & Time
              </label>
              <Input
                type="datetime-local"
                value={createForm.startsAt}
                onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                End Date & Time
              </label>
              <Input
                type="datetime-local"
                value={createForm.endsAt}
                onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                Booking Reference (optional)
              </label>
              <Input
                value={createForm.bookingRef}
                onChange={(e) => setCreateForm({ ...createForm, bookingRef: e.target.value })}
                placeholder="e.g., BOOK-12345"
              />
            </div>

            <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCreateModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createWindow.isPending || !createForm.threadId || !createForm.sitterId || !createForm.startsAt || !createForm.endsAt}
                variant="primary"
              >
                {createWindow.isPending ? 'Creating...' : 'Create Window'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
