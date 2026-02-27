'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button } from '@/components/ui';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  bookingId: string;
  clientName?: string;
}

export default function SitterPetsPage() {
  const router = useRouter();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, calRes] = await Promise.all([
        fetch('/api/sitter/today'),
        fetch('/api/sitter/calendar'),
      ]);
      const todayData = await todayRes.json().catch(() => ({}));
      const calData = await calRes.json().catch(() => ({}));
      if (!todayRes.ok && !calRes.ok) {
        setError('Unable to load pets');
        setPets([]);
        return;
      }
      const allBookings = [
        ...(Array.isArray(todayData.bookings) ? todayData.bookings : []),
        ...(Array.isArray(calData.bookings) ? calData.bookings : []),
      ];
      const seen = new Set<string>();
      const petList: Pet[] = [];
      for (const b of allBookings) {
        for (const p of b.pets || []) {
          if (p.id && !seen.has(p.id)) {
            seen.add(p.id);
            petList.push({
              id: p.id,
              name: p.name || p.species || 'Pet',
              species: p.species || 'Pet',
              breed: p.breed,
              bookingId: b.id,
              clientName: b.clientName,
            });
          }
        }
      }
      setPets(petList);
    } catch {
      setError('Unable to load pets');
      setPets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  return (
    <>
      <PageHeader title="Pets" description="Pets you care for" />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-neutral-200" />
                <div className="h-4 w-3/4 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">{error}</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => void loadPets()}>
              Try again
            </Button>
          </div>
        ) : pets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">No pets assigned yet.</p>
            <p className="mt-1 text-xs text-neutral-500">Pets from your bookings will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                onClick={() => router.push(`/sitter/pets/${pet.id}`)}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:border-neutral-300 hover:shadow"
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-semibold text-amber-800">
                  {(pet.name || '?').charAt(0).toUpperCase()}
                </div>
                <p className="truncate font-medium text-neutral-900">{pet.name}</p>
                <p className="truncate text-xs text-neutral-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                {pet.clientName && (
                  <p className="mt-1 truncate text-xs text-neutral-400">{pet.clientName}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
