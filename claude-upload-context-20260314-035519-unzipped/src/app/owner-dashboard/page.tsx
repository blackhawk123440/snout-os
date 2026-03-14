/**
 * Owner Dashboard - Canonical owner home
 * Redirects /owner-dashboard to / (main dashboard)
 */

import { redirect } from 'next/navigation';

export default function OwnerDashboardPage() {
  redirect('/');
}
