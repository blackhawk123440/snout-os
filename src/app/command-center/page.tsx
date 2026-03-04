import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CommandCenterContent } from './CommandCenterContent';

export default async function CommandCenterPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session) {
    redirect('/login?callbackUrl=/command-center');
  }

  if (role !== 'owner' && role !== 'admin') {
    notFound();
  }

  return <CommandCenterContent />;
}
