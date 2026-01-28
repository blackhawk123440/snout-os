/**
 * Auth Context and Route Guards
 */

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiGet, apiPost, setAuthToken, clearAuthToken } from './api/client';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['owner', 'sitter', 'admin_future']),
  orgId: z.string(),
  name: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isOwner: boolean;
  isSitter: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for existing token and validate
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      apiGet<User>('/api/auth/me', userSchema)
        .then(setUser)
        .catch(() => {
          clearAuthToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiPost<{ token: string; user: User }>('/api/auth/login', {
      email,
      password,
    });
    setAuthToken(response.token);
    setUser(response.user);
    // Redirect based on role
    if (response.user.role === 'sitter') {
      router.push('/sitter/inbox');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isOwner: user?.role === 'owner',
        isSitter: user?.role === 'sitter',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Route guard component
 */
export function RequireAuth({
  children,
  requireOwner = false,
}: {
  children: ReactNode;
  requireOwner?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login' && pathname !== '/setup') {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (requireOwner && user && user.role !== 'owner') {
        // Redirect sitters to their inbox
        if (user.role === 'sitter') {
          router.push('/sitter/inbox');
        } else {
          router.push('/dashboard');
        }
      } else if (pathname?.startsWith('/sitter') && user.role !== 'sitter') {
        // Owner trying to access sitter pages
        router.push('/dashboard');
      } else if (
        !pathname?.startsWith('/sitter') &&
        user.role === 'sitter' &&
        (pathname?.startsWith('/numbers') ||
          pathname?.startsWith('/routing') ||
          pathname?.startsWith('/audit') ||
          pathname?.startsWith('/automations') ||
          pathname?.startsWith('/alerts') ||
          pathname?.startsWith('/settings') ||
          pathname?.startsWith('/setup'))
      ) {
        // Sitter trying to access owner-only pages
        router.push('/sitter/inbox');
      }
    }
  }, [user, loading, router, pathname, requireOwner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireOwner && user.role !== 'owner') {
    return null;
  }

  return <>{children}</>;
}
