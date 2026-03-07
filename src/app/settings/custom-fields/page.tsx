import { redirect } from 'next/navigation';

/**
 * Legacy route: custom fields consolidated into canonical /settings.
 * Redirect to main settings (custom fields not yet a persisted section).
 */
export default function CustomFieldsSettingsRedirect() {
  redirect('/settings');
}
