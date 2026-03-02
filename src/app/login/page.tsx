'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input, Button } from '@/components/ui';

type SessionUser = {
  role?: string;
  sitterId?: string | null;
  clientId?: string | null;
};

const getRedirectForRole = (user: SessionUser): string => {
  const normalizedRole = String(user.role || '').toUpperCase();
  if (normalizedRole === 'CLIENT' || !!user.clientId) return '/client/home';
  if (normalizedRole === 'SITTER' || !!user.sitterId) return '/sitter/today';
  if (normalizedRole === 'OWNER' || normalizedRole === 'ADMIN') return '/dashboard';
  return '/dashboard';
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (!result?.ok || result.error) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Small delay to let session cookie settle before lookup.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = await sessionRes.json().catch(() => null);
      const redirectTarget = getRedirectForRole((session?.user || {}) as SessionUser);
      router.replace(redirectTarget);
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-center text-2xl font-semibold text-neutral-900">Sign in</h1>
        <p className="mt-1 text-center text-sm text-neutral-600">Use your email and password to continue.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            fullWidth
          />

          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            fullWidth
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="w-full"
            isLoading={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
