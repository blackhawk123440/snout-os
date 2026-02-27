'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import {
  SitterCard,
  SitterCardBody,
  SitterPageHeader,
  FeatureStatusPill,
} from '@/components/sitter';

export default function SitterPetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader
        title="Pet details"
        subtitle="Care info and notes"
        action={
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            Back
          </Button>
        }
      />
      <div className="space-y-4">
        <SitterCard className="border-amber-200 bg-amber-50">
          <SitterCardBody>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-900">Allergies / Meds / Behavior notes</p>
              <FeatureStatusPill featureKey="care_notes" />
            </div>
            <p className="mt-1 text-sm text-amber-800">Care notes will appear here from booking details.</p>
          </SitterCardBody>
        </SitterCard>
        <SitterCard>
          <SitterCardBody>
            <Button variant="secondary" size="md" disabled>
              Emergency vet
            </Button>
            <FeatureStatusPill featureKey="emergency_vet" className="ml-2" />
          </SitterCardBody>
        </SitterCard>
      </div>
    </div>
  );
}
