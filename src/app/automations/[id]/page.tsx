/**
 * Automation Builder Page
 * 
 * Complete automation builder with triggers, conditions, actions, templates,
 * preview, and test mode.
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Tabs,
  TabPanel,
  Skeleton,
  EmptyState,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import { allTriggers, getTriggerById, validateTriggerConfig } from '@/lib/automations/trigger-registry';
import { allActions, getActionById, validateActionConfig } from '@/lib/automations/action-registry';
import { allConditions, getConditionById, generateConditionSentence } from '@/lib/automations/condition-builder';
import { templateVariables, extractVariables, previewTemplate, validateTemplateVariables, getSMSCharacterCount } from '@/lib/automations/template-system';

export default function AutomationBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useMobile();
  const automationId = params.id as string;
  const isNew = automationId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [automation, setAutomation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trigger' | 'conditions' | 'actions' | 'templates' | 'schedule' | 'preview'>('trigger');

  // Trigger state
  const [selectedTriggerType, setSelectedTriggerType] = useState<string>('');
  const [triggerConfig, setTriggerConfig] = useState<any>({});

  // Conditions state
  const [conditionGroups, setConditionGroups] = useState<Array<{
    id: string;
    operator: 'all' | 'any';
    conditions: Array<{
      id: string;
      conditionType: string;
      conditionConfig: any;
    }>;
  }>>([]);

  // Actions state
  const [actions, setActions] = useState<Array<{
    id: string;
    actionType: string;
    actionConfig: any;
  }>>([]);

  // Templates state
  const [templates, setTemplates] = useState<Array<{
    templateType: 'sms' | 'email' | 'internalMessage';
    subject?: string;
    body: string;
  }>>([]);

  useEffect(() => {
    if (!isNew) {
      fetchAutomation();
    }
  }, [automationId, isNew]);

  const fetchAutomation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automations/${automationId}`);
      if (response.ok) {
        const data = await response.json();
        setAutomation(data.automation);
        
        // Load trigger
        if (data.automation.trigger) {
          setSelectedTriggerType(data.automation.trigger.triggerType);
          setTriggerConfig(JSON.parse(data.automation.trigger.triggerConfig || '{}'));
        }

        // Load condition groups
        if (data.automation.conditionGroups) {
          setConditionGroups(data.automation.conditionGroups.map((group: any) => ({
            id: group.id,
            operator: group.operator,
            conditions: group.conditions.map((c: any) => ({
              id: c.id,
              conditionType: c.conditionType,
              conditionConfig: JSON.parse(c.conditionConfig || '{}'),
            })),
          })));
        }

        // Load actions
        if (data.automation.actions) {
          setActions(data.automation.actions.map((a: any) => ({
            id: a.id,
            actionType: a.actionType,
            actionConfig: JSON.parse(a.actionConfig || '{}'),
          })));
        }

        // Load templates
        if (data.automation.templates) {
          setTemplates(data.automation.templates.map((t: any) => ({
            templateType: t.templateType,
            subject: t.subject,
            body: t.body,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch automation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = isNew ? '/api/automations' : `/api/automations/${automationId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: automation?.name || 'Untitled Automation',
          description: automation?.description || '',
          triggerType: selectedTriggerType,
          triggerConfig,
          conditionGroups,
          actions,
          templates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          router.push(`/automations/${data.automation.id}`);
        } else {
          fetchAutomation();
        }
      }
    } catch (error) {
      console.error('Failed to save automation:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Automation Builder" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={600} />
        </div>
      </AppShell>
    );
  }

  const selectedTrigger = selectedTriggerType ? getTriggerById(selectedTriggerType) : null;

  return (
    <AppShell>
      <PageHeader
        title={isNew ? 'Create Automation' : automation?.name || 'Edit Automation'}
        description={isNew ? 'Build a new automation workflow' : automation?.description || ''}
        actions={
          <>
            <Link href="/automations">
              <Button variant="secondary">Cancel</Button>
            </Link>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              {isNew ? 'Create' : 'Save'}
            </Button>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {isMobile ? (
          <Tabs
            tabs={[
              { id: 'trigger', label: 'Trigger' },
              { id: 'conditions', label: 'Conditions' },
              { id: 'actions', label: 'Actions' },
              { id: 'templates', label: 'Templates' },
              { id: 'preview', label: 'Preview' },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as any)}
          >
            <TabPanel id="trigger">
              {renderTriggerSection()}
            </TabPanel>
            <TabPanel id="conditions">
              {renderConditionsSection()}
            </TabPanel>
            <TabPanel id="actions">
              {renderActionsSection()}
            </TabPanel>
            <TabPanel id="templates">
              {renderTemplatesSection()}
            </TabPanel>
            <TabPanel id="preview">
              {renderPreviewSection()}
            </TabPanel>
          </Tabs>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: tokens.spacing[6] }}>
            {/* Left Panel */}
            <div>
              <Card>
                <div style={{ padding: tokens.spacing[4] }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginBottom: tokens.spacing[4] }}>
                    {[
                      { id: 'trigger', label: 'Trigger' },
                      { id: 'conditions', label: 'Conditions' },
                      { id: 'actions', label: 'Actions' },
                      { id: 'templates', label: 'Templates' },
                      { id: 'schedule', label: 'Schedule' },
                    ].map(tab => (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                  {activeTab === 'trigger' && renderTriggerSection()}
                  {activeTab === 'conditions' && renderConditionsSection()}
                  {activeTab === 'actions' && renderActionsSection()}
                  {activeTab === 'templates' && renderTemplatesSection()}
                  {activeTab === 'schedule' && renderScheduleSection()}
                </div>
              </Card>
            </div>

            {/* Right Panel - Preview */}
            <div>
              {renderPreviewSection()}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );

  function renderTriggerSection() {
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>
            Select Trigger
          </h3>
          <Select
            label="Trigger Type"
            value={selectedTriggerType}
            onChange={(e) => {
              setSelectedTriggerType(e.target.value);
              setTriggerConfig({});
            }}
            options={[
              { value: '', label: 'Select a trigger...' },
              ...allTriggers.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
          {selectedTrigger && (
            <div style={{ marginTop: tokens.spacing[4] }}>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[3] }}>
                {selectedTrigger.description}
              </p>
              {/* Render trigger config fields based on schema */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                {/* Config fields would be rendered here based on trigger type */}
                <Input
                  label="Configuration"
                  value={JSON.stringify(triggerConfig)}
                  onChange={(e) => {
                    try {
                      setTriggerConfig(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="{}"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  function renderConditionsSection() {
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
            <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              Conditions
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setConditionGroups([...conditionGroups, {
                  id: `group-${Date.now()}`,
                  operator: 'all',
                  conditions: [],
                }]);
              }}
            >
              Add Group
            </Button>
          </div>
          {conditionGroups.length === 0 ? (
            <EmptyState
              title="No conditions"
              description="Add condition groups to filter when this automation runs"
              icon="🔍"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              {conditionGroups.map((group, groupIndex) => (
                <Card key={group.id} style={{ padding: tokens.spacing[3] }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[3] }}>
                    <Select
                      value={group.operator}
                      onChange={(e) => {
                        const updated = [...conditionGroups];
                        updated[groupIndex].operator = e.target.value as 'all' | 'any';
                        setConditionGroups(updated);
                      }}
                      options={[
                        { value: 'all', label: 'All conditions must match' },
                        { value: 'any', label: 'Any condition must match' },
                      ]}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConditionGroups(conditionGroups.filter((_, i) => i !== groupIndex));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  {/* Condition list would be rendered here */}
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    );
  }

  function renderActionsSection() {
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing[4] }}>
            <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold }}>
              Actions
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                // Open action selector
              }}
            >
              Add Action
            </Button>
          </div>
          {actions.length === 0 ? (
            <EmptyState
              title="No actions"
              description="Add actions to define what this automation will do"
              icon="⚡"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
              {actions.map((action, index) => {
                const actionDef = getActionById(action.actionType);
                return (
                  <Card key={action.id} style={{ padding: tokens.spacing[3] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
                          {actionDef?.name || action.actionType}
                        </div>
                        {actionDef && (
                          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                            {actionDef.preview(action.actionConfig)}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActions(actions.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    );
  }

  function renderTemplatesSection() {
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>
            Message Templates
          </h3>
          {/* Template editor would be rendered here */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {templates.map((template, index) => (
              <Card key={index} style={{ padding: tokens.spacing[4] }}>
                <Select
                  label="Template Type"
                  value={template.templateType}
                  onChange={(e) => {
                    const updated = [...templates];
                    updated[index].templateType = e.target.value as any;
                    setTemplates(updated);
                  }}
                  options={[
                    { value: 'sms', label: 'SMS' },
                    { value: 'email', label: 'Email' },
                    { value: 'internalMessage', label: 'Internal Message' },
                  ]}
                />
                {template.templateType === 'email' && (
                  <Input
                    label="Subject"
                    value={template.subject || ''}
                    onChange={(e) => {
                      const updated = [...templates];
                      updated[index].subject = e.target.value;
                      setTemplates(updated);
                    }}
                    style={{ marginTop: tokens.spacing[3] }}
                  />
                )}
                <Textarea
                  label="Body"
                  value={template.body}
                  onChange={(e) => {
                    const updated = [...templates];
                    updated[index].body = e.target.value;
                    setTemplates(updated);
                  }}
                  rows={8}
                  style={{ marginTop: tokens.spacing[3] }}
                />
                {template.templateType === 'sms' && (
                  <div style={{ marginTop: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                    Characters: {getSMSCharacterCount(template.body)}
                  </div>
                )}
                <div style={{ marginTop: tokens.spacing[3] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[2] }}>
                    Preview:
                  </div>
                  <Card style={{ padding: tokens.spacing[3], backgroundColor: tokens.colors.background.secondary }}>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: tokens.typography.fontSize.sm[0] }}>
                      {previewTemplate(template.body)}
                    </div>
                  </Card>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function renderScheduleSection() {
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>
            Schedule & Throttle
          </h3>
          <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            Schedule and throttling configuration will be available here.
          </p>
        </div>
      </Card>
    );
  }

  function renderPreviewSection() {
    const conditionSentence = generateConditionSentence(conditionGroups as any);
    
    return (
      <Card>
        <div style={{ padding: tokens.spacing[4] }}>
          <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[4] }}>
            Preview
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[1] }}>
                Trigger:
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                {selectedTrigger ? selectedTrigger.preview(triggerConfig) : 'No trigger selected'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[1] }}>
                Conditions:
              </div>
              <div style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                {conditionSentence || 'No conditions (will always run)'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, marginBottom: tokens.spacing[1] }}>
                Actions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {actions.length === 0 ? (
                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.secondary }}>
                    No actions configured
                  </div>
                ) : (
                  actions.map((action, index) => {
                    const actionDef = getActionById(action.actionType);
                    return (
                      <div key={index} style={{ fontSize: tokens.typography.fontSize.base[0] }}>
                        {index + 1}. {actionDef?.preview(action.actionConfig) || action.actionType}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <Button variant="primary" leftIcon={<i className="fas fa-vial" />}>
                Run Test
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }
}
