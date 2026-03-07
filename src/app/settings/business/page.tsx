import { redirect } from 'next/navigation';

/**
 * Legacy route: business settings consolidated into canonical /settings.
 * Redirect to the Business section.
 */
export default function BusinessSettingsRedirect() {
  redirect('/settings?section=business');
}
