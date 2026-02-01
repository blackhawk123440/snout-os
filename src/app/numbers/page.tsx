/**
 * Numbers Inventory Page
 * 
 * Full operational control for number management
 */

'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Card, Button, Badge, Skeleton, Table, TableColumn, EmptyState, Modal, Input, Textarea } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import {
  useNumbers,
  useBuyNumber,
  useImportNumber,
  useQuarantineNumber,
  useReleaseNumber,
  useAssignToSitter,
  useReleaseToPool,
  useSitters,
  type Number,
} from '@/lib/api/numbers-hooks';

export default function NumbersPage() {
  const { isOwner, loading: authLoading } = useAuth();
  const [filters, setFilters] = useState<{ class?: string; status?: string }>({});
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuarantineModal, setShowQuarantineModal] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState<string | null>(null);
  const [showReleaseToPoolModal, setShowReleaseToPoolModal] = useState<string | null>(null);
  
  const [buyForm, setBuyForm] = useState({ class: 'front_desk' as 'front_desk' | 'sitter' | 'pool', areaCode: '', quantity: 1 });
  const [importForm, setImportForm] = useState({ e164: '', numberSid: '', class: 'front_desk' as 'front_desk' | 'sitter' | 'pool' });
  const [quarantineForm, setQuarantineForm] = useState({ reason: '', reasonDetail: '' });
  const [assignForm, setAssignForm] = useState({ sitterId: '' });
  const [selectedNumber, setSelectedNumber] = useState<Number | null>(null);

  const { data: numbers = [], isLoading } = useNumbers(filters);
  const { data: sitters = [] } = useSitters();
  const buyNumber = useBuyNumber();
  const importNumber = useImportNumber();
  const quarantineNumber = useQuarantineNumber();
  const releaseNumber = useReleaseNumber();
  const assignToSitter = useAssignToSitter();
  const releaseToPool = useReleaseToPool();

  if (authLoading) {
    return (
      <AppShell>
        <PageHeader title="Numbers" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell>
        <PageHeader title="Numbers" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Card>
            <p>Access denied. Owner access required.</p>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleBuy = async () => {
    try {
      await buyNumber.mutateAsync(buyForm);
      setShowBuyModal(false);
      setBuyForm({ class: 'front_desk', areaCode: '', quantity: 1 });
      alert('Number purchased successfully');
    } catch (error: any) {
      alert(`Failed to buy number: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!importForm.e164 && !importForm.numberSid) {
      alert('Please enter either E164 or Number SID');
      return;
    }
    try {
      await importNumber.mutateAsync(importForm);
      setShowImportModal(false);
      setImportForm({ e164: '', numberSid: '', class: 'front_desk' });
      alert('Number imported successfully');
    } catch (error: any) {
      alert(`Failed to import number: ${error.message}`);
    }
  };

  const handleQuarantine = async () => {
    if (!showQuarantineModal || !quarantineForm.reason) return;
    try {
      const result = await quarantineNumber.mutateAsync({
        numberId: showQuarantineModal,
        reason: quarantineForm.reason,
        reasonDetail: quarantineForm.reasonDetail,
      });
      alert(`Number quarantined. Impact: ${result.impact.message}`);
      setShowQuarantineModal(null);
      setQuarantineForm({ reason: '', reasonDetail: '' });
    } catch (error: any) {
      alert(`Failed to quarantine: ${error.message}`);
    }
  };

  const handleRelease = async () => {
    if (!showReleaseModal) return;
    try {
      await releaseNumber.mutateAsync(showReleaseModal);
      setShowReleaseModal(null);
      alert('Number released from quarantine');
    } catch (error: any) {
      alert(`Failed to release: ${error.message}`);
    }
  };

  const handleAssign = async () => {
    if (!showAssignModal || !assignForm.sitterId) return;
    try {
      await assignToSitter.mutateAsync({
        numberId: showAssignModal,
        sitterId: assignForm.sitterId,
      });
      setShowAssignModal(null);
      setAssignForm({ sitterId: '' });
      alert('Number assigned to sitter');
    } catch (error: any) {
      alert(`Failed to assign: ${error.message}`);
    }
  };

  const handleReleaseToPool = async () => {
    if (!showReleaseToPoolModal) return;
    try {
      const result = await releaseToPool.mutateAsync(showReleaseToPoolModal);
      alert(`Number released to pool. Impact: ${result.impact.message}`);
      setShowReleaseToPoolModal(null);
    } catch (error: any) {
      alert(`Failed to release to pool: ${error.message}`);
    }
  };

  const numberColumns: TableColumn<Number>[] = [
    { key: 'e164', header: 'Number', render: (n) => n.e164 },
    { key: 'class', header: 'Class', render: (n) => (
      <Badge variant={n.class === 'front_desk' ? 'default' : n.class === 'sitter' ? 'info' : 'neutral'}>
        {n.class === 'front_desk' ? 'Front Desk' : n.class === 'sitter' ? 'Sitter' : 'Pool'}
      </Badge>
    )},
    { key: 'status', header: 'Status', render: (n) => (
      <Badge variant={n.status === 'active' ? 'success' : n.status === 'quarantined' ? 'warning' : 'error'}>
        {n.status}
      </Badge>
    )},
    { key: 'assignedSitter', header: 'Assigned To', render: (n) => n.assignedSitter?.name || 'Unassigned' },
    { key: 'lastUsedAt', header: 'Last Used', render: (n) => n.lastUsedAt ? new Date(n.lastUsedAt).toLocaleDateString() : 'Never' },
    { 
      key: 'actions', 
      header: 'Actions', 
      render: (n) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          {n.status === 'quarantined' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedNumber(n);
                setShowReleaseModal(n.id);
              }}
            >
              Release
            </Button>
          )}
          {n.status === 'active' && n.class === 'sitter' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedNumber(n);
                  setShowAssignModal(n.id);
                }}
              >
                Assign
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedNumber(n);
                  setShowReleaseToPoolModal(n.id);
                }}
              >
                Release to Pool
              </Button>
            </>
          )}
          {n.status === 'active' && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSelectedNumber(n);
                setShowQuarantineModal(n.id);
              }}
            >
              Quarantine
            </Button>
          )}
        </div>
      ),
    },
  ];

  const frontDeskCount = numbers.filter(n => n.class === 'front_desk').length;
  const poolCount = numbers.filter(n => n.class === 'pool').length;
  const sitterCount = numbers.filter(n => n.class === 'sitter').length;

  return (
    <AppShell>
      <PageHeader
        title="Number Inventory"
        description="Manage your messaging phone numbers"
        actions={
          <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
            <Button onClick={() => setShowBuyModal(true)} variant="primary">
              Buy Number
            </Button>
            <Button onClick={() => setShowImportModal(true)} variant="secondary">
              Import Number
            </Button>
          </div>
        }
      />
      <div style={{ padding: tokens.spacing[6] }}>
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {frontDeskCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Front Desk
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {poolCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Pool
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: tokens.typography.fontSize.xl[0], fontWeight: tokens.typography.fontWeight.bold }}>
              {sitterCount}
            </div>
            <div style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
              Sitter
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ display: 'flex', gap: tokens.spacing[3], alignItems: 'center' }}>
            <label style={{ fontWeight: tokens.typography.fontWeight.medium }}>Filter by Class:</label>
            <select
              value={filters.class || ''}
              onChange={(e) => setFilters({ ...filters, class: e.target.value || undefined })}
              style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}` }}
            >
              <option value="">All</option>
              <option value="front_desk">Front Desk</option>
              <option value="pool">Pool</option>
              <option value="sitter">Sitter</option>
            </select>
            <label style={{ fontWeight: tokens.typography.fontWeight.medium }}>Filter by Status:</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
              style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}` }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="quarantined">Quarantined</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Numbers Table */}
        <Card>
          {isLoading ? (
            <Skeleton height={400} />
          ) : numbers.length === 0 ? (
            <EmptyState
              title="No numbers found"
              description="Buy or import numbers to get started"
            />
          ) : (
            <Table
              data={numbers}
              columns={numberColumns}
            />
          )}
        </Card>

        {/* Buy Modal */}
        {showBuyModal && (
          <Modal isOpen={showBuyModal} title="Buy Number" onClose={() => setShowBuyModal(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Number Class
                </label>
                <select
                  value={buyForm.class}
                  onChange={(e) => setBuyForm({ ...buyForm, class: e.target.value as any })}
                  style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}`, width: '100%' }}
                >
                  <option value="front_desk">Front Desk</option>
                  <option value="pool">Pool</option>
                  <option value="sitter">Sitter</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Area Code (optional)
                </label>
                <Input
                  value={buyForm.areaCode}
                  onChange={(e) => setBuyForm({ ...buyForm, areaCode: e.target.value })}
                  placeholder="e.g., 415"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Quantity
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={buyForm.quantity}
                  onChange={(e) => setBuyForm({ ...buyForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowBuyModal(false)} variant="secondary">Cancel</Button>
                <Button onClick={handleBuy} disabled={buyNumber.isPending} variant="primary">
                  {buyNumber.isPending ? 'Purchasing...' : 'Purchase'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <Modal isOpen={showImportModal} title="Import Number" onClose={() => setShowImportModal(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Number Class
                </label>
                <select
                  value={importForm.class}
                  onChange={(e) => setImportForm({ ...importForm, class: e.target.value as any })}
                  style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}`, width: '100%' }}
                >
                  <option value="front_desk">Front Desk</option>
                  <option value="pool">Pool</option>
                  <option value="sitter">Sitter</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  E.164 Number (e.g., +15551234567)
                </label>
                <Input
                  value={importForm.e164}
                  onChange={(e) => setImportForm({ ...importForm, e164: e.target.value })}
                  placeholder="+15551234567"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  OR Twilio Number SID
                </label>
                <Input
                  value={importForm.numberSid}
                  onChange={(e) => setImportForm({ ...importForm, numberSid: e.target.value })}
                  placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowImportModal(false)} variant="secondary">Cancel</Button>
                <Button onClick={handleImport} disabled={importNumber.isPending} variant="primary">
                  {importNumber.isPending ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Quarantine Modal */}
        {showQuarantineModal && selectedNumber && (
          <Modal isOpen={!!showQuarantineModal} title="Quarantine Number" onClose={() => setShowQuarantineModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <p style={{ color: tokens.colors.text.secondary }}>
                Quarantining: <strong>{selectedNumber.e164}</strong>
              </p>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Reason (required)
                </label>
                <Input
                  value={quarantineForm.reason}
                  onChange={(e) => setQuarantineForm({ ...quarantineForm, reason: e.target.value })}
                  placeholder="e.g., Spam complaints, delivery issues"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Details (optional)
                </label>
                <Textarea
                  value={quarantineForm.reasonDetail}
                  onChange={(e) => setQuarantineForm({ ...quarantineForm, reasonDetail: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowQuarantineModal(null)} variant="secondary">Cancel</Button>
                <Button 
                  onClick={handleQuarantine} 
                  disabled={quarantineNumber.isPending || !quarantineForm.reason}
                  variant="danger"
                >
                  {quarantineNumber.isPending ? 'Quarantining...' : 'Quarantine'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Release Modal */}
        {showReleaseModal && selectedNumber && (
          <Modal isOpen={!!showReleaseModal} title="Release from Quarantine" onClose={() => setShowReleaseModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <p>Release <strong>{selectedNumber.e164}</strong> from quarantine?</p>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowReleaseModal(null)} variant="secondary">Cancel</Button>
                <Button onClick={handleRelease} disabled={releaseNumber.isPending} variant="primary">
                  {releaseNumber.isPending ? 'Releasing...' : 'Release'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Assign Modal */}
        {showAssignModal && selectedNumber && (
          <Modal isOpen={!!showAssignModal} title="Assign to Sitter" onClose={() => setShowAssignModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <p style={{ color: tokens.colors.text.secondary }}>
                Assigning: <strong>{selectedNumber.e164}</strong>
              </p>
              <div>
                <label style={{ display: 'block', marginBottom: tokens.spacing[2], fontWeight: tokens.typography.fontWeight.medium }}>
                  Sitter
                </label>
                <select
                  value={assignForm.sitterId}
                  onChange={(e) => setAssignForm({ sitterId: e.target.value })}
                  style={{ padding: tokens.spacing[2], borderRadius: tokens.borderRadius.md, border: `1px solid ${tokens.colors.border.default}`, width: '100%' }}
                >
                  <option value="">Select sitter...</option>
                  {sitters.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowAssignModal(null)} variant="secondary">Cancel</Button>
                <Button onClick={handleAssign} disabled={assignToSitter.isPending || !assignForm.sitterId} variant="primary">
                  {assignToSitter.isPending ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Release to Pool Modal */}
        {showReleaseToPoolModal && selectedNumber && (
          <Modal isOpen={!!showReleaseToPoolModal} title="Release to Pool" onClose={() => setShowReleaseToPoolModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <p>Release <strong>{selectedNumber.e164}</strong> to pool?</p>
              <div style={{ display: 'flex', gap: tokens.spacing[3], justifyContent: 'flex-end' }}>
                <Button onClick={() => setShowReleaseToPoolModal(null)} variant="secondary">Cancel</Button>
                <Button onClick={handleReleaseToPool} disabled={releaseToPool.isPending} variant="primary">
                  {releaseToPool.isPending ? 'Releasing...' : 'Release to Pool'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
