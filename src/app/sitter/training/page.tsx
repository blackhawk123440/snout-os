'use client';

import { useEffect, useState } from 'react';
import {
  SitterCard,
  SitterCardHeader,
  SitterCardBody,
  SitterPageHeader,
} from '@/components/sitter';

const MODULES = [
  {
    id: 'company_policies',
    label: 'Company Policies',
    description: 'Professional conduct, dress code, client confidentiality, cancellation procedures.',
  },
  {
    id: 'safety_procedures',
    label: 'Safety Procedures',
    description: 'Pet handling safety, recognizing signs of distress, heat/cold safety, avoiding hazards on walks.',
  },
  {
    id: 'gps_checkin',
    label: 'GPS Check-In / Check-Out',
    description: 'How to use the Start Visit and End Visit buttons. GPS captures your location for accountability.',
  },
  {
    id: 'visit_reports',
    label: 'Visit Report Instructions',
    description: 'How to submit a visit report with photos, structured details (walk, potty, food, water, meds), and a personal note.',
  },
  {
    id: 'emergency_protocol',
    label: 'Emergency Protocol',
    description: 'What to do if a pet is injured or sick. Finding vet info and emergency contacts in the pet profile. When to call the owner.',
  },
  {
    id: 'payment_tips',
    label: 'Payment & Tipping',
    description: 'How payouts work (automatic on check-out via Stripe). Tip links and how clients can tip.',
  },
  {
    id: 'medication_admin',
    label: 'Medication Administration',
    description: 'How to read medication instructions on pet profiles. Logging medication given in your visit report.',
  },
  {
    id: 'client_communication',
    label: 'Client Communication',
    description: 'Messaging etiquette, when to contact the owner vs the client, using the in-app messaging system.',
  },
];

const STORAGE_KEY = 'snout-sitter-training';

export default function SitterTrainingPage() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompleted(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const doneCount = MODULES.filter((m) => completed[m.id]).length;
  const pct = Math.round((doneCount / MODULES.length) * 100);

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <SitterPageHeader title="Training" subtitle={`${doneCount}/${MODULES.length} completed`} />

      <div className="space-y-4">
        {/* Progress */}
        <SitterCard>
          <SitterCardBody>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-text-primary">Training Progress</p>
              <span className="text-sm font-bold text-accent-primary">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
              <div className="h-full rounded-full bg-accent-primary transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </SitterCardBody>
        </SitterCard>

        {/* Modules */}
        <SitterCard>
          <SitterCardHeader>
            <h3 className="font-semibold text-text-primary">Training Modules</h3>
          </SitterCardHeader>
          <SitterCardBody>
            <div className="space-y-1">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border-default bg-surface-primary px-4 py-3 text-left transition hover:border-border-strong min-h-[44px]"
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                    completed[m.id] ? 'border-green-500 bg-green-500 text-white' : 'border-border-strong'
                  }`}>
                    {completed[m.id] && <i className="fas fa-check text-xs" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${completed[m.id] ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                      {m.label}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{m.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </SitterCardBody>
        </SitterCard>
      </div>
    </div>
  );
}
