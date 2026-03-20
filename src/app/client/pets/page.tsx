'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { LayoutWrapper, ClientRefreshButton } from '@/components/layout';
import {
  AppSkeletonList,
  AppErrorState,
} from '@/components/app';
import { useClientPets } from '@/lib/api/client-hooks';

export default function ClientPetsPage() {
  const router = useRouter();
  const { data, isLoading: loading, error, refetch } = useClientPets();
  const pets = data?.pets ?? [];

  return (
    <LayoutWrapper variant="narrow">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Your pets</h1>
            <p className="text-sm text-text-secondary mt-1">
              {pets.length > 0
                ? `${pets.length} furry family ${pets.length === 1 ? 'member' : 'members'}`
                : 'Your furry family'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ClientRefreshButton onRefresh={refetch} loading={loading} />
            <Link href="/client/pets/new">
              <button className="rounded-xl bg-[#c2410c] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#9a3412] transition-all flex items-center gap-2">
                <Plus size={16} /> Add pet
              </button>
            </Link>
          </div>
        </div>

        {loading ? (
          <AppSkeletonList count={3} />
        ) : error ? (
          <AppErrorState title="Couldn't load pets" subtitle={error.message || 'Unable to load pets'} onRetry={() => void refetch()} />
        ) : pets.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Add your first pet</h2>
            <p className="text-sm text-text-secondary max-w-xs mx-auto mb-6">
              Tell us about your pet so we can provide the best care.
            </p>
            <Link href="/client/pets/new">
              <button className="rounded-xl bg-[#c2410c] text-white font-semibold px-6 py-3 hover:bg-[#9a3412] transition-all">
                Add a pet
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pets.map((pet) => (
              <Link key={pet.id} href={`/client/pets/${pet.id}`}>
                <div className="rounded-xl border border-border-default bg-white p-5 hover:shadow-[var(--shadow-md)] hover:border-border-strong transition-all duration-200 cursor-pointer">
                  <div className="flex items-center gap-4">
                    {pet.photoUrl ? (
                      <img src={pet.photoUrl} alt={pet.name || 'Pet'} className="w-14 h-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-orange-600">{(pet.name || 'P')[0]}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{pet.name || 'Unnamed pet'}</h3>
                      <p className="text-sm text-text-secondary">
                        {[pet.species, pet.breed].filter(Boolean).join(' · ') || 'No details'}
                      </p>
                      {pet.weight && <p className="text-xs text-text-tertiary">{pet.weight} lbs</p>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </LayoutWrapper>
  );
}
