"use client";

/**
 * Login Page (Gate B Phase 2.2)
 * 
 * Working sign-in page with credentials provider.
 */

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Flex, Input, Button } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else if (result?.ok) {
        // Wait a moment for session to be established, then redirect
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 100);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: tokens.spacing[6], backgroundColor: tokens.colors.neutral[50] }}>
      <div style={{ minHeight: '100vh' }}>
        <Flex align="center" justify="center">
          <div style={{ maxWidth: '28rem', width: '100%' }}>
          <div style={{ marginBottom: tokens.spacing[8] }}>
            <h2 style={{ marginTop: tokens.spacing[6], textAlign: 'center', fontSize: tokens.typography.fontSize['3xl'][0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary }}>
              Sign in to Snout OS
            </h2>
            <p style={{ marginTop: tokens.spacing[2], textAlign: 'center', fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
              Enter your credentials to access the dashboard
            </p>
          </div>
          <form onSubmit={handleSubmit} style={{ marginTop: tokens.spacing[8] }}>
            <div style={{ marginBottom: tokens.spacing[6] }}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                style={{ width: '100%', borderTopLeftRadius: tokens.borderRadius.md, borderTopRightRadius: tokens.borderRadius.md, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                aria-label="Password"
                style={{ width: '100%', marginTop: '-1px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: tokens.borderRadius.md, borderBottomRightRadius: tokens.borderRadius.md }}
              />
            </div>

            {error && (
              <div style={{ borderRadius: tokens.borderRadius.md, backgroundColor: tokens.colors.error[50], padding: tokens.spacing[4], marginBottom: tokens.spacing[6] }}>
                <Flex>
                  <div style={{ marginLeft: tokens.spacing[3] }}>
                    <h3 style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.error[800] }}>{error}</h3>
                  </div>
                </Flex>
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
          </div>
        </Flex>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh' }}>
        <div style={{ minHeight: '100vh' }}>
          <Flex align="center" justify="center">
            <div>Loading...</div>
          </Flex>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
