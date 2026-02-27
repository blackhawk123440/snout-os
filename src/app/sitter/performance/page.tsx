'use client';

import { PageHeader } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

export default function SitterPerformancePage() {
  return (
    <>
      <PageHeader title="Performance" description="Your ratings and badges" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Badges</h3>
              <FeatureStatusPill featureKey="badges" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {['On Time', 'Client Favorite', 'Top Sitter'].map((label, i) => (
                <div key={i} className="flex flex-col items-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-4">
                  <div className="mb-2 h-12 w-12 rounded-full bg-amber-100" />
                  <p className="text-sm font-medium text-neutral-700">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Rating summary</h3>
              <FeatureStatusPill featureKey="badges" />
            </div>
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-600">Rating summary</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-700">AI suggestions</p>
              <FeatureStatusPill featureKey="badges" />
            </div>
            <p className="mt-1 text-xs text-neutral-500">Personalized tips to improve your performance</p>
          </div>
        </div>
      </div>
    </>
  );
}
