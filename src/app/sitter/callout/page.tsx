'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SitterPageHeader, SitterCard, SitterCardBody } from '@/components/sitter';
import { Button } from '@/components/ui';
import { toastSuccess, toastError } from '@/lib/toast';

const REASONS = [
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'other', label: 'Other' },
];

export default function SitterCalloutPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('sick');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ affectedBookings: Array<{ id: string; service: string; clientName: string; startAt: string }> } | null>(null);

  const inputClass = 'w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none';

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/sitter/callout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason, notes: notes.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toastError(json.error || 'Failed'); return; }
      toastSuccess('Callout submitted \u2014 your manager has been notified');
      setResult(json);
    } catch { toastError('Failed to submit callout'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <SitterPageHeader
        title="Call out"
        subtitle="Can't work? Let us know."
        action={<Button variant="secondary" size="sm" onClick={() => router.back()}>Back</Button>}
      />

      {result ? (
        <SitterCard>
          <SitterCardBody>
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-text-primary">Callout submitted</p>
              <p className="mt-1 text-sm text-text-secondary">Your manager has been notified and will reassign your visits.</p>
              {result.affectedBookings.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-sm font-medium text-text-primary mb-2">{result.affectedBookings.length} affected visit{result.affectedBookings.length !== 1 ? 's' : ''}:</p>
                  <div className="space-y-1">
                    {result.affectedBookings.map((b) => (
                      <p key={b.id} className="text-sm text-text-secondary">
                        {b.service} \u00b7 {b.clientName} \u00b7 {new Date(b.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="secondary" size="md" onClick={() => router.push('/sitter/today')} className="mt-4">
                Back to today
              </Button>
            </div>
          </SitterCardBody>
        </SitterCard>
      ) : (
        <SitterCard>
          <SitterCardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Any additional details\u2026" className={`${inputClass} resize-y`} />
              </div>
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={submitting} className="w-full min-h-[44px]">
                {submitting ? 'Submitting\u2026' : 'Submit callout'}
              </Button>
            </div>
          </SitterCardBody>
        </SitterCard>
      )}
    </div>
  );
}
