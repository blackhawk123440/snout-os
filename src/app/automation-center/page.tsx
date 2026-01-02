/**
 * Automation Center Page - System DNA Implementation
 * 
 * Configuration posture: Automation builder/management (creating and managing automation rules).
 * Complete rewrite from legacy styling to System DNA.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  SectionHeader,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  enabled: boolean;
  priority: number;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    logic: string | null;
    order: number;
  }>;
  actions: Array<{
    id: string;
    type: string;
    config: string;
    order: number;
    delayMinutes: number | null;
  }>;
  _count?: {
    logs: number;
  };
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'booking' | 'payment' | 'reminder' | 'notification' | 'review';
  trigger: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    logic?: 'AND' | 'OR';
  }>;
  actions: Array<{
    type: string;
    config: Record<string, any>;
    delayMinutes?: number;
  }>;
  defaultEnabled: boolean;
}

export default function AutomationCenterPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedAutomationForLogs, setSelectedAutomationForLogs] = useState<string | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchTemplates = async (category?: string) => {
    setTemplatesLoading(true);
    try {
      const url = category
        ? `/api/automations/templates?category=${category}`
        : '/api/automations/templates';
      const response = await fetch(url);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const instantiateTemplate = async (templateId: string) => {
    try {
      const response = await fetch('/api/automations/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          enabled: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowTemplateGallery(false);
        setSelectedCategory(null);
        fetchAutomations();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create automation');
      }
    } catch (error) {
      console.error('Failed to instantiate template:', error);
      setError('Failed to create automation');
    }
  };

  const openTemplateGallery = () => {
    setShowTemplateGallery(true);
    fetchTemplates();
  };

  const fetchAutomations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/automations');
      if (!response.ok) {
        throw new Error('Failed to fetch automations');
      }
      const data = await response.json();
      setAutomations(data.automations || []);
    } catch (err) {
      setError('Failed to load automations');
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (automationId: string) => {
    try {
      const response = await fetch(`/api/automations/logs?automationId=${automationId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setSelectedAutomationForLogs(automationId);
        setShowLogs(true);
      } else {
        setError('Failed to load logs');
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError('Failed to load logs');
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchAutomations();
      } else {
        setError('Failed to toggle automation');
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      setError('Failed to toggle automation');
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchAutomations();
      } else {
        setError('Failed to delete automation');
      }
    } catch (error) {
      console.error('Failed to delete automation:', error);
      setError('Failed to delete automation');
    }
  };

  const runAutomation = async (id: string) => {
    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: {} }),
      });
      if (response.ok) {
        fetchAutomations();
      } else {
        setError('Failed to run automation');
      }
    } catch (error) {
      console.error('Failed to run automation:', error);
      setError('Failed to run automation');
    }
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'notification', label: 'Notification' },
    { value: 'review', label: 'Review' },
  ];

  if (loading) {
    return (
      <AppShell physiology="configuration">
        <PageHeader title="Automation Center" description="Manage all automated workflows and triggers" />
        <Card depth="elevated">
          <div style={{ padding: tokens.spacing[6] }}>
            <Skeleton height={400} />
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Automation Center"
        description="Manage all automated workflows and triggers"
        actions={
          <>
            <Button variant="secondary" onClick={openTemplateGallery} leftIcon={<i className="fas fa-book" />}>
              Use Template
            </Button>
            <Link href="/automation-center/new">
              <Button variant="primary" energy="active" leftIcon={<i className="fas fa-plus" />}>
                Create Automation
              </Button>
            </Link>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Error Banner */}
        {error && (
          <Card
            depth="critical"
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>{error}</div>
          </Card>
        )}

        {/* Automation List */}
        {automations.length === 0 ? (
          <EmptyState
            title="No Automations Yet"
            description="Create your first automation to automate workflows"
            icon={<i className="fas fa-robot" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: 'Create Automation',
              onClick: () => {
                window.location.href = '/automation-center/new';
              },
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {automations.map((automation) => (
              <Card key={automation.id} depth="elevated">
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2], flexWrap: 'wrap' }}>
                      <h3
                        style={{
                          fontSize: tokens.typography.fontSize.xl[0],
                          fontWeight: tokens.typography.fontWeight.bold,
                          color: tokens.colors.text.primary,
                          margin: 0,
                        }}
                      >
                        {automation.name}
                      </h3>
                      <Badge variant={automation.enabled ? 'success' : 'neutral'}>
                        {automation.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="info">Priority: {automation.priority}</Badge>
                    </div>
                    {automation.description && (
                      <p
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          marginBottom: tokens.spacing[3],
                        }}
                      >
                        {automation.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        gap: tokens.spacing[4],
                        flexWrap: 'wrap',
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Trigger:</span> {automation.trigger}
                      </div>
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Conditions:</span> {automation.conditions.length}
                      </div>
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Actions:</span> {automation.actions.length}
                      </div>
                      {automation._count && (
                        <div>
                          <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Executions:</span> {automation._count.logs}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
                    <Button
                      variant={automation.enabled ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => toggleAutomation(automation.id, automation.enabled)}
                    >
                      {automation.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="tertiary" size="sm" onClick={() => fetchLogs(automation.id)}>
                      Logs
                    </Button>
                    <Button variant="tertiary" size="sm" onClick={() => runAutomation(automation.id)}>
                      Run
                    </Button>
                    <Link href={`/automation-center/${automation.id}`}>
                      <Button variant="tertiary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button variant="danger" size="sm" onClick={() => deleteAutomation(automation.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Template Gallery Modal */}
      <Modal
        isOpen={showTemplateGallery}
        onClose={() => {
          setShowTemplateGallery(false);
          setSelectedCategory(null);
        }}
        title="Automation Templates"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          {/* Category Filter */}
          <div style={{ display: 'flex', gap: tokens.spacing[2], flexWrap: 'wrap' }}>
            <Button
              variant={selectedCategory === null ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setSelectedCategory(null);
                fetchTemplates();
              }}
            >
              All
            </Button>
            {(['booking', 'payment', 'reminder', 'notification', 'review'] as const).map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setSelectedCategory(cat);
                  fetchTemplates(cat);
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          {templatesLoading ? (
            <div style={{ padding: tokens.spacing[6], textAlign: 'center' }}>
              <Skeleton height={200} />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              title="No Templates Found"
              description={selectedCategory ? `No templates found for ${selectedCategory} category` : 'No templates available'}
              icon={<i className="fas fa-book" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: tokens.spacing[4],
              }}
            >
              {templates.map((template) => (
                <Card key={template.id} depth="elevated">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: tokens.spacing[2] }}>
                      <h4
                        style={{
                          fontSize: tokens.typography.fontSize.lg[0],
                          fontWeight: tokens.typography.fontWeight.bold,
                          color: tokens.colors.text.primary,
                          margin: 0,
                        }}
                      >
                        {template.name}
                      </h4>
                      <Badge variant="info">{template.category}</Badge>
                    </div>
                    <p
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                      }}
                    >
                      {template.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: tokens.spacing[1],
                        fontSize: tokens.typography.fontSize.xs[0],
                        color: tokens.colors.text.secondary,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Trigger:</span> {template.trigger}
                      </div>
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Conditions:</span> {template.conditions.length}
                      </div>
                      <div>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Actions:</span> {template.actions.length}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => instantiateTemplate(template.id)}
                      style={{ width: '100%' }}
                    >
                      Use This Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={showLogs}
        onClose={() => {
          setShowLogs(false);
          setSelectedAutomationForLogs(null);
          setLogs([]);
        }}
        title="Automation Logs"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
          {logs.length === 0 ? (
            <EmptyState
              title="No Logs Yet"
              description="Automation execution logs will appear here"
              icon={<i className="fas fa-list" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            />
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                depth="elevated"
                style={{
                  backgroundColor: log.success ? tokens.colors.success[50] : tokens.colors.error[50],
                  borderColor: log.success ? tokens.colors.success[200] : tokens.colors.error[200],
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: tokens.spacing[2] }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.base[0],
                        fontWeight: tokens.typography.fontWeight.semibold,
                        color: tokens.colors.text.primary,
                        marginBottom: tokens.spacing[1],
                      }}
                    >
                      {log.trigger}
                    </div>
                    {log.error && (
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.error.DEFAULT,
                          marginTop: tokens.spacing[1],
                        }}
                      >
                        {log.error}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                    }}
                  >
                    {new Date(log.executedAt).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
