"use client";

/**
 * Proof Page - End-to-End API Verification
 * 
 * Owner-only page that performs live API calls and shows PASS/FAIL
 * for each endpoint to prove the system is wired correctly.
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProofResult {
  endpoint: string;
  status: 'pending' | 'pass' | 'fail';
  statusCode?: number;
  error?: string;
  responseTime?: number;
  data?: any;
}

export default function ProofPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<ProofResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect if not owner
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    // Check if user is owner (not sitter)
    if ((session.user as any)?.sitterId) {
      router.push('/sitter/inbox');
      return;
    }
  }, [session, sessionStatus, router]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const isUsingExternalAPI = !!API_BASE_URL;
  const actualBaseUrl = API_BASE_URL || window.location.origin;

  const testEndpoint = async (
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    apiPath?: string,
  ): Promise<ProofResult> => {
    const startTime = Date.now();
    // If apiPath is provided, use it for external API; otherwise use endpoint
    const actualApiPath = apiPath || endpoint;
    const url = isUsingExternalAPI 
      ? `${API_BASE_URL}${actualApiPath}`
      : endpoint; // Relative URL for Next.js API routes (should proxy)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include', // Include cookies for NextAuth
      });

      const responseTime = Date.now() - startTime;
      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        endpoint,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        responseTime,
        data: response.ok ? data : null,
        error: response.ok ? undefined : `Status ${response.status}: ${data?.error || data?.message || 'Unknown error'}`,
      };
    } catch (error: any) {
      return {
        endpoint,
        status: 'fail',
        error: error.message || 'Network error',
        responseTime: Date.now() - startTime,
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);

    const tests: Array<{ endpoint: string; method?: 'GET' | 'POST'; apiPath?: string }> = [];
    
    // Always test external API health if configured
    if (isUsingExternalAPI) {
      tests.push({ endpoint: '/health', apiPath: '/health' }); // Direct API health
    }
    
    // Test endpoints that should proxy to API
    tests.push(
      { endpoint: '/api/messages/threads', apiPath: '/api/threads' },
      { endpoint: '/api/numbers', apiPath: '/api/numbers' },
      { endpoint: '/api/assignments/windows', apiPath: '/api/assignments/windows' },
    );

    const testResults: ProofResult[] = [];

    for (const test of tests) {
      const result = await testEndpoint(test.endpoint, test.method || 'GET', undefined, test.apiPath);
      testResults.push(result);
      setResults([...testResults]);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setLoading(false);
  };

  if (sessionStatus === 'loading') {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!session) {
    return null; // Will redirect
  }

  const allPassed = results.length > 0 && results.every(r => r.status === 'pass');
  const anyFailed = results.some(r => r.status === 'fail');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>End-to-End API Proof</h1>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Configuration</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
          <div><strong>NEXT_PUBLIC_API_URL:</strong> {API_BASE_URL || '(not set - using Next.js API routes)'}</div>
          <div><strong>Actual Base URL:</strong> {actualBaseUrl}</div>
          <div><strong>Architecture:</strong> {isUsingExternalAPI ? 'Separate API Service' : 'Next.js API Routes (same service)'}</div>
        </div>
      </div>

      <button
        onClick={runAllTests}
        disabled={loading}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '2rem',
        }}
      >
        {loading ? 'Running Tests...' : 'Run All Tests'}
      </button>

      {results.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Results: {allPassed ? '✅ ALL PASS' : anyFailed ? '❌ SOME FAILED' : '⏳ PENDING'}
          </h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  border: `2px solid ${result.status === 'pass' ? '#22c55e' : result.status === 'fail' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: result.status === 'pass' ? '#f0fdf4' : result.status === 'fail' ? '#fef2f2' : '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏳'}
                  </span>
                  <strong style={{ fontSize: '1.1rem' }}>{result.endpoint}</strong>
                  {result.statusCode && (
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: result.statusCode === 200 ? '#22c55e' : '#ef4444',
                      color: 'white',
                      fontSize: '0.875rem',
                    }}>
                      {result.statusCode}
                    </span>
                  )}
                  {result.responseTime && (
                    <span style={{ fontSize: '0.875rem', color: '#666' }}>
                      {result.responseTime}ms
                    </span>
                  )}
                </div>

                {result.error && (
                  <div style={{ 
                    color: '#ef4444',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    marginTop: '0.5rem',
                  }}>
                    Error: {result.error}
                  </div>
                )}

                {result.data && result.status === 'pass' && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#666' }}>
                      View Response Data
                    </summary>
                    <pre style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px',
                      overflow: 'auto',
                      fontSize: '0.75rem',
                      maxHeight: '200px',
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Network Evidence</h3>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          Open browser DevTools → Network tab → Run tests → Look for requests to:
        </p>
        <ul style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          {isUsingExternalAPI ? (
            <>
              <li><code>{API_BASE_URL}/health</code></li>
              <li><code>{API_BASE_URL}/api/messages/threads</code></li>
              <li><code>{API_BASE_URL}/api/numbers</code></li>
              <li><code>{API_BASE_URL}/api/assignments/windows</code></li>
            </>
          ) : (
            <>
              <li><code>{window.location.origin}/api/health</code></li>
              <li><code>{window.location.origin}/api/messages/threads</code></li>
              <li><code>{window.location.origin}/api/numbers</code></li>
              <li><code>{window.location.origin}/api/assignments/windows</code></li>
            </>
          )}
        </ul>
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
          All requests should return <strong>200</strong> status codes.
        </p>
      </div>
    </div>
  );
}
