/**
 * Inbox Redirect Page
 * 
 * Redirects /inbox to /messages
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InboxPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/messages');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div>Redirecting to messages...</div>
    </div>
  );
}
