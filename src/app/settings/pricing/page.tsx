import { redirect } from 'next/navigation';

/**
 * Legacy route: pricing settings consolidated into canonical /settings.
 * Redirect to the Pricing section.
 */
export default function PricingSettingsRedirect() {
  redirect('/settings?section=pricing');
}
