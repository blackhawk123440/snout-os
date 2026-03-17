'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebarLazy } from '@/components/client/ClientAtAGlanceSidebarLazy';
import { ClientListSecondaryModule } from '@/components/client/ClientListSecondaryModule';
import {
  AppPageHeader,
  AppSkeletonList,
  AppEmptyState,
  AppErrorState,
} from '@/components/app';
import { InteractiveRow } from '@/components/ui/interactive-row';

interface Pet {
  id: string;
  name: string | null;
  species: string | null;
  breed: string | null;
  weight: number | null;
  photoUrl: string | null;
}

export default function ClientPetsPage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const petEmoji = (species: string | null) => {
    if (!species) return '🐾';
    const s = species.toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('bird')) return '🐦';
    if (s.includes('fish')) return '🐠';
    return '🐾';
  };

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
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Pets"
        subtitle="Your furry family"
        action={
          <div className="flex items-center gap-2">
            <ClientRefreshButton onRefresh={load} loading={loading} />
            <button
              type="button"
              onClick={() => router.push('/client/pets/new')}
              className="min-h-[44px] rounded-lg bg-accent-primary px-4 text-sm font-semibold text-text-inverse hover:opacity-90 transition"
            >
              Add pet
            </button>
          </div>
        }
      />
      <div className="lg:grid lg:grid-cols-[1fr,auto] lg:gap-6">
        <div className="min-w-0">
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
            <div className="w-full space-y-3 lg:max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-border-default bg-surface-primary lg:rounded-lg">
                {pets.map((p) => (
                  <InteractiveRow
                    key={p.id}
                    onClick={() => router.push(`/client/pets/${p.id}`)}
                    className="last:border-b-0"
                    aria-label={`View pet ${p.name || 'Unnamed pet'}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name || 'Pet'}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-lg" aria-hidden>
                          {petEmoji(p.species)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{p.name || 'Unnamed pet'}</p>
                        <p className="truncate text-sm text-text-secondary">
                          {[p.species, p.breed, p.weight ? `${p.weight} lbs` : null].filter(Boolean).join(' · ') || 'No details'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0" aria-hidden />
                  </InteractiveRow>
                ))}
              </div>
              <ClientListSecondaryModule variant="pets" />
            </div>
          )}
        </div>
        <ClientAtAGlanceSidebarLazy />
      </div>
    </LayoutWrapper>
  );
}
