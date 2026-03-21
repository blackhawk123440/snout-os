'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /sitter/jobs now redirects to /sitter/bookings.
 * The Bookings page has tabs (Active/Upcoming/Completed) — Jobs is no longer a separate page.
 */
export default function SitterJobsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sitter/bookings');
  }, [router]);
  return null;
}
