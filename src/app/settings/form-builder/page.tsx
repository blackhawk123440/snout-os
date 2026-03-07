import { redirect } from 'next/navigation';

/**
 * Legacy route: form builder consolidated into canonical /settings.
 * Redirect to main settings (form builder not yet a persisted section).
 */
export default function FormBuilderSettingsRedirect() {
  redirect('/settings');
}
