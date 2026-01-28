'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth, useAuth } from '@/lib/auth';

/**
 * Sitter Landing Page
 * Redirects to inbox
 */
export default function SitterPage() {
  const router = useRouter();
  const { isSitter } = useAuth();

  useEffect(() => {
    if (isSitter) {
      router.push('/sitter/inbox');
    }
  }, [isSitter, router]);

  return (
    <RequireAuth>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Redirecting...</div>
      </div>
    </RequireAuth>
  );
}
