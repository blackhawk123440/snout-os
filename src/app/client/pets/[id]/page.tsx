'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LayoutWrapper } from '@/components/layout';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';
import { Button } from '@/components/ui';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  useClientPetDetail,
  useUpdateClientPet,
  useAddPetHealthLog,
  type ClientPetDetail,
  type ClientPetHealthLog,
  type ClientPetEmergencyContact,
} from '@/lib/api/client-hooks';

// Re-export local aliases for sub-component signatures
type PetDetail = ClientPetDetail;
type HealthLog = ClientPetHealthLog;

const genderLabel = (g: string | null) => {
  if (g === 'female') return '\u2640';
  if (g === 'male') return '\u2642';
  return '';
};

const formatDate = (d: string | null) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

const healthLogIcon = (type: string) => {
  switch (type) {
    case 'daily': return '\ud83d\udcd3';
    case 'alert': return '\u26a0\ufe0f';
    case 'vet': return '\ud83c\udfe5';
    case 'allergy': return '\ud83e\udd27';
    default: return '\ud83d\udccb';
  }
};

export default function ClientPetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { data: pet, isLoading: loading, error, refetch } = useClientPetDetail(id);
  const updatePet = useUpdateClientPet(id);

  const savePetField = async (data: Record<string, unknown>) => {
    await updatePet.mutateAsync(data);
  };

  const onSaved = () => {
    // Mutation's onSuccess already invalidates the query — no manual refetch needed.
    // This callback exists for sub-component compatibility.
  };

  if (loading) {
    return (
      <LayoutWrapper variant="narrow">
        <AppPageHeader title="Pet details" />
        <AppSkeletonList count={4} />
      </LayoutWrapper>
    );
  }

  if (error || !pet) {
    return (
      <LayoutWrapper variant="narrow">
        <AppPageHeader title="Pet details" />
        <AppErrorState title="Couldn't load pet" subtitle={error?.message || ''} onRetry={() => void refetch()} />
      </LayoutWrapper>
    );
  }

  const subtitle = [pet.species, pet.breed].filter(Boolean).join(' \u00b7 ');
  const details = [
    pet.birthday ? formatDate(pet.birthday) : null,
    pet.weight ? `${pet.weight} lbs` : null,
    genderLabel(pet.gender),
    pet.isFixed ? 'Fixed' : null,
    pet.color,
  ].filter(Boolean).join(' \u00b7 ');

  return (
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title={pet.name || 'Pet details'}
        subtitle={subtitle}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="min-h-[44px] text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            Back
          </button>
        }
      />
      <div className="space-y-4 pb-8">
        {/* Profile header with photo */}
        <AppCard>
          <AppCardBody>
            <div className="flex items-center gap-4">
              {pet.photoUrl ? (
                <img src={pet.photoUrl} alt={pet.name || 'Pet'} className="h-20 w-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-3xl">
                  {pet.species?.toLowerCase().includes('dog') ? '\ud83d\udc15' :
                   pet.species?.toLowerCase().includes('cat') ? '\ud83d\udc08' : '\ud83d\udc3e'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-text-primary">{pet.name}</h2>
                <p className="text-sm text-text-secondary">{subtitle}</p>
                {details && <p className="text-sm text-text-tertiary mt-0.5">{details}</p>}
                {pet.microchipId && (
                  <p className="text-xs text-text-tertiary mt-1">Microchip: {pet.microchipId}</p>
                )}
              </div>
            </div>
          </AppCardBody>
        </AppCard>

        {/* Profile Photo URL edit */}
        <EditableTextSection
          title="Profile Photo"
          icon={'\ud83d\udcf7'}
          value={pet.photoUrl}
          fieldKey="photoUrl"
          placeholder="Paste a photo URL for your pet's profile picture"
          onSave={savePetField}
          onSaved={onSaved}
          inputType="url"
        />

        {/* Feeding */}
        <EditableTextSection
          title="Feeding"
          icon={'\ud83c\udf7d\ufe0f'}
          value={pet.feedingInstructions}
          fieldKey="feedingInstructions"
          placeholder="No feeding instructions yet. Tap edit to add."
          onSave={savePetField}
          onSaved={onSaved}
        />

        {/* Medications */}
        <EditableTextSection
          title="Medications"
          icon={'\ud83d\udc8a'}
          value={pet.medicationNotes}
          fieldKey="medicationNotes"
          placeholder="No medication notes yet. Tap edit to add."
          onSave={savePetField}
          onSaved={onSaved}
        />

        {/* Behavior & Walk Notes */}
        <AppCard>
          <AppCardHeader>
            <div className="flex items-center gap-2">
              <span aria-hidden>{'\ud83d\udc3e'}</span>
              <h3 className="text-sm font-semibold text-text-primary lg:text-base">Behavior & Walk Notes</h3>
            </div>
          </AppCardHeader>
          <AppCardBody>
            <DualFieldEditor
              fields={[
                { key: 'behaviorNotes', label: 'Behavior', value: pet.behaviorNotes, placeholder: 'No behavior notes yet.' },
                { key: 'walkInstructions', label: 'Walk instructions', value: pet.walkInstructions, placeholder: 'No walk instructions yet.' },
              ]}
              onSave={savePetField}
              onSaved={onSaved}
            />
          </AppCardBody>
        </AppCard>

        {/* House Rules */}
        <EditableTextSection
          title="House Rules"
          icon={'\ud83c\udfe0'}
          value={pet.houseRules}
          fieldKey="houseRules"
          placeholder="No house rules yet. Tap edit to add."
          onSave={savePetField}
          onSaved={onSaved}
        />

        {/* Vet Info */}
        <VetSection pet={pet} onSave={savePetField} onSaved={onSaved} />

        {/* Health Timeline */}
        <HealthTimelineSection petId={id} healthLogs={pet.healthLogs} />

        {/* Emergency Contacts */}
        <AppCard>
          <AppCardHeader>
            <div className="flex items-center gap-2">
              <span aria-hidden>{'\ud83c\udd98'}</span>
              <h3 className="text-sm font-semibold text-text-primary lg:text-base">Emergency Contacts</h3>
            </div>
          </AppCardHeader>
          <AppCardBody>
            {pet.emergencyContacts.length === 0 ? (
              <p className="text-sm text-text-tertiary">No emergency contacts on file.</p>
            ) : (
              <div className="space-y-3">
                {pet.emergencyContacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {c.name}{c.relationship ? ` (${c.relationship})` : ''}
                      </p>
                      <a href={`tel:${c.phone}`} className="text-sm text-accent-primary hover:underline">
                        {c.phone}
                      </a>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-tertiary text-lg hover:bg-surface-secondary transition"
                      aria-label={`Call ${c.name}`}
                    >
                      {'\ud83d\udcde'}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </AppCardBody>
        </AppCard>

        {/* General Notes */}
        <EditableTextSection
          title="Notes"
          icon={'\ud83d\udcdd'}
          value={pet.notes}
          fieldKey="notes"
          placeholder="No additional notes. Tap edit to add."
          onSave={savePetField}
          onSaved={onSaved}
        />
      </div>
    </LayoutWrapper>
  );
}

/* ─── Inline Editable Text Section ──────────────────────────────────── */

function EditableTextSection({
  title, icon, value, fieldKey, placeholder, onSave, onSaved, inputType,
}: {
  title: string;
  icon: string;
  value: string | null;
  fieldKey: string;
  placeholder: string;
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onSaved: () => void;
  inputType?: 'text' | 'url';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft(value || '');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ [fieldKey]: draft.trim() || null });
      toastSuccess('Saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden>{icon}</span>
            <h3 className="text-sm font-semibold text-text-primary lg:text-base">{title}</h3>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={handleEdit}
              className="min-h-[44px] min-w-[44px] text-sm font-medium text-accent-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {editing ? (
          <div className="space-y-2">
            {inputType === 'url' ? (
              <input
                type="url"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                className="w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                autoFocus
              />
            ) : (
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus resize-y"
                autoFocus
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="md" onClick={handleCancel}>Cancel</Button>
              <Button variant="primary" size="md" onClick={handleSave} disabled={saving} isLoading={saving}>Save</Button>
            </div>
          </div>
        ) : (
          <p className={`text-sm whitespace-pre-wrap ${value ? 'text-text-secondary' : 'text-text-tertiary italic'}`}>
            {value || placeholder}
          </p>
        )}
      </AppCardBody>
    </AppCard>
  );
}

/* ─── Dual Field Editor (behavior + walk) ───────────────────────────── */

function DualFieldEditor({
  fields, onSave, onSaved,
}: {
  fields: Array<{ key: string; label: string; value: string | null; placeholder: string }>;
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    const d: Record<string, string> = {};
    for (const f of fields) d[f.key] = f.value || '';
    setDrafts(d);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      for (const f of fields) data[f.key] = drafts[f.key]?.trim() || null;
      await onSave(data);
      toastSuccess('Saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-text-secondary mb-1">{f.label}</label>
            <textarea
              value={drafts[f.key] || ''}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus resize-y"
            />
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="md" onClick={() => setEditing(false)}>Cancel</Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving} isLoading={saving}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleEdit}
          className="min-h-[44px] min-w-[44px] text-sm font-medium text-accent-primary hover:underline"
        >
          Edit
        </button>
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <p className="text-xs font-medium text-text-secondary mb-0.5">{f.label}</p>
          <p className={`text-sm whitespace-pre-wrap ${f.value ? 'text-text-secondary' : 'text-text-tertiary italic'}`}>
            {f.value || f.placeholder}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Vet Section ───────────────────────────────────────────────────── */

function VetSection({
  pet, onSave, onSaved,
}: {
  pet: PetDetail;
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ vetName: '', vetClinicName: '', vetPhone: '', vetAddress: '' });
  const [saving, setSaving] = useState(false);

  const hasVet = pet.vetName || pet.vetClinicName || pet.vetPhone;

  const handleEdit = () => {
    setDraft({
      vetName: pet.vetName || '',
      vetClinicName: pet.vetClinicName || '',
      vetPhone: pet.vetPhone || '',
      vetAddress: pet.vetAddress || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        vetName: draft.vetName.trim() || null,
        vetClinicName: draft.vetClinicName.trim() || null,
        vetPhone: draft.vetPhone.trim() || null,
        vetAddress: draft.vetAddress.trim() || null,
      });
      toastSuccess('Saved');
      setEditing(false);
      onSaved();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus';

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden>{'\ud83c\udfe5'}</span>
            <h3 className="text-sm font-semibold text-text-primary lg:text-base">Veterinarian</h3>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={handleEdit}
              className="min-h-[44px] min-w-[44px] text-sm font-medium text-accent-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Vet name</label>
              <input type="text" value={draft.vetName} onChange={(e) => setDraft((d) => ({ ...d, vetName: e.target.value }))} placeholder="Dr. Smith" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Clinic name</label>
              <input type="text" value={draft.vetClinicName} onChange={(e) => setDraft((d) => ({ ...d, vetClinicName: e.target.value }))} placeholder="Madison Vet Clinic" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Phone</label>
              <input type="tel" value={draft.vetPhone} onChange={(e) => setDraft((d) => ({ ...d, vetPhone: e.target.value }))} placeholder="(256) 555-0123" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Address</label>
              <input type="text" value={draft.vetAddress} onChange={(e) => setDraft((d) => ({ ...d, vetAddress: e.target.value }))} placeholder="123 Main St, Madison AL" className={inputClass} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="md" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="md" onClick={handleSave} disabled={saving} isLoading={saving}>Save</Button>
            </div>
          </div>
        ) : hasVet ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              {[pet.vetName, pet.vetClinicName].filter(Boolean).join(' \u00b7 ')}
            </p>
            {pet.vetPhone && (
              <div className="flex items-center gap-2">
                <a href={`tel:${pet.vetPhone}`} className="text-sm text-accent-primary hover:underline">{pet.vetPhone}</a>
                <a
                  href={`tel:${pet.vetPhone}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-tertiary text-lg hover:bg-surface-secondary transition"
                  aria-label="Call vet"
                >
                  {'\ud83d\udcde'}
                </a>
              </div>
            )}
            {pet.vetAddress && <p className="text-sm text-text-tertiary">{pet.vetAddress}</p>}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary italic">No vet info yet. Tap edit to add.</p>
        )}
      </AppCardBody>
    </AppCard>
  );
}

/* ─── Health Timeline Section ───────────────────────────────────────── */

function HealthTimelineSection({
  petId, healthLogs,
}: {
  petId: string;
  healthLogs: HealthLog[];
}) {
  const addHealthLog = useAddPetHealthLog(petId);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<string>('daily');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    if (!note.trim()) return;
    try {
      await addHealthLog.mutateAsync({ type, note: note.trim() });
      toastSuccess('Health note added');
      setNote('');
      setAdding(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to add health note');
    }
  };

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden>{'\ud83d\udccb'}</span>
            <h3 className="text-sm font-semibold text-text-primary lg:text-base">Health Timeline</h3>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="min-h-[44px] min-w-[44px] text-sm font-medium text-accent-primary hover:underline"
            >
              Add note
            </button>
          )}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {adding && (
          <div className="mb-4 space-y-2 rounded-lg border border-border-default p-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
            >
              <option value="daily">Daily note</option>
              <option value="alert">Alert</option>
              <option value="vet">Vet visit</option>
              <option value="allergy">Allergy</option>
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened?"
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none resize-y"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="md" onClick={() => { setAdding(false); setNote(''); }}>Cancel</Button>
              <Button variant="primary" size="md" onClick={handleSubmit} disabled={addHealthLog.isPending || !note.trim()} isLoading={addHealthLog.isPending}>Add</Button>
            </div>
          </div>
        )}
        {healthLogs.length === 0 ? (
          <p className="text-sm text-text-tertiary italic">No health notes yet.</p>
        ) : (
          <div className="space-y-3">
            {healthLogs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <span className="text-base shrink-0 mt-0.5" aria-hidden>{healthLogIcon(log.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-tertiary">
                    {formatDate(log.createdAt)} &mdash; {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                  </p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{log.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCardBody>
    </AppCard>
  );
}
