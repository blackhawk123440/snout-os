/**
 * Sitter Page Header
 * 
 * Global header for sitter individual page showing:
 * - Sitter name
 * - Status (Active/Inactive/Suspended)
 * - Availability toggle (if permissioned)
 * - Tier badge
 * - Quick actions (permissioned)
 */

'use client';

import { Badge, Button, DropdownMenu, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { SitterTierBadge } from './SitterTierBadge';

interface SitterPageHeaderProps {
  sitter: {
    id: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    currentTier?: {
      id: string;
      name: string;
      priorityLevel: number;
    } | null;
  };
  onAvailabilityToggle?: () => void;
  isAvailable?: boolean;
  canEdit?: boolean; // Permission check
}

export function SitterPageHeader({ 
  sitter, 
  onAvailabilityToggle, 
  isAvailable = true,
  canEdit = false 
}: SitterPageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `${tokens.spacing[4]} ${tokens.spacing[6]}`,
      borderBottom: `1px solid ${tokens.colors.border.default}`,
      backgroundColor: tokens.colors.background.primary,
    }}>
      {/* Left: Name, Status, Tier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
        <div>
          <h1 style={{
            fontSize: tokens.typography.fontSize.xl[0],
            fontWeight: tokens.typography.fontWeight.bold,
            margin: 0,
            marginBottom: tokens.spacing[1],
          }}>
            {sitter.firstName} {sitter.lastName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
            <Badge variant={sitter.isActive ? "success" : "error"}>
              {sitter.isActive ? "Active" : "Inactive"}
            </Badge>
            {canEdit && (
              <Badge 
                variant={isAvailable ? "success" : "default"}
                style={{ cursor: 'pointer' }}
                onClick={onAvailabilityToggle}
              >
                {isAvailable ? "Available" : "Unavailable"}
              </Badge>
            )}
            {sitter.currentTier && (
              <SitterTierBadge tier={sitter.currentTier} />
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Actions */}
      {canEdit && (
        <div style={{ display: 'flex', gap: tokens.spacing[2] }}>
          <DropdownMenu
            trigger={
              <Button variant="secondary" size="sm">
                Actions <i className="fas fa-chevron-down" style={{ marginLeft: tokens.spacing[1] }} />
              </Button>
            }
          >
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => {
                  // TODO: Implement disable sitter
                  console.log('Disable sitter');
                }}
                icon={<i className="fas fa-ban" />}
              >
                Disable Sitter
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // TODO: Implement add note
                  console.log('Add note');
                }}
                icon={<i className="fas fa-sticky-note" />}
              >
                Add Internal Note
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Navigate to Activity tab
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'activity');
                  window.location.href = url.toString();
                }}
                icon={<i className="fas fa-history" />}
              >
                Open Audit Log
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
