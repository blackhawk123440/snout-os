'use client';

import { useState } from 'react';
import { Button, Modal } from '@/components/ui';
import {
  SitterCard,
  SitterCardBody,
  SitterPageHeader,
  SitterEmptyState,
  FeatureStatusPill,
} from '@/components/sitter';

export default function SitterReportsPage() {
  const [composerOpen, setComposerOpen] = useState(false);
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
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Report Cards"
        subtitle="Daily Delight reports"
        action={
          <div className="flex items-center gap-2">
            <FeatureStatusPill featureKey="reports" />
            <Button variant="primary" size="sm" onClick={() => setComposerOpen(true)}>
              New report
            </Button>
          </div>
        }
      />
      <SitterEmptyState
        title="No reports yet"
        subtitle="Completed Daily Delights will appear here."
        cta={{ label: 'New report', onClick: () => setComposerOpen(true) }}
      />

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
              {generating ? 'Working…' : 'Generate'}
            </Button>
            <Button variant="primary" size="md" onClick={() => setComposerOpen(false)}>
              Send
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 text-center">
            <p className="text-sm text-neutral-500">Photo upload (coming soon)</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Daily Delight text
            </label>
            <textarea
              value={delightText}
              onChange={(e) => setDelightText(e.target.value)}
              placeholder="Generate or type your Daily Delight…"
              className="min-h-32 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
