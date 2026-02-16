/**
 * Sitter Profile Tab
 * 
 * Static identity information only - no operational content
 * Scope: Identity, contact, status, commission
 */

'use client';

import { Card, Button, Badge, SectionHeader } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { SitterTierBadge } from './SitterTierBadge';

interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  isActive: boolean;
  commissionPercentage: number;
  maskedNumber?: string;
  currentTier?: {
    id: string;
    name: string;
    priorityLevel: number;
  } | null;
}

interface SitterProfileTabProps {
  sitter: Sitter;
  isMobile: boolean;
}

export function SitterProfileTab({ sitter, isMobile }: SitterProfileTabProps) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
        {/* Identity Information */}
        <Card>
          <SectionHeader title="Identity" />
          <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Name
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                {sitter.firstName} {sitter.lastName}
              </div>
            </div>
            {sitter.currentTier && (
              <div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                  Tier
                </div>
                <SitterTierBadge tier={sitter.currentTier} />
              </div>
            )}
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Status
              </div>
              <Badge variant={sitter.isActive ? "success" : "error"}>
                {sitter.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <SectionHeader title="Contact" />
          <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Email
              </div>
              <a href={`mailto:${sitter.email}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                {sitter.email}
              </a>
            </div>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Phone
              </div>
              <a href={`tel:${sitter.phone}`} style={{ color: tokens.colors.primary.DEFAULT, textDecoration: 'none' }}>
                {sitter.phone}
              </a>
            </div>
          </div>
        </Card>

        {/* Commission */}
        <Card>
          <SectionHeader title="Commission" />
          <div style={{ padding: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Commission Rate
              </div>
              <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
                {sitter.commissionPercentage || 80}%
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Desktop layout - single column, consistent card widths, aligned to baseline grid
  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing[4],
      maxWidth: '800px',
    }}>
      {/* Identity Information */}
      <Card>
        <SectionHeader title="Identity" />
        <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Name
            </div>
            <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
              {sitter.firstName} {sitter.lastName}
            </div>
          </div>
          {sitter.currentTier && (
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Tier
              </div>
              <SitterTierBadge tier={sitter.currentTier} />
            </div>
          )}
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Status
            </div>
            <Badge variant={sitter.isActive ? "success" : "error"}>
              {sitter.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card>
        <SectionHeader title="Contact" />
        <div style={{ padding: tokens.spacing[4], display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Email
            </div>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => window.location.href = `mailto:${sitter.email}`}
              leftIcon={<i className="fas fa-envelope" />}
            >
              {sitter.email}
            </Button>
          </div>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Phone
            </div>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => window.location.href = `tel:${sitter.phone}`}
              leftIcon={<i className="fas fa-phone" />}
            >
              {sitter.phone}
            </Button>
          </div>
        </div>
      </Card>

      {/* Commission */}
      <Card>
        <SectionHeader title="Commission" />
        <div style={{ padding: tokens.spacing[4] }}>
          <div>
            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
              Commission Rate
            </div>
            <div style={{ fontWeight: tokens.typography.fontWeight.semibold, fontSize: tokens.typography.fontSize.base[0] }}>
              {sitter.commissionPercentage || 80}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
