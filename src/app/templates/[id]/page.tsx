/**
 * Template Edit Page - System DNA Implementation
 * 
 * Operational posture: Editing and actions focused, reduced ambient motion, clear action zones.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  FormRow,
  Skeleton,
  EmptyState,
  Badge,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Template {
  id: string;
  name: string;
  type: string;
  category: string;
  templateKey: string;
  subject: string | null;
  body: string;
  isActive: boolean;
}

const categoryOptions = [
  { value: 'client', label: 'Client' },
  { value: 'sitter', label: 'Sitter' },
  { value: 'owner', label: 'Owner' },
  { value: 'report', label: 'Report' },
  { value: 'invoice', label: 'Invoice' },
];

const typeOptions = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category: '',
    templateKey: '',
    subject: '',
    body: '',
    isActive: true,
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();
      if (data.template) {
        const tpl = data.template;
        setTemplate(tpl);
        setFormData({
          name: tpl.name || '',
          type: tpl.type || '',
          category: tpl.category || '',
          templateKey: tpl.templateKey || '',
          subject: tpl.subject || '',
          body: tpl.body || '',
          isActive: tpl.isActive !== false,
        });
      } else {
        setLoadError('Template not found');
      }
    } catch (err) {
      console.error('Failed to fetch template:', err);
      setLoadError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type || !formData.category || !formData.templateKey || !formData.body) {
      setError('Name, type, category, templateKey, and body are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          category: formData.category,
          templateKey: formData.templateKey,
          subject: formData.type === 'email' ? formData.subject : null,
          body: formData.body,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        router.push('/templates');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update template');
      }
    } catch (err) {
      console.error('Failed to update template:', err);
      setError('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  // SMS character count warning (160 chars is standard SMS limit, warn at 140)
  const smsCharacterCount = formData.type === 'sms' ? formData.body.length : 0;
  const smsWarning = smsCharacterCount > 140 && smsCharacterCount <= 160;

  if (loading) {
    return (
      <AppShell physiology="operational">
        <PageHeader title="Edit Template" description="Loading template..." />
        <Card depth="elevated">
          <Skeleton height="600px" />
        </Card>
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell physiology="operational">
        <PageHeader title="Edit Template" description="Failed to load template" />
        <Card depth="critical">
          <EmptyState
            icon="⚠️"
            title="Failed to Load Template"
            description={loadError}
            action={{
              label: 'Back to Templates',
              onClick: () => router.push('/templates'),
              variant: 'primary',
            }}
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell physiology="operational">
      <PageHeader
        title="Edit Template"
        description="Update your message template"
        actions={
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing[3],
            }}
          >
            <Button variant="tertiary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              energy="active"
              onClick={handleSave}
              disabled={saving || !formData.name.trim() || !formData.type || !formData.category || !formData.templateKey.trim() || !formData.body.trim()}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        }
      />

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
          <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700] }}>
            {error}
          </div>
        </Card>
      )}

      {/* Form Card */}
      <Card depth="elevated">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing[6],
          }}
        >
          <FormRow label="Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Template name"
            />
          </FormRow>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: tokens.spacing[4],
            }}
          >
            <FormRow label="Type" required>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: '', label: 'Select type' },
                  ...typeOptions,
                ]}
              />
            </FormRow>

            <FormRow label="Category" required>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={[
                  { value: '', label: 'Select category' },
                  ...categoryOptions,
                ]}
              />
            </FormRow>
          </div>

          <FormRow label="Template Key" required>
            <Input
              value={formData.templateKey}
              onChange={(e) => setFormData({ ...formData, templateKey: e.target.value })}
              placeholder="e.g., booking.confirmation"
            />
          </FormRow>

          {formData.type === 'email' && (
            <FormRow label="Subject">
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Email subject"
              />
            </FormRow>
          )}

          <FormRow label="Body" required>
            <div>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Message body with {{variables}}"
                rows={10}
              />
              {formData.type === 'sms' && (
                <div
                  style={{
                    marginTop: tokens.spacing[2],
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing[2],
                  }}
                >
                  <div
                    style={{
                      fontSize: tokens.typography.fontSize.sm[0],
                      color: tokens.colors.text.secondary,
                    }}
                  >
                    {smsCharacterCount} characters
                  </div>
                  {smsWarning && (
                    <Badge variant="warning">
                      Approaching SMS limit (160 chars)
                    </Badge>
                  )}
                  {smsCharacterCount > 160 && (
                    <Badge variant="error">
                      Exceeds SMS limit
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </FormRow>

          <FormRow>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing[2],
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Active</span>
            </label>
          </FormRow>
        </div>
      </Card>
    </AppShell>
  );
}
