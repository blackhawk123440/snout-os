/**
 * Diagnostics Panel for Messaging
 * 
 * Dev + owner-only panel that shows exactly why threads aren't showing.
 * Provides actionable diagnostics for troubleshooting.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { tokens } from '@/lib/design-tokens';
import { useAuth } from '@/lib/auth-client';
import { isMessagingEnabled } from '@/lib/flags';

interface DiagnosticsPanelProps {
  threadsCount: number;
  threadsLoading: boolean;
  threadsError: Error | null;
  lastFetchUrl?: string;
  lastFetchStatus?: number;
  lastFetchResponseSize?: number;
  onSeed?: () => Promise<void>;
}

export function DiagnosticsPanel({
  threadsCount,
  threadsLoading,
  threadsError,
  lastFetchUrl,
  lastFetchStatus,
  lastFetchResponseSize,
  onSeed,
}: DiagnosticsPanelProps) {
  const { user, isOwner } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  const [userInfo, setUserInfo] = useState<{ email?: string; role?: string } | null>(null);

  // Get actual resolved API base URL from client (same logic as apiRequest in client.ts)
  useEffect(() => {
    // Use NEXT_PUBLIC_API_URL if set, otherwise empty (relative URLs)
    const resolvedUrl = process.env.NEXT_PUBLIC_API_URL || '';
    setApiBaseUrl(resolvedUrl || '(relative - same origin)');
  }, []);

  // Get user info from NextAuth session (already available via useAuth hook)
  useEffect(() => {
    if (user) {
      setUserInfo({ email: user.email, role: user.role });
    }
  }, [user]);

  // Always show to owners (dev + staging) - check AFTER all hooks
  if (!isOwner) {
    return null;
  }

  const messagingFlag = isMessagingEnabled();
  const messagingFlagValue = process.env.NEXT_PUBLIC_ENABLE_MESSAGING_V1 || 'false';

  // Determine issue with precise error categorization
  let issue: string | null = null;
  let issueSeverity: 'error' | 'warning' | 'info' = 'info';

  if (!messagingFlag) {
    issue = 'Messaging flag is OFF';
    issueSeverity = 'error';
  } else if (threadsError || lastFetchStatus) {
    // Precise error categorization
    if (lastFetchStatus === 401 || lastFetchStatus === 403) {
      issue = 'JWT/auth mismatch: You\'re not logged in to API / JWT missing';
      issueSeverity = 'error';
    } else if (lastFetchStatus === 404) {
      issue = 'Wrong API base URL or route not deployed: /api/messages/threads not found';
      issueSeverity = 'error';
    } else if (lastFetchStatus && lastFetchStatus >= 500) {
      issue = 'API down: Server error (5xx)';
      issueSeverity = 'error';
    } else if (threadsError) {
      issue = `API Error: ${threadsError.message}`;
      issueSeverity = 'error';
    }
  } else if (!threadsLoading && threadsCount === 0 && messagingFlag) {
    issue = 'DB empty — seed required';
    issueSeverity = 'warning';
  } else if (threadsLoading) {
    issue = 'Loading threads...';
    issueSeverity = 'info';
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        maxWidth: '400px',
      }}
    >
      <Card
        style={{
          backgroundColor: 'white',
          border: `2px solid ${issueSeverity === 'error' ? tokens.colors.error[500] : issueSeverity === 'warning' ? tokens.colors.warning[500] : tokens.colors.info[500]}`,
          boxShadow: tokens.shadow.lg,
        }}
      >
        <div style={{ padding: tokens.spacing[3] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[2] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
              <strong style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Ops / Diagnostics</strong>
              {issue && (
                <Badge
                  variant={issueSeverity === 'error' ? 'error' : issueSeverity === 'warning' ? 'warning' : 'info'}
                  style={{ fontSize: tokens.typography.fontSize.xs[0] }}
                >
                  {issueSeverity === 'error' ? 'ERROR' : issueSeverity === 'warning' ? 'WARNING' : 'INFO'}
                </Badge>
              )}
            </div>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'Show'}
            </Button>
          </div>

          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], fontSize: tokens.typography.fontSize.xs[0] }}>
              {/* Feature Flag */}
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                  Feature Flag:
                </div>
                <div style={{ fontFamily: 'monospace', color: messagingFlag ? tokens.colors.success[600] : tokens.colors.error[600] }}>
                  NEXT_PUBLIC_ENABLE_MESSAGING_V1 = {messagingFlagValue}
                </div>
                {!messagingFlag && (
                  <div style={{ color: tokens.colors.error[600], marginTop: tokens.spacing[1] }}>
                    Set to 'true' to enable messaging
                  </div>
                )}
              </div>

              {/* API URL */}
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                  API Base URL (resolved):
                </div>
                <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {apiBaseUrl}
                </div>
                <div style={{ fontSize: '10px', color: tokens.colors.text.tertiary, marginTop: tokens.spacing[1] }}>
                  Raw: {process.env.NEXT_PUBLIC_API_URL || 'not set'}
                </div>
              </div>

              {/* User Info */}
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                  User (from session):
                </div>
                <div>
                  {userInfo?.email || user?.email || 'Not logged in'} ({userInfo?.role || user?.role || 'unknown'})
                </div>
              </div>

              {/* Last Fetch */}
              {lastFetchUrl && (
                <div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                    Last Fetch:
                  </div>
                  <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '10px' }}>
                    {lastFetchUrl}
                  </div>
                  {lastFetchStatus && (
                    <div style={{ marginTop: tokens.spacing[1] }}>
                      Status: <Badge variant={lastFetchStatus >= 400 ? 'error' : 'success'}>{lastFetchStatus}</Badge>
                      {lastFetchResponseSize !== undefined && (
                        <span style={{ marginLeft: tokens.spacing[2] }}>
                          Size: {lastFetchResponseSize} bytes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error Details */}
              {threadsError && (
                <div>
                  <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1], color: tokens.colors.error[600] }}>
                    Error:
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '10px', color: tokens.colors.error[600], wordBreak: 'break-word' }}>
                    {threadsError.message}
                  </div>
                  {process.env.NODE_ENV === 'development' && threadsError.stack && (
                    <details style={{ marginTop: tokens.spacing[1] }}>
                      <summary style={{ cursor: 'pointer', fontSize: '10px' }}>Stack Trace</summary>
                      <pre style={{ fontSize: '9px', overflow: 'auto', maxHeight: '200px', marginTop: tokens.spacing[1] }}>
                        {threadsError.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Thread Count */}
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                  Threads:
                </div>
                <div>
                  {threadsLoading ? 'Loading...' : `${threadsCount} found`}
                </div>
              </div>

              {/* Actions */}
              {issue === 'DB empty — seed required' && onSeed && (
                <div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onSeed}
                    style={{ width: '100%' }}
                  >
                    Create Demo Data
                  </Button>
                </div>
              )}

              {/* Help Text */}
              <div style={{ padding: tokens.spacing[2], backgroundColor: tokens.colors.neutral[50], borderRadius: tokens.radius.sm, fontSize: '10px' }}>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[1] }}>
                  Troubleshooting:
                </div>
                <ul style={{ margin: 0, paddingLeft: tokens.spacing[3] }}>
                  {!messagingFlag && (
                    <li>Set NEXT_PUBLIC_ENABLE_MESSAGING_V1=true in .env.local (local) or Render env (staging)</li>
                  )}
                  {lastFetchStatus === 401 && (
                    <li>Check JWT token in localStorage. Try logging out and back in.</li>
                  )}
                  {lastFetchStatus === 404 && (
                    <li>Verify API base URL is correct. Check that /api/messages/threads route exists.</li>
                  )}
                  {threadsCount === 0 && !threadsLoading && (
                    <li>Database is empty. Click "Create Demo Data" above or run: npx tsx scripts/seed-messaging-data.ts</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
