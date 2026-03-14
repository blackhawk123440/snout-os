/**
 * Sitter Dashboard - Legacy redirect
 * Redirects /sitter-dashboard to /sitter/today (canonical sitter app)
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SitterDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/sitter/today');
  }, [router]);

  return null;
}
