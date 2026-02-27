'use client';

import { PageHeader } from '@/components/ui';
import { FeatureStatusPill } from '@/components/sitter/FeatureStatusPill';

export default function SitterTrainingPage() {
  return (
    <>
      <PageHeader title="Training" description="Checklists and protocols" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Checklist modules</h3>
              <FeatureStatusPill featureKey="training" />
            </div>
            <div className="space-y-2">
              {['Onboarding', 'Safety basics', 'Client communication'].map((label, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="h-5 w-5 rounded border-2 border-neutral-300" />
                  <span className="text-sm font-medium text-neutral-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Emergency protocol cards</h3>
              <FeatureStatusPill featureKey="training" />
            </div>
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-600">Emergency procedures and contacts</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
