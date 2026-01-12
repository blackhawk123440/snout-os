/**
 * Automations Control Center - List Page
 * 
 * Enterprise automation management system with builder, preview, test mode,
 * and audit capabilities.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  EmptyState,
  MobileFilterBar,
  Tabs,
  TabPanel,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { getTriggerById } from '@/lib/automations/trigger-registry';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger?: {
    triggerType: string;
  } | null;
  runs?: Array<{
    id: string;
    status: string;
    triggeredAt: Date;
  }>;
  _count?: {
    runs: number;
  };
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
  const [filterEnabled, setFilterEnabled] = useState<string>('all'); // all, enabled, disabled
  const [filterTrigger, setFilterTrigger] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, draft, active, paused, archived
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
        setAutomations(data.automations || []);
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
        body: JSON.stringify({ isEnabled: enabled }),
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
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!automation.name.toLowerCase().includes(search) &&
          !automation.description?.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Enabled filter
    if (filterEnabled === 'enabled' && !automation.isEnabled) return false;
    if (filterEnabled === 'disabled' && automation.isEnabled) return false;

    // Trigger filter
    if (filterTrigger !== 'all' && automation.trigger?.triggerType !== filterTrigger) {
      return false;
    }

    // Status filter
    if (filterStatus !== 'all' && automation.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const getLastRunStatus = (automation: Automation) => {
    if (!automation.runs || automation.runs.length === 0) {
      return { status: 'never', label: 'Never run', variant: 'neutral' as const };
    }
    const lastRun = automation.runs[0];
    const status = lastRun.status;
    if (status === 'success') {
      return { status: 'success', label: 'Success', variant: 'success' as const };
    }
    if (status === 'failed') {
      return { status: 'failed', label: 'Failed', variant: 'error' as const };
    }
    if (status === 'skipped') {
      return { status: 'skipped', label: 'Skipped', variant: 'warning' as const };
    }
    return { status: 'unknown', label: status, variant: 'neutral' as const };
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Automations Control Center" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Automations Control Center"
        description="Create, manage, and monitor automations"
        actions={
          <Link href="/automations/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Automation
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: tokens.spacing[4],
            marginBottom: tokens.spacing[6],
          }}
        >
          <Card>
            <div style={{ padding: tokens.spacing[4] }}>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Enabled Automations
              </div>
              <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                {stats.totalEnabled}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: tokens.spacing[4] }}>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Runs Today
              </div>
              <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold }}>
                {stats.runsToday}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ padding: tokens.spacing[4] }}>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                Failures Today
              </div>
              <div style={{ fontSize: tokens.typography.fontSize['2xl'][0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.error.DEFAULT }}>
                {stats.failuresToday}
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ padding: tokens.spacing[4] }}>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: tokens.spacing[4],
                alignItems: isMobile ? 'stretch' : 'center',
              }}
            >
              <Input
                placeholder="Search automations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<i className="fas fa-search" />}
                style={{ flex: 1 }}
              />
              <Select
                value={filterEnabled}
                onChange={(e) => setFilterEnabled(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
                style={{ minWidth: isMobile ? '100%' : '150px' }}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All States' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'paused', label: 'Paused' },
                  { value: 'archived', label: 'Archived' },
                ]}
                style={{ minWidth: isMobile ? '100%' : '150px' }}
              />
            </div>
          </div>
        </Card>

        {/* Automation List */}
        {filteredAutomations.length === 0 ? (
          <Card>
            <EmptyState
              title="No automations found"
              description={searchTerm || filterEnabled !== 'all' || filterStatus !== 'all'
                ? "Try adjusting your filters"
                : "Create your first automation to get started"}
              icon="🤖"
              action={
                !searchTerm && filterEnabled === 'all' && filterStatus === 'all'
                  ? {
                      label: 'Create Automation',
                      onClick: () => window.location.href = '/automations/new',
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {filteredAutomations.map((automation) => {
              const lastRun = getLastRunStatus(automation);
              const trigger = automation.trigger ? getTriggerById(automation.trigger.triggerType) : null;

              return (
                <Card key={automation.id}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'center',
                      justifyContent: 'space-between',
                      gap: tokens.spacing[4],
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2] }}>
                        <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, margin: 0 }}>
                          {automation.name}
                        </h3>
                        <Badge variant={automation.status === 'active' ? 'success' : automation.status === 'paused' ? 'warning' : 'neutral'}>
                          {automation.status}
                        </Badge>
                        {trigger && (
                          <Badge variant="info">
                            {trigger.name}
                          </Badge>
                        )}
                      </div>
                      {automation.description && (
                        <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, margin: 0, marginBottom: tokens.spacing[2] }}>
                          {automation.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <span>Last run: {lastRun.label}</span>
                        {automation._count && (
                          <span>• {automation._count.runs} total runs</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={automation.isEnabled}
                          onChange={(e) => toggleEnabled(automation.id, e.target.checked)}
                        />
                        <span style={{ marginLeft: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0] }}>
                          Enabled
                        </span>
                      </label>
                      <Link href={`/automations/${automation.id}`}>
                        <Button variant="secondary" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/automations/${automation.id}/test`}>
                        <Button variant="tertiary" size="sm" leftIcon={<i className="fas fa-vial" />}>
                          Test
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
