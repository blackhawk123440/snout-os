'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { AppCard, AppCardBody, AppErrorState } from '@/components/app';
import { Button } from '@/components/ui';

export default function ClientExportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/export');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutWrapper variant="narrow">
      <PageHeader
        title="Export your data"
        subtitle="Download a copy of your profile, pets, bookings, reports, messages, and payment history"
      />
      <Section>
      {error ? (
        <AppErrorState
          title="Export failed"
          subtitle={error}
          onRetry={() => {
            setError(null);
            void handleDownload();
          }}
        />
      ) : (
        <AppCard>
          <AppCardBody>
            <p className="mb-4 text-sm text-text-secondary">
              You can download all your data as a JSON file. This includes your profile, pets, bookings, visit reports, messages, and payment history.
            </p>
            <Button
              variant="primary"
              onClick={() => void handleDownload()}
              disabled={loading}
              leftIcon={<Download className="h-4 w-4" />}
            >
              {loading ? 'Preparing...' : 'Download export'}
            </Button>
          </AppCardBody>
        </AppCard>
      )}
      </Section>
    </LayoutWrapper>
  );
}
