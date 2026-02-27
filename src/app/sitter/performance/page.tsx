'use client';

import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  FeatureStatusPill,
} from '@/components/sitter';

export default function SitterPerformancePage() {
  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader title="Performance" subtitle="Your ratings and badges" />
      <div className="space-y-4">
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Badges</h3>
              <FeatureStatusPill featureKey="badges" />
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {['On Time', 'Client Favorite', 'Top Sitter'].map((label, i) => (
                <div key={i} className="flex flex-col items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 h-12 w-12 rounded-full bg-amber-100" />
                  <p className="text-sm font-medium text-neutral-700">{label}</p>
                </div>
              ))}
            </div>
          </SitterCardBody>
        </SitterCard>
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Rating summary</h3>
              <FeatureStatusPill featureKey="ratings" />
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-600">Ratings summary (coming soon)</p>
            </div>
          </SitterCardBody>
        </SitterCard>
        <SitterCard className="border-dashed">
          <SitterCardBody>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">AI suggestions</p>
              <FeatureStatusPill featureKey="ai_suggestions" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Personalized tips to improve your performance</p>
          </SitterCardBody>
        </SitterCard>
      </div>
    </div>
  );
}
