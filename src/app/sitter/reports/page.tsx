'use client';

import { useState } from 'react';
import { PageHeader, Button, Modal } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

export default function SitterReportsPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [delightText, setDelightText] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setDelightText('Today went great! [Stub: Generate calls API when booking selected]');
      setGenerating(false);
    }, 500);
  };

  return (
    <>
      <PageHeader
        title="Report Cards"
        description="Daily Delight reports"
        actions={<FeatureStatusPill featureKey="reports" />}
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <div className="mb-4 flex justify-end">
          <Button variant="primary" size="md" onClick={() => setComposerOpen(true)}>
            New Report
          </Button>
        </div>
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
          <p className="text-sm text-neutral-600">Report history</p>
          <p className="mt-1 text-xs text-neutral-500">Completed Daily Delights will appear here.</p>
        </div>
      </div>

      <Modal
        isOpen={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="New Report"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" size="md" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Working...' : 'Generate / Regenerate'}
            </Button>
            <Button variant="primary" size="md" onClick={() => alert('Send (toast only for now)')}>
              Send
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-sm text-neutral-500">Photo upload area</p>
            <p className="mt-1 text-xs text-neutral-400">Coming soon</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Delight text
            </label>
            <textarea
              value={delightText}
              onChange={(e) => setDelightText(e.target.value)}
              placeholder="Generate or type your Daily Delight..."
              className="min-h-32 w-full rounded-md border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
