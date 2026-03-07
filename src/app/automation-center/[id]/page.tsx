/**
 * Deprecated: redirect to canonical /automations/[id]
 */

import { redirect } from 'next/navigation';

export default async function AutomationCenterIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === 'new') redirect('/automations');
  redirect(`/automations/${id}`);
}
