/**
 * Client-side Auth Hook
 * 
 * Provides useAuth hook for client components using NextAuth session
 */

'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'sitter';
  sitterId?: string | null;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  isSitter: boolean;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const user = useMemo<User | null>(() => {
    if (!session?.user) {
      return null;
    }

    const sessionUser = session.user as any;
    const hasSitterId = !!sessionUser.sitterId;
    const sessionRole = sessionUser.role as string | undefined;
    const normalizedRole =
      sessionRole === 'sitter'
        ? 'sitter'
        : sessionRole === 'owner'
          ? 'owner'
          : hasSitterId
            ? 'sitter'
            : 'owner';
    
    return {
      id: sessionUser.id || '',
      email: sessionUser.email || '',
      name: sessionUser.name || null,
      role: normalizedRole,
      sitterId: sessionUser.sitterId || null,
    };
  }, [session]);

  const loading = status === 'loading';
  const isOwner = user?.role === 'owner' || false;
  const isSitter = user?.role === 'sitter' || false;

  return {
    user,
    loading,
    isOwner,
    isSitter,
  };
}
