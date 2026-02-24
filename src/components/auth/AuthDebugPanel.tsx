/**
 * Auth Debug Panel
 * 
 * Dev/owner-only panel to diagnose authentication issues.
 * Shows auth configuration, session status, and cookie presence.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';

// Type declaration for window property
declare global {
  interface Window {
    __lastSignInResult?: { ok: boolean; error: string | null } | null;
  }
}

interface AuthHealth {
  status: string;
  env: {
    NEXTAUTH_URL: string;
    NEXTAUTH_URL_RAW: string;
    NEXTAUTH_SECRET_PRESENT: boolean;
    NEXTAUTH_SECRET_LENGTH: number;
    NEXTAUTH_SECRET_VALID: boolean;
    NEXT_PUBLIC_API_URL: string;
    NODE_ENV: string;
  };
  providers: string[];
  canReadSession: {
    hasSession: boolean;
    userRole: string | null;
    error: string | null;
  };
  timestamp: string;
}

interface SessionCheck {
  status: number;
  hasSession: boolean;
  error: string | null;
}

interface CsrfCheck {
  status: number;
  csrfToken: string | null;
  error: string | null;
}

export function AuthDebugPanel() {
  const { data: session, status: sessionStatus } = useSession();
  const { user, isOwner } = useAuth();
  const [authHealth, setAuthHealth] = useState<AuthHealth | null>(null);
  const [sessionCheck, setSessionCheck] = useState<SessionCheck | null>(null);
  const [csrfCheck, setCsrfCheck] = useState<CsrfCheck | null>(null);
  const [lastSignInResult, setLastSignInResult] = useState<{ ok: boolean; error: string | null } | null>(null);
  const [cookies, setCookies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
    checkCookies();
    
    // Poll for lastSignInResult from login page
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).__lastSignInResult) {
        setLastSignInResult((window as any).__lastSignInResult);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const checkAuthState = async () => {
    setLoading(true);
    
    // Check /api/auth/health
    try {
      const healthRes = await fetch('/api/auth/health');
      const healthData = await healthRes.json();
      setAuthHealth(healthData);
    } catch (error: any) {
      setAuthHealth({
        status: 'error',
        env: {
          NEXTAUTH_URL: 'ERROR',
          NEXTAUTH_URL_RAW: 'ERROR',
          NEXTAUTH_SECRET_PRESENT: false,
          NEXTAUTH_SECRET_LENGTH: 0,
          NEXTAUTH_SECRET_VALID: false,
          NEXT_PUBLIC_API_URL: 'ERROR',
          NODE_ENV: 'ERROR',
        },
        providers: [],
        canReadSession: { hasSession: false, userRole: null, error: error?.message || 'Unknown error' },
        timestamp: new Date().toISOString(),
      });
    }

    // Check /api/auth/session
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      setSessionCheck({
        status: sessionRes.status,
        hasSession: !!sessionData?.user,
        error: sessionRes.status !== 200 ? `Status ${sessionRes.status}` : null,
      });
    } catch (error: any) {
      setSessionCheck({
        status: 0,
        hasSession: false,
        error: error?.message || 'Network error',
      });
    }

    // Check /api/auth/csrf
    try {
      const csrfRes = await fetch('/api/auth/csrf');
      const csrfData = await csrfRes.json();
      setCsrfCheck({
        status: csrfRes.status,
        csrfToken: csrfData?.csrfToken || null,
        error: csrfRes.status !== 200 ? `Status ${csrfRes.status}` : null,
      });
    } catch (error: any) {
      setCsrfCheck({
        status: 0,
        csrfToken: null,
        error: error?.message || 'Network error',
      });
    }

    setLoading(false);
  };

  const checkCookies = () => {
    const cookieString = document.cookie;
    const cookieList = cookieString.split(';').map(c => c.trim()).filter(Boolean);
    setCookies(cookieList);
  };

  const hasSessionCookie = cookies.some(c => 
    c.startsWith('next-auth.session-token') || 
    c.startsWith('__Secure-next-auth.session-token')
  );

  if (process.env.NODE_ENV !== 'development' && !isOwner) {
    return null;
  }

  return (
    <Card
      style={{
        marginTop: tokens.spacing[4],
        padding: tokens.spacing[4],
        backgroundColor: tokens.colors.neutral[50],
        border: `1px solid ${tokens.colors.border.default}`,
      }}
    >
      <h3 style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[3] }}>
        🔍 Auth Debug Panel (Dev/Owner Only)
      </h3>

      {loading ? (
        <div>Loading diagnostics...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {/* Current URL */}
          <div>
            <strong>Current URL Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
          </div>

          {/* Auth Health */}
          {authHealth && (
            <div>
              <strong>Auth Health:</strong>
              <pre style={{ fontSize: '11px', overflow: 'auto', backgroundColor: tokens.colors.neutral[100], padding: tokens.spacing[2], borderRadius: tokens.borderRadius.sm }}>
                {JSON.stringify(authHealth, null, 2)}
              </pre>
            </div>
          )}

          {/* Session Check */}
          {sessionCheck && (
            <div>
              <strong>GET /api/auth/session:</strong>
              <div style={{ color: sessionCheck.hasSession ? tokens.colors.success[600] : tokens.colors.error[600] }}>
                Status: {sessionCheck.status} | Has Session: {sessionCheck.hasSession ? '✅ YES' : '❌ NO'}
                {sessionCheck.error && ` | Error: ${sessionCheck.error}`}
              </div>
            </div>
          )}

          {/* CSRF Check */}
          {csrfCheck && (
            <div>
              <strong>GET /api/auth/csrf:</strong>
              <div style={{ color: csrfCheck.status === 200 ? tokens.colors.success[600] : tokens.colors.error[600] }}>
                Status: {csrfCheck.status} | Token: {csrfCheck.csrfToken ? '✅ Present' : '❌ Missing'}
                {csrfCheck.error && ` | Error: ${csrfCheck.error}`}
              </div>
            </div>
          )}

          {/* NextAuth Session Hook */}
          <div>
            <strong>useSession() Hook:</strong>
            <div>
              Status: {sessionStatus} | User: {session?.user ? `✅ ${session.user.email}` : '❌ None'}
            </div>
          </div>

          {/* Cookies */}
          <div>
            <strong>Cookies:</strong>
            <div style={{ color: hasSessionCookie ? tokens.colors.success[600] : tokens.colors.error[600] }}>
              Session Cookie: {hasSessionCookie ? '✅ Present' : '❌ Missing'}
            </div>
            <details style={{ marginTop: tokens.spacing[1] }}>
              <summary style={{ cursor: 'pointer', fontSize: '11px' }}>All Cookies ({cookies.length})</summary>
              <pre style={{ fontSize: '10px', marginTop: tokens.spacing[1] }}>
                {cookies.join('\n')}
              </pre>
            </details>
          </div>

          {/* Last Sign In Result */}
          {lastSignInResult && (
            <div>
              <strong>Last signIn() Result:</strong>
              <div style={{ color: lastSignInResult.ok ? tokens.colors.success[600] : tokens.colors.error[600] }}>
                {lastSignInResult.ok ? '✅ OK' : `❌ Error: ${lastSignInResult.error}`}
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => {
              checkAuthState();
              checkCookies();
            }}
            style={{
              padding: `${tokens.spacing[2]} ${tokens.spacing[3]}`,
              backgroundColor: tokens.colors.primary.DEFAULT,
              color: 'white',
              border: 'none',
              borderRadius: tokens.borderRadius.sm,
              cursor: 'pointer',
              fontSize: tokens.typography.fontSize.sm[0],
            }}
          >
            🔄 Refresh Diagnostics
          </button>
        </div>
      )}
    </Card>
  );
}
