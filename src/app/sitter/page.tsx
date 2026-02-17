/**
 * Sitter Landing Page
 * 
 * Redirects /sitter to /sitter/dashboard
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-client';

export default function SitterPage() {
  const router = useRouter();
  const { isSitter, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isSitter) {
        router.replace('/sitter/dashboard');
      } else {
        router.replace('/messages'); // Redirect non-sitters
      }
    }
  }, [loading, isSitter, router]);

  return null;
}
