'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AppCard,
  AppCardHeader,
  AppCardBody,
  AppPageHeader,
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';

interface PetDetail {
  id: string;
  name: string | null;
  species: string | null;
  breed: string | null;
  notes: string | null;
}

export default function ClientPetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/pets/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Pet not found');
        setPet(null);
        return;
      }
      setPet(json);
    } catch {
      setError('Unable to load pet');
      setPet(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <AppPageHeader
        title={pet?.name || 'Pet details'}
        subtitle={pet ? [pet.species, pet.breed].filter(Boolean).join(' · ') : ''}
        action={
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Back
          </button>
        }
      />
      {loading ? (
        <AppSkeletonList count={2} />
      ) : error ? (
        <AppErrorState title="Couldn't load pet" subtitle={error} onRetry={() => void load()} />
      ) : pet ? (
        <div className="space-y-4">
          <AppCard>
            <AppCardHeader>
              <p className="font-semibold text-neutral-900">{pet.name || 'Unnamed pet'}</p>
            </AppCardHeader>
            <AppCardBody>
              <p className="text-sm text-neutral-600">
                {[pet.species, pet.breed].filter(Boolean).join(' · ') || 'No details'}
              </p>
              {pet.notes && (
                <p className="mt-2 text-sm text-neutral-600">{pet.notes}</p>
              )}
            </AppCardBody>
          </AppCard>
        </div>
      ) : null}
    </div>
  );
}
