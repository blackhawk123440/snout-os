'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import { ClientAtAGlanceSidebar } from '@/components/client/ClientAtAGlanceSidebar';
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
    <LayoutWrapper variant="narrow">
      <AppPageHeader
        title="Pets"
        subtitle="Your furry family"
        action={<ClientRefreshButton onRefresh={load} loading={loading} />}
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
            <div
              className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${pets.length === 1 ? 'mx-auto max-w-3xl lg:mx-0' : ''}`}
            >
              {pets.map((p) => (
                <InteractiveRow
                  key={p.id}
                  onClick={() => router.push(`/client/pets/${p.id}`)}
                  className="last:border-b-0"
                >
                  <div className="grid min-w-0 grid-cols-1 gap-x-4 sm:grid-cols-[1fr,minmax(0,1fr)]">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{p.name || 'Unnamed pet'}</p>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600">
                      {[p.species, p.breed].filter(Boolean).join(' · ') || 'No details'}
                    </div>
                  </div>
                </InteractiveRow>
              ))}
            </div>
          )}
        </div>
        <ClientAtAGlanceSidebar />
      </div>
    </LayoutWrapper>
  );
}
