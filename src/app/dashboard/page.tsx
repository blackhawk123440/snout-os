/**
 * Dashboard Route - Redirects to root
 * 
 * This route exists to handle legacy redirects from login
 * that reference /dashboard. The actual dashboard is at /.
 */

import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/');
}
