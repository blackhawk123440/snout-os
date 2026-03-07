import { redirect } from 'next/navigation';

/**
 * Legacy route: discounts consolidated into canonical /settings (Pricing section).
 * Redirect to the Pricing section.
 */
export default function DiscountsSettingsRedirect() {
  redirect('/settings?section=pricing');
}
