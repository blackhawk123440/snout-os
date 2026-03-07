/**
 * Automation type editor - /automations/[id]
 * Edit one automation type: enabled, sendTo*, message templates. Test message.
 * id = bookingConfirmation | nightBeforeReminder | paymentReminder | sitterAssignment | postVisitThankYou | ownerNewBookingAlert
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Textarea,
  Skeleton,
  Flex,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { AUTOMATION_TYPE_IDS, type AutomationTypeId } from '@/lib/automations/types';

const TYPE_META: Record<
  AutomationTypeId,
  { name: string; description: string; recipients: ('client' | 'sitter' | 'owner')[] }
> = {
  bookingConfirmation: {
    name: 'Booking Confirmation',
    description: 'Sends confirmation when a booking is confirmed',
    recipients: ['client', 'sitter', 'owner'],
  },
  nightBeforeReminder: {
    name: 'Night Before Reminder',
    description: 'Sends reminders the night before appointments',
    recipients: ['client', 'sitter', 'owner'],
  },
  paymentReminder: {
    name: 'Payment Reminder',
    description: 'Sends payment reminders to clients',
    recipients: ['client', 'owner'],
  },
  sitterAssignment: {
    name: 'Sitter Assignment',
    description: 'Notifies sitters and owners when a sitter is assigned',
    recipients: ['sitter', 'owner', 'client'],
  },
  postVisitThankYou: {
    name: 'Post Visit Thank You',
    description: 'Sends thank you messages after visits',
    recipients: ['client', 'sitter'],
  },
  ownerNewBookingAlert: {
    name: 'Owner New Booking Alert',
    description: 'Alerts owner when a new booking is created',
    recipients: ['client', 'owner'],
  },
};

const RECIPIENT_LABEL: Record<'client' | 'sitter' | 'owner', string> = {
  client: 'Client',
  sitter: 'Sitter',
  owner: 'Owner',
};

const TEMPLATE_KEYS: Record<'client' | 'sitter' | 'owner', string> = {
  client: 'messageTemplateClient',
  sitter: 'messageTemplateSitter',
  owner: 'messageTemplateOwner',
};

export default function AutomationTypeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params.id as string) || '';
  const validId = id && AUTOMATION_TYPE_IDS.includes(id as AutomationTypeId);
  const typeId = validId ? (id as AutomationTypeId) : null;

  const [loading, setLoading] = useState(!!typeId);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [block, setBlock] = useState<Record<string, unknown>>({});
  const [testPhone, setTestPhone] = useState('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  const fetchBlock = useCallback(async () => {
    if (!typeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/${typeId}`);
      if (res.ok) {
        const data = await res.json();
        setBlock(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [typeId]);

  useEffect(() => {
    if (!typeId) {
      router.replace('/automations');
      return;
    }
    fetchBlock();
  }, [typeId, router, fetchBlock]);

  const update = (updates: Record<string, unknown>) => {
    setBlock((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!typeId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/automations/${typeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block),
      });
      if (res.ok) await fetchBlock();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (template: string) => {
    if (!template?.trim()) {
      setTestError('Enter a template to test');
      return;
    }
    if (!testPhone.trim()) {
      setTestError('Enter a phone number');
      return;
    }
    setTestError(null);
    setTestSuccess(false);
    setTesting(true);
    try {
      const res = await fetch('/api/automations/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: template.trim(), phoneNumber: testPhone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
      } else {
        setTestError(data.error || 'Send failed');
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setTesting(false);
    }
  };

  if (!typeId) return null;

  const meta = TYPE_META[typeId];

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Edit automation" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={meta.name}
        description={meta.description}
        actions={
          <>
            <Link href="/automations">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6], maxWidth: 720 }}>
        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ padding: tokens.spacing[4] }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!block.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
              />
              <span>Enabled</span>
            </label>
          </div>
        </Card>

        {meta.recipients.map((recipient) => {
          const sendKey = recipient === 'client' ? 'sendToClient' : recipient === 'sitter' ? 'sendToSitter' : 'sendToOwner';
          const templateKey = TEMPLATE_KEYS[recipient];
          return (
            <Card key={recipient} style={{ marginBottom: tokens.spacing[4] }}>
              <div style={{ padding: tokens.spacing[4] }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer', marginBottom: tokens.spacing[2] }}>
                  <input
                    type="checkbox"
                    checked={!!block[sendKey]}
                    onChange={(e) => update({ [sendKey]: e.target.checked })}
                  />
                  <span>Send to {RECIPIENT_LABEL[recipient]}</span>
                </label>
                <Textarea
                  label={`Message template (${RECIPIENT_LABEL[recipient]})`}
                  value={String(block[templateKey] ?? '')}
                  onChange={(e) => update({ [templateKey]: e.target.value })}
                  placeholder="Use {{firstName}}, {{service}}, {{datesTimes}}, etc."
                  rows={4}
                  style={{ fontFamily: 'monospace', fontSize: tokens.typography.fontSize.sm[0] }}
                />
              </div>
            </Card>
          );
        })}

        <Card style={{ marginBottom: tokens.spacing[4] }}>
          <div style={{ padding: tokens.spacing[4] }}>
            <h3 style={{ fontSize: tokens.typography.fontSize.lg[0], fontWeight: 600, marginBottom: tokens.spacing[3] }}>
              Test message
            </h3>
            <Input
              label="Phone number"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+1..."
              style={{ marginBottom: tokens.spacing[3] }}
            />
            <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2] }}>
              Sends the first non-empty template above to this number.
            </p>
            <Flex gap={2} align="center">
              <Button
                variant="secondary"
                onClick={() => {
                  const firstTemplate =
                    (block.messageTemplateClient as string)?.trim() ||
                    (block.messageTemplateSitter as string)?.trim() ||
                    (block.messageTemplateOwner as string)?.trim() ||
                    '';
                  handleTest(firstTemplate);
                }}
                disabled={testing}
              >
                {testing ? 'Sending…' : 'Send test'}
              </Button>
              {testSuccess && <span style={{ color: tokens.colors.success.DEFAULT }}>Sent.</span>}
              {testError && <span style={{ color: tokens.colors.error.DEFAULT }}>{testError}</span>}
            </Flex>
          </div>
        </Card>

        <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
          <Link href="/ops/automation-failures">View automation failures</Link> for debugging.
        </p>
      </div>
    </AppShell>
  );
}
