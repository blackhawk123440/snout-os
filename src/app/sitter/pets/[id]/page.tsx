'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader, Button } from '@/components/ui';

export default function SitterPetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <>
      <PageHeader title="Pet details" description="Care info and notes" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Allergies / Meds / Behavior notes</p>
            <p className="mt-1 text-sm text-amber-800">Coming soon: Care notes will appear here from booking details.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <Button variant="secondary" size="md" disabled>
              Emergency Vet
            </Button>
            <p className="mt-2 text-xs text-neutral-500">Coming soon</p>
          </div>
          <Button variant="secondary" size="md" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
    </>
  );
}
