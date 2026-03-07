import { redirect } from 'next/navigation';

/**
 * Legacy route: rotation settings consolidated into canonical /settings Advanced section.
 * Redirect to the Advanced section.
 */
export default function RotationSettingsRedirect() {
  redirect('/settings?section=advanced');
}
