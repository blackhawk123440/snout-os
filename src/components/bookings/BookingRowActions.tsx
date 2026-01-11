/**
 * BookingRowActions Component
 * 
 * Shared primitive for sitter assignment actions on booking rows.
 * Works on both mobile and desktop.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs, TabPanel } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { SitterAssignmentDisplay, SitterInfo } from '@/components/sitter/SitterAssignmentDisplay';
import { SitterTierBadge } from '@/components/sitter';
import { useMobile } from '@/lib/use-mobile';

export interface BookingRowActionsProps {
  bookingId: string;
  sitter: SitterInfo | null | undefined;
  sitters: Array<{ id: string; firstName: string; lastName: string; currentTier?: SitterInfo['currentTier'] }>;
  onAssign: (bookingId: string, sitterId: string) => Promise<void>;
  onUnassign: (bookingId: string) => Promise<void>;
  onSitterPoolChange?: (bookingId: string, sitterIds: string[]) => Promise<void>;
  currentPool?: SitterInfo[];
  showInMoreMenu?: boolean; // If true, show actions in More menu instead of direct buttons
  onMoreMenuOpen?: () => void; // Callback when More menu should open
}

export const BookingRowActions: React.FC<BookingRowActionsProps> = ({
  bookingId,
  sitter,
  sitters,
  onAssign,
  onUnassign,
  onSitterPoolChange,
  currentPool = [],
}) => {
  const isMobile = useMobile();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [selectedSitterId, setSelectedSitterId] = useState<string>('');
  const [selectedPoolSitterIds, setSelectedPoolSitterIds] = useState<Set<string>>(
    new Set(currentPool.map(s => s.id))
  );
  const [assignMode, setAssignMode] = useState<'direct' | 'pool'>('direct');
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [savingPool, setSavingPool] = useState(false);

  const handleAssign = async () => {
    if (!selectedSitterId) return;
    setAssigning(true);
    try {
      await onAssign(bookingId, selectedSitterId);
      setShowAssignModal(false);
      setSelectedSitterId('');
    } catch (error) {
      console.error('Failed to assign sitter:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      await onUnassign(bookingId);
      setShowUnassignModal(false);
    } catch (error) {
      console.error('Failed to unassign sitter:', error);
    } finally {
      setUnassigning(false);
    }
  };

  const handleTogglePoolSitter = (sitterId: string) => {
    setSelectedPoolSitterIds(prev => {
      const next = new Set(prev);
      if (next.has(sitterId)) {
        next.delete(sitterId);
      } else {
        next.add(sitterId);
      }
      return next;
    });
  };

  const handleSavePool = async () => {
    if (!onSitterPoolChange) return;
    setSavingPool(true);
    try {
      await onSitterPoolChange(bookingId, Array.from(selectedPoolSitterIds));
      setShowAssignModal(false);
      setSelectedPoolSitterIds(new Set(currentPool.map(s => s.id)));
    } catch (error) {
      console.error('Failed to update sitter pool:', error);
    } finally {
      setSavingPool(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
        <SitterAssignmentDisplay
          sitter={sitter}
          showUnassigned={true}
          compact={true}
          showTierBadge={true}
        />
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          {!sitter ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignModal(true);
              }}
            >
              Assign
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAssignModal(true);
                }}
              >
                Change
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUnassignModal(true);
                }}
              >
                Unassign
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assign Modal with Tabs for Direct Assignment and Sitter Pool */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedSitterId('');
          setAssignMode('direct');
          setSelectedPoolSitterIds(new Set(currentPool.map(s => s.id)));
        }}
        title="Assign Sitter"
        size={isMobile ? 'full' : 'lg'}
      >
        <Tabs
          tabs={[
            { id: 'direct', label: 'Direct Assignment' },
            { id: 'pool', label: 'Sitter Pool' },
          ]}
          activeTab={assignMode}
          onTabChange={(tab) => setAssignMode(tab as 'direct' | 'pool')}
        >
          <TabPanel id="direct">
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <Select
                label="Select Sitter"
                value={selectedSitterId}
                onChange={(e) => setSelectedSitterId(e.target.value)}
                options={[
                  { value: '', label: 'Select a sitter...' },
                  ...sitters.map(s => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName}${s.currentTier ? ` (${s.currentTier.name})` : ''}`,
                  })),
                ]}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedSitterId('');
                    setAssignMode('direct');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssign}
                  disabled={!selectedSitterId || assigning}
                  isLoading={assigning}
                >
                  Assign
                </Button>
              </div>
            </div>
          </TabPanel>
          
          <TabPanel id="pool">
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
                Select one or more sitters for the pool. Multiple sitters can be assigned to this booking.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], maxHeight: '400px', overflowY: 'auto' }}>
                {sitters.map(sitterOption => {
                  const isSelected = selectedPoolSitterIds.has(sitterOption.id);
                  return (
                    <label
                      key={sitterOption.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing[3],
                        padding: tokens.spacing[3],
                        cursor: 'pointer',
                        borderRadius: tokens.borderRadius.md,
                        border: `1px solid ${tokens.colors.border.default}`,
                        backgroundColor: isSelected ? tokens.colors.background.secondary : tokens.colors.background.primary,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTogglePoolSitter(sitterOption.id)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                          {sitterOption.firstName} {sitterOption.lastName}
                        </div>
                        {sitterOption.currentTier && (
                          <div style={{ marginTop: tokens.spacing[1] }}>
                            <SitterTierBadge tier={sitterOption.currentTier} />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignMode('direct');
                    setSelectedPoolSitterIds(new Set(currentPool.map(s => s.id)));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSavePool}
                  disabled={!onSitterPoolChange || savingPool}
                  isLoading={savingPool}
                >
                  Save Pool
                </Button>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </Modal>

      {/* Unassign Confirmation Modal */}
      <Modal
        isOpen={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
        title="Unassign Sitter"
        size={isMobile ? 'full' : 'md'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <p style={{ margin: 0, color: tokens.colors.text.secondary }}>
            Are you sure you want to unassign {sitter ? `${sitter.firstName} ${sitter.lastName}` : 'this sitter'} from this booking?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
            <Button
              variant="secondary"
              onClick={() => setShowUnassignModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleUnassign}
              disabled={unassigning}
            >
              {unassigning ? 'Unassigning...' : 'Unassign'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

