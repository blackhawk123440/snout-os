'use client';

import { useState } from 'react';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
  FeatureStatusPill,
} from '@/components/sitter';

const MODULES = [
  { id: 'onboarding', label: 'Onboarding', done: true },
  { id: 'safety', label: 'Safety basics', done: true },
  { id: 'communication', label: 'Client communication', done: false },
];

export default function SitterTrainingPage() {
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.id, m.done]))
  );

  const toggle = (id: string) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader title="Training" subtitle="Checklists and protocols" />
      <div className="space-y-4">
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Checklist modules</h3>
              <FeatureStatusPill featureKey="training" />
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="space-y-2">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                      completed[m.id] ? 'border-green-500 bg-green-500 text-white' : 'border-neutral-300'
                    }`}
                  >
                    {completed[m.id] && <i className="fas fa-check text-xs" />}
                  </div>
                  <span className={`text-sm font-medium ${completed[m.id] ? 'text-neutral-500 line-through' : 'text-neutral-700'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </SitterCardBody>
        </SitterCard>
        <SitterCard>
          <SitterCardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Emergency protocol cards</h3>
              <FeatureStatusPill featureKey="training" />
            </div>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
              <p className="text-sm text-neutral-600">Emergency procedures and contacts (coming soon)</p>
            </div>
          </SitterCardBody>
        </SitterCard>
      </div>
    </div>
  );
}
