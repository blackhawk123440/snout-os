import { redirect } from 'next/navigation';

/**
 * Deprecated: legacy tabbed settings UI. All settings consolidated at /settings.
 */
export default function PageLegacyRedirect() {
  redirect('/settings');
}
