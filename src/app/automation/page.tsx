/**
 * Deprecated: redirect to canonical /automations
 */

import { redirect } from 'next/navigation';

export default function AutomationRedirectPage() {
  redirect('/automations');
}
