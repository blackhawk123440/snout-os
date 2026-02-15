/**
 * Messages Page - Enterprise Single Domain
 * 
 * All messaging operations live inside this ONE tab.
 * Internal panels: Owner Inbox, Sitters, Numbers, Assignments, Twilio Setup
 */

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, Tabs, TabPanel } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import InboxView from '@/components/messaging/InboxView';
import { SittersPanel } from '@/components/messaging/SittersPanel';
import { NumbersPanel } from '@/components/messaging/NumbersPanel';
import { AssignmentsPanel } from '@/components/messaging/AssignmentsPanel';
import { TwilioSetupPanel } from '@/components/messaging/TwilioSetupPanel';

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const { user, isOwner, isSitter } = useAuth();
  const router = useRouter();
  
  // Get initial tab from URL or default to 'inbox'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sitters' | 'numbers' | 'assignments' | 'setup'>(
    (tabParam as any) || 'inbox'
  );

  // Redirect sitters away from owner messages
  if (isSitter) {
    router.push('/sitter/inbox');
    return null;
  }

  // Require owner login
  if (!isOwner) {
    return (
      <AppShell>
        <PageHeader title="Messages" />
        <div style={{ padding: tokens.spacing[6] }}>
          <div>Access denied. Owner access required.</div>
        </div>
      </AppShell>
    );
  }

  // Get sitterId from URL for deep-linking
  const sitterIdParam = searchParams.get('sitterId');

  return (
    <AppShell>
      <PageHeader
        title="Messages"
        description="Manage all messaging operations from one place"
      />
      <div className="flex flex-col h-full min-h-0" style={{ padding: 0 }}>
        <Tabs
          tabs={[
            { id: 'inbox', label: 'Owner Inbox' },
            { id: 'sitters', label: 'Sitters' },
            { id: 'numbers', label: 'Numbers' },
            { id: 'assignments', label: 'Assignments' },
            { id: 'setup', label: 'Twilio Setup' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => {
            setActiveTab(id as any);
            // Update URL without navigation
            const url = new URL(window.location.href);
            url.searchParams.set('tab', id);
            window.history.pushState({}, '', url.toString());
          }}
        >
          <TabPanel id="inbox">
            <InboxView 
              role="owner" 
              initialThreadId={searchParams.get('thread') || undefined}
              sitterId={sitterIdParam || undefined}
              inbox="owner"
            />
          </TabPanel>
          <TabPanel id="sitters">
            <SittersPanel />
          </TabPanel>
          <TabPanel id="numbers">
            <NumbersPanel />
          </TabPanel>
          <TabPanel id="assignments">
            <AssignmentsPanel />
          </TabPanel>
          <TabPanel id="setup">
            <TwilioSetupPanel />
          </TabPanel>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Messages" />
        <div style={{ padding: tokens.spacing[4] }}>
          <div>Loading...</div>
        </div>
      </AppShell>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
