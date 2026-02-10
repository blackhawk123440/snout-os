"use client";

/**
 * Proof Page - Runtime Verification
 * 
 * Owner-only page that proves:
 * 1. Web→API wiring (shows resolved API base URL and makes direct calls)
 * 2. Worker execution (triggers job and shows audit event)
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProofResult {
  endpoint: string;
  fullUrl: string;
  status: 'pending' | 'pass' | 'fail';
  statusCode?: number;
  error?: string;
  responseTime?: number;
  data?: any;
}

interface WorkerProof {
  found: boolean;
  event?: {
    id: string;
    eventType: string;
    timestamp: string;
    jobId: string;
    bullmqJobId: string;
    payload: any;
  };
  message?: string;
}

export default function ProofPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<ProofResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [workerProof, setWorkerProof] = useState<WorkerProof | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');

  // Redirect if not owner
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if ((session.user as any)?.sitterId) {
      router.push('/sitter/inbox');
      return;
    }
  }, [session, sessionStatus, router]);

  // Get resolved API base URL
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    setApiBaseUrl(baseUrl);
    
    // Load latest worker proof
    if (baseUrl && session) {
      loadLatestProof();
    }
  }, [session]);

  const loadLatestProof = async () => {
    try {
      const response = await apiGet<WorkerProof>('/api/ops/proof/latest');
      setWorkerProof(response);
    } catch (error: any) {
      console.error('Failed to load proof:', error);
    }
  };

  const testEndpoint = async (
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
  ): Promise<ProofResult> => {
    const startTime = Date.now();
    const fullUrl = `${apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
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
        fullUrl,
        status: response.ok ? 'pass' : 'fail',
        statusCode: response.status,
        responseTime,
        data: response.ok ? data : null,
        error: response.ok ? undefined : `Status ${response.status}: ${data?.error || data?.message || 'Unknown error'}`,
      };
    } catch (error: any) {
      return {
        endpoint,
        fullUrl,
        status: 'fail',
        error: error.message || 'Network error',
        responseTime: Date.now() - startTime,
      };
    }
  };

  const runApiTests = async () => {
    setLoading(true);
    setResults([]);

    const tests: Array<{ endpoint: string; method?: 'GET' | 'POST' }> = [
      { endpoint: '/health', method: 'GET' },
      { endpoint: '/api/messages/threads', method: 'GET' },
    ];

    const testResults: ProofResult[] = [];

    for (const test of tests) {
      const result = await testEndpoint(test.endpoint, test.method || 'GET');
      testResults.push(result);
      setResults([...testResults]);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setLoading(false);
  };

  const triggerWorkerProof = async () => {
    setTriggering(true);
    try {
      await apiPost('/api/ops/proof/trigger', {});
      
      // Poll for the audit event (worker should process within seconds)
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max
      const triggerTime = Date.now();
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadLatestProof();
        
        if (workerProof?.found && workerProof.event) {
          const eventTime = new Date(workerProof.event.timestamp).getTime();
          // Check if event is recent (within last 30 seconds)
          if (triggerTime - eventTime < 30000) {
            break;
          }
        }
        attempts++;
      }
      
      // Final refresh
      await loadLatestProof();
    } catch (error: any) {
      console.error('Failed to trigger proof:', error);
      alert(`Failed to trigger proof: ${error.message}`);
    } finally {
      setTriggering(false);
    }
  };

  if (sessionStatus === 'loading') {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const allPassed = results.length > 0 && results.every(r => r.status === 'pass');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Deployment Proof</h1>
      
      {/* API Base URL */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Resolved API Base URL</h2>
        <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold', color: '#0070f3' }}>
          {apiBaseUrl || '(not set)'}
        </div>
        {apiBaseUrl && (
          <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
            All API calls will use this base URL
          </div>
        )}
      </div>

      {/* API Tests */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Web→API Proof</h2>
        <button
          onClick={runApiTests}
          disabled={loading || !apiBaseUrl}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: loading || !apiBaseUrl ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading || !apiBaseUrl ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
          }}
        >
          {loading ? 'Running Tests...' : 'Test API Calls'}
        </button>

        {results.length > 0 && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏳'}
                  </span>
                  <strong>{result.endpoint}</strong>
                  {result.statusCode && (
                    <span style={{ 
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: result.statusCode === 200 ? '#22c55e' : result.statusCode === 401 ? '#f59e0b' : '#ef4444',
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
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                  <strong>Full URL:</strong> {result.fullUrl}
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
                      View Response
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
        )}
      </div>

      {/* Worker Proof */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Worker Execution Proof</h2>
        <button
          onClick={triggerWorkerProof}
          disabled={triggering || !apiBaseUrl}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: triggering || !apiBaseUrl ? '#ccc' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: triggering || !apiBaseUrl ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
          }}
        >
          {triggering ? 'Triggering...' : 'Trigger Worker Proof'}
        </button>

        {workerProof && (
          <div style={{
            border: `2px solid ${workerProof.found ? '#22c55e' : '#f59e0b'}`,
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: workerProof.found ? '#f0fdf4' : '#fef3c7',
          }}>
            {workerProof.found && workerProof.event ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <strong>Worker Proof Found</strong>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  <div><strong>Event ID:</strong> {workerProof.event.id}</div>
                  <div><strong>Event Type:</strong> {workerProof.event.eventType}</div>
                  <div><strong>Timestamp:</strong> {workerProof.event.timestamp}</div>
                  <div><strong>Job ID:</strong> {workerProof.event.jobId}</div>
                  <div><strong>BullMQ Job ID:</strong> {workerProof.event.bullmqJobId}</div>
                </div>
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#666' }}>
                    View Payload
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
                    {JSON.stringify(workerProof.event.payload, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <div>
                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                <strong> {workerProof.message || 'No proof events found. Trigger a proof job first.'}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: allPassed ? '#f0fdf4' : '#fef2f2',
          borderRadius: '8px',
          border: `2px solid ${allPassed ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {allPassed ? '✅ All API Tests Passed' : '❌ Some Tests Failed'}
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>
            API Base URL: <code>{apiBaseUrl}</code>
            <br />
            All requests are made directly to the API service, not through Next.js API routes.
          </div>
        </div>
      )}
    </div>
  );
}
