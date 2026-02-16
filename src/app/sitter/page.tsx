/**
 * Sitter Page - Redirects to Dashboard
 * 
 * Redirects /sitter to /sitter/dashboard to maintain clean routing
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
        router.replace('/messages');
      }
    }
  }, [loading, isSitter, router]);

  return null;
}
