/**
 * Sitter Inbox Page
 * 
 * Sitter-specific messaging inbox showing only threads assigned to the sitter
 * with active assignment windows.
 */

'use client';

import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import InboxView from '@/components/messaging/InboxView';

function SitterInboxContent() {
  const { user, isSitter, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSitter) {
      // Redirect owners away from sitter inbox
      router.push('/messages');
    }
  }, [loading, isSitter, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSitter) {
    return null; // Will redirect
  }

  return (
    <AppShell>
      <PageHeader
        title="My Inbox"
        description="Messages from clients during your active assignments"
      />
      <InboxView role="sitter" inbox="all" />
    </AppShell>
  );
}

export default function SitterInboxPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    }>
      <SitterInboxContent />
    </Suspense>
  );
}
