"use client";

/**
 * Login Page (Gate B Phase 2.2)
 * 
 * Working sign-in page with credentials provider.
 */

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Flex, Card, Input, Button } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
        // Redirect to callback URL or home
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: tokens.colors.background.secondary, padding: tokens.spacing[6] }}>
      <div style={{ minHeight: '100vh' }}>
        <Flex align="center" justify="center">
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <Card style={{ padding: tokens.spacing[8] }}>
            <Flex direction="column" gap={6}>
              <div>
                <h2 style={{ 
                  textAlign: 'center',
                  fontSize: tokens.typography.fontSize['3xl'][0],
                  fontWeight: tokens.typography.fontWeight.bold,
                  color: tokens.colors.text.primary,
                  marginTop: tokens.spacing[6],
                  marginBottom: 0,
                }}>
                  Sign in to Snout OS
                </h2>
                <p style={{
                  textAlign: 'center',
                  fontSize: tokens.typography.fontSize.sm[0],
                  color: tokens.colors.text.secondary,
                  marginTop: tokens.spacing[2],
                  marginBottom: 0,
                }}>
                  Enter your credentials to access the dashboard
                </p>
              </div>
              <form onSubmit={handleSubmit} style={{ marginTop: tokens.spacing[8] }}>
                <Flex direction="column" gap={6}>
                  <div>
                    <label htmlFor="email" style={{ width: '1px', height: '1px', padding: 0, margin: '-1px', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0, opacity: 0, pointerEvents: 'none' }}>
                      Email address
                    </label>
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
                      style={{ borderTopLeftRadius: tokens.borderRadius.md, borderTopRightRadius: tokens.borderRadius.md, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" style={{ width: '1px', height: '1px', padding: 0, margin: '-1px', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0, opacity: 0, pointerEvents: 'none' }}>
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: tokens.borderRadius.md, borderBottomRightRadius: tokens.borderRadius.md, marginTop: `-${tokens.spacing[0.5]}` }}
                    />
                  </div>

                  {error && (
                    <div style={{
                      borderRadius: tokens.borderRadius.md,
                      backgroundColor: tokens.colors.error[50],
                      padding: tokens.spacing[4],
                    }}>
                      <Flex align="center" gap={3}>
                        <div>
                          <h3 style={{
                            fontSize: tokens.typography.fontSize.sm[0],
                            fontWeight: tokens.typography.fontWeight.medium,
                            color: tokens.colors.error[800],
                            margin: 0,
                          }}>
                            {error}
                          </h3>
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
                </Flex>
              </form>
            </Flex>
          </Card>
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
