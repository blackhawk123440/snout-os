'use client';

import { useCallback, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppErrorState,
} from '@/components/app';
import { Button, Modal } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/loading-state';
import { toastSuccess, toastError } from '@/lib/toast';

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  keyLocation: string | null;
  lockboxCode: string | null;
  doorAlarmCode: string | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  entryInstructions: string | null;
  parkingNotes: string | null;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

const inputClass = 'w-full min-h-[44px] rounded-lg border border-border-default bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus';

export default function ClientProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, contactsRes] = await Promise.all([
        fetch('/api/client/me'),
        fetch('/api/client/emergency-contacts'),
      ]);
      const profileJson = await profileRes.json().catch(() => ({}));
      const contactsJson = await contactsRes.json().catch(() => ({}));
      if (!profileRes.ok) { setError(profileJson.error || 'Unable to load'); setData(null); return; }
      setData(profileJson);
      setContacts(Array.isArray(contactsJson.contacts) ? contactsJson.contacts : []);
    } catch { setError('Unable to load profile'); setData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/client/delete-account', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed');
      setDeleteModalOpen(false);
      await signOut({ callbackUrl: '/login' });
    } catch (e) { toastError(e instanceof Error ? e.message : 'Failed to delete account'); }
    finally { setDeleting(false); }
  };

  return (
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Profile"
        subtitle="Your account"
        action={<ClientRefreshButton onRefresh={load} loading={loading} />}
      />
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <AppErrorState title="Couldn't load profile" subtitle={error} onRetry={() => void load()} />
      ) : data ? (
        <div className="flex flex-col gap-4 pb-8">
          {/* Profile info */}
          <EditableProfileSection data={data} onSaved={load} />

          {/* Home access */}
          <HomeAccessSection data={data} onSaved={load} />

          {/* Emergency contacts */}
          <EmergencyContactsSection contacts={contacts} onChanged={load} />

          {/* Referral */}
          <ReferralSection />

          {/* Actions */}
          <AppCard>
            <AppCardBody>
              <div className="space-y-2">
                <a href="/client/settings/export" className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border-default bg-surface-primary px-4 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
                  Export your data
                </a>
                <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border-default bg-surface-primary px-4 text-sm font-medium text-text-secondary hover:bg-surface-secondary">
                  Sign out
                </button>
              </div>
            </AppCardBody>
          </AppCard>

          {/* Delete account */}
          <AppCard>
            <AppCardBody>
              <p className="mb-2 text-sm font-medium text-text-primary">Delete account</p>
              <p className="mb-3 text-xs text-text-tertiary">Permanently delete your account. This cannot be undone.</p>
              <button type="button" onClick={() => setDeleteModalOpen(true)} className="min-h-[44px] rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 transition">
                Delete account
              </button>
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}

      <Modal isOpen={deleteModalOpen} onClose={() => !deleting && setDeleteModalOpen(false)} title="Delete account" size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="secondary" onClick={() => void handleDeleteAccount()} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete account'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-tertiary">Are you sure? This will permanently delete your account.</p>
      </Modal>
    </LayoutWrapper>
  );
}

/* ─── Editable Profile Section ──────────────────────────────────────── */

function EditableProfileSection({ data, onSaved }: { data: ProfileData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/client/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: draft.firstName.trim() || undefined,
          lastName: draft.lastName.trim() || undefined,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || undefined,
          address: draft.address.trim() || null,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toastError(j.error || 'Failed to save'); return; }
      toastSuccess('Profile updated');
      setEditing(false);
      onSaved();
    } catch { toastError('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Personal Info</h3>
          {!editing && <button type="button" onClick={handleEdit} className="min-h-[44px] text-sm font-medium text-accent-primary hover:underline">Edit</button>}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-text-tertiary mb-1">First name</label><input value={draft.firstName} onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs text-text-tertiary mb-1">Last name</label><input value={draft.lastName} onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))} className={inputClass} /></div>
            </div>
            <div><label className="block text-xs text-text-tertiary mb-1">Email</label><input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-xs text-text-tertiary mb-1">Phone</label><input type="tel" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-xs text-text-tertiary mb-1">Address</label><input value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} placeholder="123 Main St, City, State" className={inputClass} /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="min-h-[44px] px-4 text-sm font-medium text-text-secondary">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 disabled:opacity-50">{saving ? 'Saving\u2026' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-primary">{data.name || 'Client'}</p>
            {data.email && <p className="text-sm text-text-secondary">{data.email}</p>}
            {data.phone && <p className="text-sm text-text-secondary">{data.phone}</p>}
            {data.address ? <p className="text-sm text-text-secondary">{data.address}</p> : <p className="text-sm text-text-tertiary italic">No address on file</p>}
          </div>
        )}
      </AppCardBody>
    </AppCard>
  );
}

