'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { toastSuccess, toastError } from '@/lib/toast';
import { useSitterReportDetail, useUpdateSitterReport } from '@/lib/api/sitter-portal-hooks';

interface ReportData {
  id: string;
  content: string;
  mediaUrls: string[];
  createdAt: string;
  canEdit: boolean;
}

export default function SitterReportEditPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string | undefined;

  const { data: report, isLoading: loading, error } = useSitterReportDetail(reportId ?? null) as {
    data: ReportData | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  const updateReport = useUpdateSitterReport(reportId ?? '');
  const [content, setContent] = useState('');
  const [contentInit, setContentInit] = useState(false);

  // Sync content from fetched report once
  if (report && !contentInit) {
    setContent(report.content ?? '');
    setContentInit(true);
  }

  const handleSave = async () => {
    if (!reportId || !report?.canEdit) return;
    try {
      await updateReport.mutateAsync({ content });
      toastSuccess('Report updated');
      router.push('/sitter/reports');
    } catch {
      toastError('Failed to update report');
    }
  };

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-surface-secondary">
        <div className="flex items-center gap-2 border-b border-border-default bg-surface-primary px-4 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/sitter/reports')} className="rounded-lg p-2 text-text-secondary hover:bg-surface-tertiary" aria-label="Back">
            <i className="fas fa-arrow-left" />
          </Button>
          <h1 className="text-lg font-semibold text-text-primary">Edit report</h1>
        </div>
        <div className="p-4">
          <p className="text-text-tertiary">{loading ? 'Loading…' : 'Report not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="flex items-center gap-2 border-b border-border-default bg-surface-primary px-4 py-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/sitter/reports')} className="rounded-lg p-2 text-text-secondary hover:bg-surface-tertiary" aria-label="Back">
          <i className="fas fa-arrow-left" />
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">Edit report</h1>
      </div>
      <div className="p-4 space-y-4">
        {!report.canEdit && (
          <div className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4">
            <p className="font-semibold text-status-warning-text">Editing no longer available</p>
            <p className="mt-0.5 text-sm text-status-warning-text-secondary">
              Reports can only be edited within 15 minutes of submission.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Report content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!report.canEdit}
            rows={8}
            className="w-full rounded-xl border border-border-strong bg-surface-primary px-4 py-3 text-text-primary disabled:bg-surface-tertiary disabled:text-text-disabled"
            placeholder="What happened during the visit?"
          />
        </div>

        {report.mediaUrls?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">Photos</p>
            <div className="flex flex-wrap gap-2">
              {report.mediaUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-20 w-20 rounded-lg bg-surface-tertiary overflow-hidden"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-tertiary">Photos cannot be changed when editing.</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSave()}
            disabled={updateReport.isPending || !report.canEdit}
            className="min-h-[44px] flex-1"
          >
            {updateReport.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.back()} className="min-h-[44px]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
