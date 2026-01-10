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
import { tokens } from '@/lib/design-tokens';
import { SitterAssignmentDisplay, SitterInfo } from '@/components/sitter/SitterAssignmentDisplay';
import { useMobile } from '@/lib/use-mobile';

export interface BookingRowActionsProps {
  bookingId: string;
  sitter: SitterInfo | null | undefined;
  sitters: Array<{ id: string; firstName: string; lastName: string; currentTier?: SitterInfo['currentTier'] }>;
  onAssign: (bookingId: string, sitterId: string) => Promise<void>;
  onUnassign: (bookingId: string) => Promise<void>;
  showInMoreMenu?: boolean; // If true, show actions in More menu instead of direct buttons
  onMoreMenuOpen?: () => void; // Callback when More menu should open
}

export const BookingRowActions: React.FC<BookingRowActionsProps> = ({
  bookingId,
  sitter,
  sitters,
  onAssign,
  onUnassign,
}) => {
  const isMobile = useMobile();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [selectedSitterId, setSelectedSitterId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

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

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedSitterId('');
        }}
        title="Assign Sitter"
        size={isMobile ? 'full' : 'md'}
      >
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
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              disabled={!selectedSitterId || assigning}
            >
              {assigning ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </div>
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

