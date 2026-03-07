import { redirect } from 'next/navigation';

/**
 * Legacy route: service settings consolidated into canonical /settings.
 * Redirect to the Services section.
 */
export default function ServicesSettingsRedirect() {
  redirect('/settings?section=services');
}
