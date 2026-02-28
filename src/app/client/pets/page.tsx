'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
} from '@/components/app';

interface Pet {
  id: string;
  name: string | null;
  species: string | null;
  breed: string | null;
}

export default function ClientPetsPage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/client/pets');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Unable to load pets');
        setPets([]);
        return;
      }
      setPets(Array.isArray(json.pets) ? json.pets : []);
    } catch {
      setError('Unable to load pets');
      setPets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title="Pets"
        subtitle="Your furry family"
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={3} />
      ) : error ? (
        <AppErrorState title="Couldn't load pets" subtitle={error} onRetry={() => void load()} />
      ) : pets.length === 0 ? (
        <AppEmptyState
          title="No pets yet"
          subtitle="Add your pets to get started."
        />
      ) : (
        <div className="space-y-4">
          {pets.map((p) => (
            <AppCard key={p.id} onClick={() => router.push(`/client/pets/${p.id}`)}>
              <AppCardHeader>
                <p className="font-semibold text-neutral-900">{p.name || 'Unnamed pet'}</p>
              </AppCardHeader>
              <AppCardBody>
                <p className="text-sm text-neutral-600">
                  {[p.species, p.breed].filter(Boolean).join(' · ') || 'No details'}
                </p>
              </AppCardBody>
            </AppCard>
          ))}
        </div>
      )}
    </div>
  );
}
