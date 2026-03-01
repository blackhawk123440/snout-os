/**
 * Client Dashboard - Legacy redirect
 * Redirects /client-dashboard to /client/home (canonical client app)
 */

import { redirect } from 'next/navigation';

export default function ClientDashboardPage() {
  redirect('/client/home');
}
