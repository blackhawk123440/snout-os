/**
 * Form Builder Page - Enterprise Rebuild
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
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  includeInReport: boolean;
}

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/form-fields");
      if (!response.ok) {
        throw new Error('Failed to fetch form fields');
      }
      const data = await response.json();
      setFields((data.fields || []).sort((a: FormField, b: FormField) => a.order - b.order));
    } catch (err) {
      setError('Failed to load form fields');
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    
    try {
      const response = await fetch(`/api/form-fields/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchFields();
      } else {
        setError('Failed to delete field');
      }
    } catch (err) {
      setError('Failed to delete field');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Form Builder"
        description="Customize your booking form fields"
        actions={
          <Link href="/settings/form-builder/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Add Field
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
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        ) : fields.length === 0 ? (
          <EmptyState
            title="No Form Fields"
            description="Create your first form field"
            icon={<i className="fas fa-edit" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Add Field",
              onClick: () => window.location.href = "/settings/form-builder/new",
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {fields.map((field) => (
              <Card key={field.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], marginBottom: tokens.spacing[2], flexWrap: 'wrap' }}>
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          fontWeight: tokens.typography.fontWeight.semibold,
                          color: tokens.colors.text.tertiary,
                        }}
                      >
                        #{field.order}
                      </div>
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.lg[0],
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {field.label}
                      </div>
                      <Badge variant="info">{field.type}</Badge>
                      {field.required && (
                        <Badge variant="error">Required</Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                      {field.visibleToSitter && (
                        <Badge variant="success">Visible to Sitter</Badge>
                      )}
                      {field.visibleToClient && (
                        <Badge variant="info">Visible to Client</Badge>
                      )}
                      {field.includeInReport && (
                        <Badge variant="neutral">In Report</Badge>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                    <Link href={`/settings/form-builder/${field.id}`}>
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteField(field.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
