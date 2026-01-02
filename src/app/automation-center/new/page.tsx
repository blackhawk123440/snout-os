/**
 * New Automation Page - System DNA Implementation
 * 
 * Configuration posture: Creating new automation rules.
 * Complete rewrite from legacy styling to System DNA.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  FormRow,
  SectionHeader,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

const TRIGGERS = [
  'booking.created',
  'booking.updated',
  'booking.status.changed',
  'booking.assigned',
  'booking.completed',
  'sitter.assigned',
  'sitter.unassigned',
  'sitter.checked_in',
  'sitter.checked_out',
  'payment.success',
  'payment.failed',
  'visit.completed',
  'client.created',
  'sitter.tier.changed',
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'in', label: 'In List' },
];

const ACTION_TYPES = [
  { value: 'sendSMS', label: 'Send SMS' },
  { value: 'sendEmail', label: 'Send Email' },
  { value: 'updateBookingStatus', label: 'Update Booking Status' },
  { value: 'assignSitter', label: 'Assign Sitter' },
  { value: 'notifyOwner', label: 'Notify Owner' },
  { value: 'writeInternalNote', label: 'Write Internal Note' },
];

const triggerOptions = TRIGGERS.map((t) => ({ value: t, label: t }));

export default function NewAutomationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('');
  const [priority, setPriority] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: '',
        operator: 'equals',
        value: '',
        logic: 'AND',
        order: conditions.length,
      },
    ]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([
      ...actions,
      {
        type: 'sendSMS',
        config: JSON.stringify({ recipient: 'client', template: '', phone: '' }),
        order: actions.length,
        delayMinutes: 0,
      },
    ]);
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    if (field === 'config') {
      try {
        const config = JSON.parse(value);
        updated[index] = { ...updated[index], config: JSON.stringify(config) };
      } catch {
        updated[index] = { ...updated[index], config: value };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setActions(updated);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !trigger) {
      setError('Name and trigger are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          trigger,
          priority,
          enabled,
          conditions,
          actions,
        }),
      });

      if (response.ok) {
        router.push('/automation-center');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create automation');
      }
    } catch (err) {
      console.error('Failed to create automation:', err);
      setError('Failed to create automation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell physiology="configuration">
      <PageHeader
        title="Create Automation"
        description="Build a new automated workflow"
        actions={
          <Button
            variant="primary"
            energy="active"
            onClick={handleSave}
            disabled={saving || !name || !trigger}
            isLoading={saving}
          >
            {saving ? 'Creating...' : 'Create Automation'}
          </Button>
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

        {/* Basic Information */}
        <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
          <SectionHeader title="Basic Information" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <FormRow label="Name" required>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Send confirmation when booking is created"
              />
            </FormRow>

            <FormRow label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this automation does"
                rows={3}
              />
            </FormRow>

            <FormRow label="Trigger" required>
              <Select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                options={[{ value: '', label: 'Select a trigger' }, ...triggerOptions]}
              />
            </FormRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
              <FormRow label="Priority">
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                />
              </FormRow>

              <FormRow label="Status">
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Enabled</span>
                </label>
              </FormRow>
            </div>
          </div>
        </Card>

        {/* Conditions */}
        <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
            <SectionHeader title="Conditions" />
            <Button variant="secondary" size="sm" onClick={addCondition} leftIcon={<i className="fas fa-plus" />}>
              Add Condition
            </Button>
          </div>

          {conditions.length === 0 ? (
            <div
              style={{
                padding: tokens.spacing[4],
                color: tokens.colors.text.secondary,
                fontStyle: 'italic',
              }}
            >
              No conditions (automation will always run)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              {conditions.map((condition, index) => (
                <Card
                  key={index}
                  depth="elevated"
                  style={{
                    padding: tokens.spacing[4],
                    backgroundColor: tokens.colors.neutral[50],
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.5fr 2fr 1fr auto',
                      gap: tokens.spacing[3],
                      alignItems: 'end',
                    }}
                  >
                    <FormRow label="Field">
                      <Input
                        type="text"
                        value={condition.field}
                        onChange={(e) => updateCondition(index, 'field', e.target.value)}
                        placeholder="e.g., service"
                      />
                    </FormRow>
                    <FormRow label="Operator">
                      <Select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                        options={OPERATORS}
                      />
                    </FormRow>
                    <FormRow label="Value">
                      <Input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, 'value', e.target.value)}
                        placeholder="Value to compare"
                      />
                    </FormRow>
                    <FormRow label="Logic">
                      <Select
                        value={condition.logic || 'AND'}
                        onChange={(e) => updateCondition(index, 'logic', e.target.value)}
                        options={[
                          { value: 'AND', label: 'AND' },
                          { value: 'OR', label: 'OR' },
                        ]}
                      />
                    </FormRow>
                    <Button variant="danger" size="sm" onClick={() => removeCondition(index)}>
                      <i className="fas fa-times" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing[4] }}>
            <SectionHeader title="Actions" />
            <Button variant="secondary" size="sm" onClick={addAction} leftIcon={<i className="fas fa-plus" />}>
              Add Action
            </Button>
          </div>

          {actions.length === 0 ? (
            <div
              style={{
                padding: tokens.spacing[4],
                color: tokens.colors.text.secondary,
                fontStyle: 'italic',
              }}
            >
              No actions (add at least one action)
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              {actions.map((action, index) => {
                let config: any = {};
                try {
                  config = JSON.parse(action.config || '{}');
                } catch {}

                return (
                  <Card
                    key={index}
                    depth="elevated"
                    style={{
                      padding: tokens.spacing[4],
                      backgroundColor: tokens.colors.neutral[50],
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr auto',
                        gap: tokens.spacing[3],
                        alignItems: 'end',
                        marginBottom: tokens.spacing[3],
                      }}
                    >
                      <FormRow label="Action Type">
                        <Select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          options={ACTION_TYPES}
                        />
                      </FormRow>
                      <FormRow label="Delay (minutes)">
                        <Input
                          type="number"
                          value={action.delayMinutes || 0}
                          onChange={(e) => updateAction(index, 'delayMinutes', parseInt(e.target.value) || 0)}
                        />
                      </FormRow>
                      <Button variant="danger" size="sm" onClick={() => removeAction(index)}>
                        Remove
                      </Button>
                    </div>

                    {action.type === 'sendSMS' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], marginTop: tokens.spacing[3] }}>
                        <FormRow label="Recipient">
                          <Select
                            value={config.recipient || 'client'}
                            onChange={(e) => {
                              const newConfig = { ...config, recipient: e.target.value };
                              updateAction(index, 'config', JSON.stringify(newConfig));
                            }}
                            options={[
                              { value: 'client', label: 'Client' },
                              { value: 'sitter', label: 'Sitter' },
                              { value: 'owner', label: 'Owner' },
                            ]}
                          />
                        </FormRow>
                        <FormRow label="Message Template">
                          <Textarea
                            value={config.template || ''}
                            onChange={(e) => {
                              const newConfig = { ...config, template: e.target.value };
                              updateAction(index, 'config', JSON.stringify(newConfig));
                            }}
                            placeholder="Message template with {{variables}}"
                            rows={3}
                          />
                        </FormRow>
                      </div>
                    )}

                    {action.type === 'updateBookingStatus' && (
                      <div style={{ marginTop: tokens.spacing[3] }}>
                        <FormRow label="New Status">
                          <Input
                            type="text"
                            value={config.status || ''}
                            onChange={(e) => {
                              const newConfig = { ...config, status: e.target.value };
                              updateAction(index, 'config', JSON.stringify(newConfig));
                            }}
                            placeholder="e.g., confirmed"
                          />
                        </FormRow>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[3] }}>
          <Button variant="tertiary" onClick={() => router.back()} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            energy="active"
            onClick={handleSave}
            disabled={saving || !name || !trigger}
            isLoading={saving}
          >
            {saving ? 'Creating...' : 'Create Automation'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
