/**
 * Automations Control Center - List Page
 * 
 * Enterprise automation management system with builder, preview, test mode,
 * and audit capabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Send } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  Button,
  Input,
  Badge,
  Skeleton,
  EmptyState,
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { OwnerAppShell, LayoutWrapper, PageHeader, Section } from '@/components/layout';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';

interface Automation {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  sendToClient?: boolean;
  sendToSitter?: boolean;
  sendToOwner?: boolean;
}

interface AutomationStats {
  totalEnabled: number;
  runsToday: number;
  failuresToday: number;
}

export default function AutomationsPage() {
  const isMobile = useMobile();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [stats, setStats] = useState<AutomationStats>({
    totalEnabled: 0,
    runsToday: 0,
    failuresToday: 0,
  });

  useEffect(() => {
    fetchAutomations();
    fetchStats();
  }, []);

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/automations');
      if (response.ok) {
        const data = await response.json();
        setAutomations(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/automations/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (response.ok) {
        fetchAutomations();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const filteredAutomations = automations.filter(automation => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!automation.name.toLowerCase().includes(search) &&
          !automation.description?.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filterEnabled === 'enabled' && !automation.enabled) return false;
    if (filterEnabled === 'disabled' && automation.enabled) return false;
    return true;
  });

  if (loading) {
    return (
      <OwnerAppShell>
        <LayoutWrapper variant="wide">
          <PageHeader title="Automations" subtitle="Manage automation types and message templates" />
          <Section>
            <Skeleton height={400} />
          </Section>
        </LayoutWrapper>
      </OwnerAppShell>
    );
  }

  return (
    <OwnerAppShell>
      <LayoutWrapper variant="wide">
        <PageHeader
          title="Automations"
          subtitle="Manage automation types, templates, and run history"
          actions={
            <Link href="/ops/automation-failures">
              <Button variant="secondary" size="sm" leftIcon={<AlertTriangle size={14} />}>
                View failures
              </Button>
            </Link>
          }
        />

        <Section title="Overview" description="Runs and failures are org-wide. Filter by status below.">
          <Grid gap={4}>
            <GridCol span={12} md={4}>
              <Card className="border border-border-default">
                <div style={{ padding: tokens.spacing[4] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Enabled
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                    {stats.totalEnabled}
                  </div>
                </div>
              </Card>
            </GridCol>
            <GridCol span={12} md={4}>
              <Card className="border border-border-default">
                <div style={{ padding: tokens.spacing[4] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Runs today
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                    {stats.runsToday}
                  </div>
                </div>
              </Card>
            </GridCol>
            <GridCol span={12} md={4}>
              <Card className="border border-border-default">
                <div style={{ padding: tokens.spacing[4] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Failures today
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold, color: stats.failuresToday > 0 ? tokens.colors.error.DEFAULT : undefined }}>
                    {stats.failuresToday}
                  </div>
                  {stats.failuresToday > 0 && (
                    <Link href="/ops/automation-failures" className="text-sm text-teal-600 hover:underline mt-1 inline-block">
                      View failure log →
                    </Link>
                  )}
                </div>
              </Card>
            </GridCol>
          </Grid>
        </Section>

        <Section title="Automation types">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search automations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={14} />}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value)}
              className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-text-primary"
              aria-label="Filter by status"
            >
              <option value="all">All</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {filteredAutomations.length === 0 ? (
            <Card>
              <EmptyState
                title="No automations found"
                description={searchTerm || filterEnabled !== 'all' ? 'Try adjusting your filters' : 'No automation types configured'}
                icon="🤖"
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {filteredAutomations.map((automation) => (
                <Card key={automation.id} className="border border-border-default overflow-hidden">
                  <div style={{ padding: tokens.spacing[4] }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-text-primary m-0">
                            {automation.name}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              automation.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-surface-tertiary text-text-secondary'
                            }`}
                          >
                            {automation.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <Badge variant="info">{automation.category}</Badge>
                        </div>
                        <p className="text-sm text-text-secondary m-0">
                          {automation.description}
                        </p>
                        <div className="mt-2 text-xs text-text-tertiary">
                          Last run / failures: see <Link href="/ops/automation-failures" className="text-teal-600 hover:underline">failure log</Link>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={automation.enabled}
                            onChange={(e) => toggleEnabled(automation.id, e.target.checked)}
                            className="h-4 w-4 rounded border-border-strong"
                          />
                          <span className="text-sm">On / Off</span>
                        </label>
                        <Link href={`/automations/${automation.id}`}>
                          <Button variant="primary" size="sm" leftIcon={<Send size={14} />}>
                            Edit & test message
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </LayoutWrapper>
    </OwnerAppShell>
  );
}
