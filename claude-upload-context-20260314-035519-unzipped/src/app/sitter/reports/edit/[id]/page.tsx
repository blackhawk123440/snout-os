'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { toastSuccess, toastError } from '@/lib/toast';

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

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReport = useCallback(async () => {
    if (!reportId) {
      toastError('Missing report id');
      router.replace('/sitter/reports');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sitter/reports/${reportId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toastError('You do not have access to this report');
          router.replace('/sitter/reports');
          return;
        }
        if (res.status === 404) {
          toastError('Report not found');
          router.replace('/sitter/reports');
          return;
        }
        toastError(data.error || 'Failed to load report');
        return;
      }
      setReport(data);
      setContent(data.content ?? '');
    } catch {
      toastError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId, router]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleSave = async () => {
    if (!reportId || !report?.canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sitter/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastError(data.error || data.message || 'Failed to update report');
        return;
      }
      toastSuccess('Report updated');
      router.push('/sitter/reports');
    } catch {
      toastError('Failed to update report');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
          <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/sitter/reports')} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Back">
            <i className="fas fa-arrow-left" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Edit report</h1>
        </div>
        <div className="p-4">
          <p className="text-gray-500">{loading ? 'Loading…' : 'Report not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/sitter/reports')} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Back">
          <i className="fas fa-arrow-left" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">Edit report</h1>
      </div>
      <div className="p-4 space-y-4">
        {!report.canEdit && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">Editing no longer available</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Reports can only be edited within 15 minutes of submission.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!report.canEdit}
            rows={8}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="What happened during the visit?"
          />
        </div>

        {report.mediaUrls?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Photos</p>
            <div className="flex flex-wrap gap-2">
              {report.mediaUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-20 w-20 rounded-lg bg-gray-200 overflow-hidden"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Photos cannot be changed when editing.</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => void handleSave()}
            disabled={saving || !report.canEdit}
            className="min-h-[44px] flex-1"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => router.back()} className="min-h-[44px]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
