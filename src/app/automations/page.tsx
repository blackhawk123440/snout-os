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
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
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
        title="Automations"
        description="Manage automation types, templates, and view run history"
        actions={
          <Link href="/ops/automation-failures">
            <Button variant="secondary" leftIcon={<i className="fas fa-exclamation-triangle" />}>
              View failures
            </Button>
          </Link>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Stats Cards */}
        <div style={{ marginBottom: tokens.spacing[6] }}>
          <Grid gap={4}> {/* Batch 5: UI Constitution compliance */}
            <GridCol span={12} md={4}>
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
            </GridCol>
            <GridCol span={12} md={4}>
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
            </GridCol>
            <GridCol span={12} md={4}>
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
            </GridCol>
          </Grid>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ padding: tokens.spacing[4] }}>
            <Flex direction={isMobile ? 'column' : 'row'} gap={4} align={isMobile ? 'stretch' : 'center'}> {/* Batch 5: UI Constitution compliance */}
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
                  { value: 'all', label: 'All' },
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
                style={{ minWidth: isMobile ? '100%' : '150px' }}
              />
            </Flex>
          </div>
        </Card>

        {/* Automation List */}
        {filteredAutomations.length === 0 ? (
          <Card>
            <EmptyState
              title="No automations found"
              description={searchTerm || filterEnabled !== 'all' ? "Try adjusting your filters" : "No automation types configured"}
              icon="🤖"
            />
          </Card>
        ) : (
          <Flex direction="column" gap={4}>
            {filteredAutomations.map((automation) => (
              <Card key={automation.id}>
                <Flex
                  direction={isMobile ? 'column' : 'row'}
                  align={isMobile ? 'stretch' : 'center'}
                  justify="space-between"
                  gap={4}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: tokens.spacing[2] }}>
                      <Flex align="center" gap={2}>
                        <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, margin: 0 }}>
                          {automation.name}
                        </h3>
                        <Badge variant={automation.enabled ? 'success' : 'neutral'}>
                          {automation.enabled ? 'On' : 'Off'}
                        </Badge>
                        <Badge variant="info">{automation.category}</Badge>
                      </Flex>
                    </div>
                    <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, margin: 0 }}>
                      {automation.description}
                    </p>
                  </div>
                  <Flex align="center" gap={2}>
                    <label style={{ cursor: 'pointer' }}>
                      <Flex align="center">
                        <input
                          type="checkbox"
                          checked={automation.enabled}
                          onChange={(e) => toggleEnabled(automation.id, e.target.checked)}
                        />
                        <span style={{ marginLeft: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0] }}>
                          Enabled
                        </span>
                      </Flex>
                    </label>
                    <Link href={`/automations/${automation.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit templates
                      </Button>
                    </Link>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </div>
    </AppShell>
  );
}
