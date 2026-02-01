/**
 * Messages Layout - Server-side route protection
 * 
 * Redirects sitters to /sitter/inbox
 */

import { redirect } from 'next/navigation';
import { getSessionSafe } from '@/lib/auth-helpers';
import { getCurrentSitterId } from '@/lib/sitter-helpers';
import { headers } from 'next/headers';

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const request = new Request('http://localhost', {
    headers: headersList,
  });
  
  // Check if user is a sitter
  const sitterId = await getCurrentSitterId(request);
  
  if (sitterId) {
    redirect('/sitter/inbox');
  }
  
  return <>{children}</>;
}
