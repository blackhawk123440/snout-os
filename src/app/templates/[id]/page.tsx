/**
 * Edit Template Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Skeleton,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      const data = await response.json();
      if (data.template) {
        const tpl = data.template;
        setName(tpl.name || "");
        setType(tpl.type || "");
        setCategory(tpl.category || "");
        setTemplateKey(tpl.templateKey || "");
        setSubject(tpl.subject || "");
        setBody(tpl.body || "");
        setIsActive(tpl.isActive !== false);
      }
    } catch (err) {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !type || !category || !templateKey || !body) {
      alert("Name, type, category, templateKey, and body are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          category,
          templateKey,
          subject,
          body,
          isActive,
        }),
      });

      if (response.ok) {
        router.push("/templates");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update template");
      }
    } catch (err) {
      setError("Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { value: "", label: "Select type" },
    { value: "sms", label: "SMS" },
    { value: "email", label: "Email" },
  ];

  const categoryOptions = [
    { value: "", label: "Select category" },
    { value: "client", label: "Client" },
    { value: "sitter", label: "Sitter" },
    { value: "owner", label: "Owner" },
    { value: "report", label: "Report" },
    { value: "invoice", label: "Invoice" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Edit Template"
        description="Update your message template"
        actions={
          <Link href="/templates">
            <Button variant="tertiary" leftIcon={<i className="fas fa-arrow-left" />}>
              Back to Templates
            </Button>
          </Link>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={400} />
          </div>
        ) : (
          <>
            <Card style={{ marginBottom: tokens.spacing[6] }}>
              <div
                style={{
                  fontWeight: tokens.typography.fontWeight.bold,
                  fontSize: tokens.typography.fontSize.lg[0],
                  color: tokens.colors.text.primary,
                  marginBottom: tokens.spacing[4],
                }}
              >
                Template Information
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                <FormRow label="Name *">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </FormRow>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
                  <FormRow label="Type *">
                    <Select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      options={typeOptions}
                    />
                  </FormRow>

                  <FormRow label="Category *">
                    <Select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      options={categoryOptions}
                    />
                  </FormRow>
                </div>

                <FormRow label="Template Key *">
                  <Input
                    type="text"
                    value={templateKey}
                    onChange={(e) => setTemplateKey(e.target.value)}
                    placeholder="e.g., booking.confirmation"
                    required
                  />
                </FormRow>

                {type === "email" && (
                  <FormRow label="Subject">
                    <Input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </FormRow>
                )}

                <FormRow label="Body *">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    placeholder="Message body with {{variables}}"
                    required
                  />
                </FormRow>

                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ accentColor: tokens.colors.primary.DEFAULT }}
                  />
                  <label htmlFor="isActive" style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary, cursor: 'pointer' }}>
                    Active
                  </label>
                </div>
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: tokens.spacing[4] }}>
              <Button
                variant="tertiary"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !name || !type || !category || !templateKey || !body}
                leftIcon={saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
