/**
 * Deprecated: redirect to canonical /automations (no separate "new" in type-based model)
 */

import { redirect } from 'next/navigation';

export default function AutomationCenterNewRedirectPage() {
  redirect('/automations');
}
