'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/layout';
import { AppCard, AppCardBody, AppPageHeader } from '@/components/app';
import { toastSuccess, toastError } from '@/lib/toast';
import { Button } from '@/components/ui';
import { useSubmitMeetGreet } from '@/lib/api/client-hooks';

const inputClass = 'w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none';

export default function MeetGreetPage() {
  const router = useRouter();
  const submitMutation = useSubmitMeetGreet();
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!preferredDateTime.trim()) { toastError('Please enter a preferred date/time'); return; }
    try {
      await submitMutation.mutateAsync({ preferredDateTime: preferredDateTime.trim(), notes: notes.trim() || undefined });
      toastSuccess('Meet & greet request sent!');
      setSent(true);
    } catch { toastError('Failed to send request'); }
  };

  return (
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Meet & Greet"
        subtitle="Meet your sitter before your first visit"
        action={
          <button type="button" onClick={() => router.back()} className="min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary">
            Back
          </button>
        }
      />
      <AppCard>
        <AppCardBody>
          {sent ? (
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-text-primary">Request sent!</p>
              <p className="mt-1 text-sm text-text-secondary">We'll be in touch to schedule your meet & greet.</p>
              <Button variant="primary" size="md" onClick={() => router.push('/client/home')} className="mt-4">
                Back to home
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                A meet & greet is a free consultation where you and your sitter meet to make sure it's a good fit. No payment required.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Preferred date/time *</label>
                <input
                  type="text"
                  value={preferredDateTime}
                  onChange={(e) => setPreferredDateTime(e.target.value)}
                  placeholder="e.g. Next Tuesday afternoon, any weekday morning"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Notes about your pet (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell us about your pet so your sitter can prepare"
                  rows={3}
                  maxLength={1000}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={submitMutation.isPending} isLoading={submitMutation.isPending} className="w-full">
                Request meet & greet
              </Button>
            </div>
          )}
        </AppCardBody>
      </AppCard>
    </LayoutWrapper>
  );
}
