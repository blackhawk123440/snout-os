/**
 * Enterprise Layout Wrapper
 * 
 * Wraps all dashboard pages with AppShell.
 * Use this layout for all dashboard routes.
 */

import { AppShell } from '@/components/layout/AppShell';

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

