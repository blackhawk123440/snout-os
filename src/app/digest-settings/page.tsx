/**
 * Weekly Digest Settings — /digest-settings
 *
 * Preview and configure the weekly owner intelligence digest email.
 * Connected to GET /api/ops/digest/preview.
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OwnerAppShell, LayoutWrapper, PageHeader } from '@/components/layout';
import { Panel, Button, Skeleton } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

export default function DigestSettingsPage() {
  const [showPreview, setShowPreview] = useState(false);

  const { data: previewHtml, isLoading } = useQuery({
    queryKey: ['digest-preview'],
    queryFn: async () => {
      const res = await fetch('/api/ops/digest/preview');
      if (!res.ok) return null;
      return res.text();
    },
    enabled: showPreview,
  });

  return (
    <OwnerAppShell>
      <LayoutWrapper>
        <PageHeader
          title="Weekly Digest"
          subtitle="Intelligence email sent every Monday at 8am"
        />

        <div className="px-4 flex flex-col gap-4">
          <Panel>
            <div className="p-4">
              <h3 className="font-semibold mb-2">What's included</h3>
              <ul className="text-sm text-text-secondary pl-5 flex flex-col gap-1.5">
                <li>Revenue this week vs last week (with trend arrow)</li>
                <li>Total bookings, new clients, active sitters</li>
                <li>Top SRS-scoring sitter</li>
                <li>Action items: unpaid bookings, failed payouts</li>
                <li>Revenue forecast for the month</li>
              </ul>

              <div className="mt-4">
                <Button onClick={() => setShowPreview(true)} disabled={showPreview && isLoading}>
                  {isLoading ? 'Loading preview…' : 'Preview Digest Email'}
                </Button>
              </div>
            </div>
          </Panel>

          {showPreview && (
            <Panel>
              <div className="p-4">
                <h3 className="font-semibold mb-3">Email Preview</h3>
                {isLoading ? (
                  <Skeleton height="400px" />
                ) : previewHtml ? (
                  <div
                    style={{
                      border: `1px solid ${tokens.colors.border.default}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      maxHeight: 600,
                      overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="text-text-tertiary">Could not generate preview. Make sure you have booking data.</p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