/* ─── Referral Section ──────────────────────────────────────────────── */

function ReferralSection() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/client/referral')
      .then((r) => r.json())
      .then((data) => {
        setReferralCode(data.referralCode || null);
        setReferralCount(data.referralCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!referralCode) return;
    const text = `Book pet care with Snout and we both get $10 off! Use code ${referralCode} at snoutservices.com`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  return (
    <AppCard>
      <AppCardHeader>
        <h3 className="text-sm font-semibold text-text-primary">Refer a Friend</h3>
      </AppCardHeader>
      <AppCardBody>
        <p className="text-sm text-text-secondary mb-3">
          Share your code and you both get $10 off your next booking!
        </p>
        {referralCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border-default bg-surface-secondary px-4 py-2 font-mono text-sm font-semibold text-text-primary tracking-wider">
                {referralCode}
              </div>
              <button type="button" onClick={handleCopy} className="min-h-[44px] rounded-lg border border-border-default px-4 text-sm font-medium text-accent-primary hover:bg-surface-secondary transition">
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            {referralCount > 0 && (
              <p className="text-xs text-text-tertiary">
                {referralCount} friend{referralCount !== 1 ? 's' : ''} joined with your code
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary italic">Referral code unavailable</p>
        )}
      </AppCardBody>
    </AppCard>
  );
}

/* ─── Home Access Section ───────────────────────────────────────────── */

function MaskedField({ label, value }: { label: string; value: string | null }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-xs text-text-tertiary">{label}</p>
        <p className="text-sm text-text-primary font-mono">{revealed ? value : '\u2022\u2022\u2022\u2022\u2022\u2022'}</p>
      </div>
      <button type="button" onClick={() => setRevealed(!revealed)} className="min-h-[44px] min-w-[44px] text-xs font-medium text-accent-primary hover:underline">
        {revealed ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function HomeAccessSection({ data, onSaved }: { data: ProfileData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    keyLocation: '', lockboxCode: '', doorAlarmCode: '',
    wifiNetwork: '', wifiPassword: '', entryInstructions: '', parkingNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const hasAny = data.keyLocation || data.lockboxCode || data.doorAlarmCode || data.wifiNetwork || data.entryInstructions || data.parkingNotes;

  const handleEdit = () => {
    setDraft({
      keyLocation: data.keyLocation || '', lockboxCode: data.lockboxCode || '',
      doorAlarmCode: data.doorAlarmCode || '', wifiNetwork: data.wifiNetwork || '',
      wifiPassword: data.wifiPassword || '', entryInstructions: data.entryInstructions || '',
      parkingNotes: data.parkingNotes || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) body[k] = v.trim() || null;
      const res = await fetch('/api/client/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { toastError('Failed to save'); return; }
      toastSuccess('Home access info saved');
      setEditing(false);
      onSaved();
    } catch { toastError('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{'\ud83c\udfe0'} Home Access</h3>
          {!editing && <button type="button" onClick={handleEdit} className="min-h-[44px] text-sm font-medium text-accent-primary hover:underline">Edit</button>}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {editing ? (
          <div className="space-y-3">
            <div><label className="block text-xs text-text-tertiary mb-1">Key location</label><input value={draft.keyLocation} onChange={(e) => setDraft((d) => ({ ...d, keyLocation: e.target.value }))} placeholder="Under the mat, lockbox on porch\u2026" className={inputClass} /></div>
            <div><label className="block text-xs text-text-tertiary mb-1">Lockbox code</label><input value={draft.lockboxCode} onChange={(e) => setDraft((d) => ({ ...d, lockboxCode: e.target.value }))} placeholder="1234" className={inputClass} /></div>
            <div><label className="block text-xs text-text-tertiary mb-1">Door / alarm code</label><input value={draft.doorAlarmCode} onChange={(e) => setDraft((d) => ({ ...d, doorAlarmCode: e.target.value }))} placeholder="4567#" className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-text-tertiary mb-1">WiFi network</label><input value={draft.wifiNetwork} onChange={(e) => setDraft((d) => ({ ...d, wifiNetwork: e.target.value }))} className={inputClass} /></div>
              <div><label className="block text-xs text-text-tertiary mb-1">WiFi password</label><input value={draft.wifiPassword} onChange={(e) => setDraft((d) => ({ ...d, wifiPassword: e.target.value }))} className={inputClass} /></div>
            </div>
            <div><label className="block text-xs text-text-tertiary mb-1">Entry instructions</label><textarea value={draft.entryInstructions} onChange={(e) => setDraft((d) => ({ ...d, entryInstructions: e.target.value }))} rows={2} placeholder="Use side gate, ring doorbell\u2026" className={`${inputClass} resize-y`} /></div>
            <div><label className="block text-xs text-text-tertiary mb-1">Parking</label><input value={draft.parkingNotes} onChange={(e) => setDraft((d) => ({ ...d, parkingNotes: e.target.value }))} placeholder="Driveway, street parking\u2026" className={inputClass} /></div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(false)} className="min-h-[44px] px-4 text-sm font-medium text-text-secondary">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 disabled:opacity-50">{saving ? 'Saving\u2026' : 'Save'}</button>
            </div>
          </div>
        ) : hasAny ? (
          <div className="space-y-2">
            {data.keyLocation && <div><p className="text-xs text-text-tertiary">Key location</p><p className="text-sm text-text-primary">{data.keyLocation}</p></div>}
            <MaskedField label="Lockbox code" value={data.lockboxCode} />
            <MaskedField label="Door / alarm code" value={data.doorAlarmCode} />
            {data.wifiNetwork && <div><p className="text-xs text-text-tertiary">WiFi</p><p className="text-sm text-text-primary">{data.wifiNetwork}</p></div>}
            <MaskedField label="WiFi password" value={data.wifiPassword} />
            {data.entryInstructions && <div><p className="text-xs text-text-tertiary">Entry instructions</p><p className="text-sm text-text-secondary whitespace-pre-wrap">{data.entryInstructions}</p></div>}
            {data.parkingNotes && <div><p className="text-xs text-text-tertiary">Parking</p><p className="text-sm text-text-secondary">{data.parkingNotes}</p></div>}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary italic">No home access info yet. Tap edit to add key location, codes, and entry instructions.</p>
        )}
      </AppCardBody>
    </AppCard>
  );
}

/* ─── Emergency Contacts Section ────────────────────────────────────── */

function EmergencyContactsSection({ contacts, onChanged }: { contacts: EmergencyContact[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '', relationship: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!draft.name.trim() || !draft.phone.trim()) { toastError('Name and phone are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/client/emergency-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.name.trim(), phone: draft.phone.trim(), relationship: draft.relationship.trim() || undefined }),
      });
      if (!res.ok) { toastError('Failed to add contact'); return; }
      toastSuccess('Contact added');
      setDraft({ name: '', phone: '', relationship: '' });
      setAdding(false);
      onChanged();
    } catch { toastError('Failed to add contact'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/client/emergency-contacts/${id}`, { method: 'DELETE' });
      if (res.ok) { toastSuccess('Contact removed'); onChanged(); }
      else toastError('Failed to remove');
    } catch { toastError('Failed to remove'); }
  };

  return (
    <AppCard>
      <AppCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{'\ud83c\udd98'} Emergency Contacts</h3>
          {!adding && <button type="button" onClick={() => setAdding(true)} className="min-h-[44px] text-sm font-medium text-accent-primary hover:underline">Add</button>}
        </div>
      </AppCardHeader>
      <AppCardBody>
        {contacts.length > 0 && (
          <div className="space-y-3 mb-3">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.name}{c.relationship ? ` (${c.relationship})` : ''}</p>
                  <a href={`tel:${c.phone}`} className="text-sm text-accent-primary hover:underline">{c.phone}</a>
                </div>
                <button type="button" onClick={() => handleDelete(c.id)} className="min-h-[44px] min-w-[44px] text-xs text-red-600 hover:underline">Remove</button>
              </div>
            ))}
          </div>
        )}
        {contacts.length === 0 && !adding && (
          <p className="text-sm text-text-tertiary italic mb-2">No emergency contacts yet. Add one so your sitter knows who to call.</p>
        )}
        {adding && (
          <div className="space-y-3 rounded-lg border border-border-default p-3">
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name" className={inputClass} />
            <input type="tel" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Phone number" className={inputClass} />
            <input value={draft.relationship} onChange={(e) => setDraft((d) => ({ ...d, relationship: e.target.value }))} placeholder="Relationship (optional)" className={inputClass} />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setAdding(false)} className="min-h-[44px] px-4 text-sm font-medium text-text-secondary">Cancel</button>
              <button type="button" onClick={handleAdd} disabled={saving} className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 disabled:opacity-50">{saving ? 'Adding\u2026' : 'Add'}</button>
            </div>
          </div>
        )}
      </AppCardBody>
    </AppCard>
  );
}
