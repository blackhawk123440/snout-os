/**
 * Automation Center Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
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
  Flex,
  Grid,
  GridCol,
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
  category: "booking" | "payment" | "reminder" | "notification" | "review";
  trigger: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    logic?: "AND" | "OR";
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAutomations();
  }, []);

  const fetchTemplates = async (category?: string) => {
    setTemplatesLoading(true);
    try {
      const url = category 
        ? `/api/automations/templates?category=${category}`
        : "/api/automations/templates";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const instantiateTemplate = async (templateId: string) => {
    try {
      const response = await fetch("/api/automations/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          enabled: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Automation "${data.automation.name}" created successfully!`);
        setShowTemplateGallery(false);
        fetchAutomations();
      } else {
        const error = await response.json();
        alert(`Failed to create automation: ${error.error}`);
      }
    } catch (err) {
      alert("Failed to create automation");
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
      const response = await fetch("/api/automations");
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
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setShowLogs(true);
    } catch (err) {
      setError('Failed to load logs');
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        fetchAutomations();
      } else {
        setError('Failed to toggle automation');
      }
    } catch (err) {
      setError('Failed to toggle automation');
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAutomations();
      } else {
        setError('Failed to delete automation');
      }
    } catch (err) {
      setError('Failed to delete automation');
    }
  };

  const runAutomation = async (id: string) => {
    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: {} }),
      });
      if (response.ok) {
        alert("Automation triggered successfully");
        fetchAutomations();
      } else {
        setError('Failed to run automation');
      }
    } catch (err) {
      setError('Failed to run automation');
    }
  };

  const categories = ["booking", "payment", "reminder", "notification", "review"] as const;

  return (
    <AppShell>
      <PageHeader
        title="Automation Center"
        description="Manage all automated workflows and triggers"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={openTemplateGallery}
              leftIcon={<i className="fas fa-book" />}
            >
              Use Template
            </Button>
            <Link href="/automation-center/new">
              <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
                Create Automation
              </Button>
            </Link>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {error && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>
              {error}
            </div>
          </Card>
        )}

        {loading ? (
          <Flex direction="column" gap={4}>
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </Flex>
        ) : automations.length === 0 ? (
          <EmptyState
            title="No Automations Yet"
            description="Create your first automation to automate workflows"
            icon={<i className="fas fa-robot" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Create Automation",
              onClick: () => window.location.href = "/automation-center/new",
            }}
          />
        ) : (
          <Flex direction="column" gap={4}>
            {automations.map((automation) => (
              <Card key={automation.id}>
                <Flex align="flex-start" justify="space-between" gap={4}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: tokens.spacing[2] }}>
                      <Flex align="center" gap={2} wrap>
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.lg[0],
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {automation.name}
                      </div>
                      <Badge variant={automation.enabled ? "success" : "neutral"}>
                        {automation.enabled ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="info">Priority: {automation.priority}</Badge>
                    </Flex>
                    </div>
                    {automation.description && (
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          marginBottom: tokens.spacing[3],
                        }}
                      >
                        {automation.description}
                      </div>
                    )}
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      <Flex align="center" gap={4}>
                      <div>
                        <strong>Trigger:</strong> {automation.trigger}
                      </div>
                      <div>
                        <strong>Conditions:</strong> {automation.conditions.length}
                      </div>
                      <div>
                        <strong>Actions:</strong> {automation.actions.length}
                      </div>
                      {automation._count && (
                        <div>
                          <strong>Executions:</strong> {automation._count.logs}
                        </div>
                      )}
                      </Flex>
                    </div>
                  </div>
                  <Flex gap={2} align="center" wrap>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleAutomation(automation.id, automation.enabled)}
                    >
                      {automation.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fetchLogs(automation.id)}
                    >
                      Logs
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => runAutomation(automation.id)}
                    >
                      Run
                    </Button>
                    <Link href={`/automation-center/${automation.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteAutomation(automation.id)}
                    >
                      Delete
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
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
      >
        <div>
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm[0],
              color: tokens.colors.text.secondary,
              marginBottom: tokens.spacing[4],
            }}
          >
            Choose a pre-built template to get started quickly
          </div>

          {/* Category Filter */}
          <div style={{ marginBottom: tokens.spacing[6] }}>
            <Flex gap={2} wrap>
            <Button
              variant={selectedCategory === null ? "primary" : "tertiary"}
              size="sm"
              onClick={() => {
                setSelectedCategory(null);
                fetchTemplates();
              }}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "primary" : "tertiary"}
                size="sm"
                onClick={() => {
                  setSelectedCategory(cat);
                  fetchTemplates(cat);
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </Flex>
          </div>

          {/* Templates Grid */}
          {templatesLoading ? (
            <div style={{ textAlign: 'center', padding: tokens.spacing[12] }}>
              <div style={{ fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.secondary }}>
                Loading templates...
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: tokens.spacing[12] }}>
              <div style={{ fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.secondary }}>
                No templates found
              </div>
            </div>
          ) : (
            <Grid gap={4}>
              {templates.map((template) => (
                <GridCol span={12} md={6} lg={4} key={template.id}>
                  <Card>
                    <div style={{ marginBottom: tokens.spacing[3] }}>
                      <div style={{ marginBottom: tokens.spacing[2] }}>
                        <Flex align="center" justify="space-between">
                          <div
                            style={{
                              fontWeight: tokens.typography.fontWeight.bold,
                              fontSize: tokens.typography.fontSize.lg[0],
                              color: tokens.colors.text.primary,
                            }}
                          >
                            {template.name}
                          </div>
                          <Badge variant="info" style={{ textTransform: 'capitalize' }}>
                            {template.category}
                          </Badge>
                        </Flex>
                      </div>
                    <div
                      style={{
                        fontSize: tokens.typography.fontSize.sm[0],
                        color: tokens.colors.text.secondary,
                        marginBottom: tokens.spacing[3],
                      }}
                    >
                      {template.description}
                    </div>
                  </div>

                  <div style={{ marginBottom: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                    <Flex direction="column" gap={2}>
                    <div>
                      <strong>Trigger:</strong> {template.trigger}
                    </div>
                    <div>
                      <strong>Conditions:</strong> {template.conditions.length}
                    </div>
                    <div>
                      <strong>Actions:</strong> {template.actions.length}
                    </div>
                    </Flex>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => instantiateTemplate(template.id)}
                    style={{ width: '100%' }}
                  >
                    Use This Template
                  </Button>
                </Card>
                </GridCol>
              ))}
            </Grid>
          )}
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        title="Automation Logs"
      >
        <Flex direction="column" gap={2}>
          {logs.length === 0 ? (
            <div style={{ color: tokens.colors.text.secondary }}>
              No logs yet
            </div>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                style={{
                  backgroundColor: log.success ? tokens.colors.success[50] : tokens.colors.error[50],
                  borderColor: log.success ? tokens.colors.success[200] : tokens.colors.error[200],
                }}
              >
                <div style={{ padding: tokens.spacing[3] }}>
                  <div style={{ marginBottom: tokens.spacing[2] }}>
                    <Flex align="center" justify="space-between">
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.primary }}>
                      {log.trigger}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {new Date(log.executedAt).toLocaleString()}
                    </div>
                  </Flex>
                  </div>
                  {log.error && (
                    <div style={{ color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0], marginTop: tokens.spacing[2] }}>
                      {log.error}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </Flex>
      </Modal>
    </AppShell>
  );
}
