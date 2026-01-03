/**
 * Custom Fields Page - Enterprise Rebuild
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
  Select,
  Badge,
  EmptyState,
  Skeleton,
  FormRow,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface CustomField {
  id: string;
  label: string;
  type: string;
  entityType: string;
  required: boolean;
  visibleToOwner: boolean;
  visibleToSitter: boolean;
  visibleToClient: boolean;
  editableBySitter: boolean;
  editableByClient: boolean;
  showInTemplates: boolean;
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ entityType: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFields();
  }, [filter]);

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.entityType) params.append("entityType", filter.entityType);

      const response = await fetch(`/api/custom-fields?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch custom fields');
      }
      const data = await response.json();
      setFields(data.fields || []);
    } catch (err) {
      setError('Failed to load custom fields');
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom field?")) return;
    
    try {
      const response = await fetch(`/api/custom-fields/${id}`, {
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

  const entityTypeOptions = [
    { value: "", label: "All Entity Types" },
    { value: "client", label: "Client" },
    { value: "pet", label: "Pet" },
    { value: "sitter", label: "Sitter" },
    { value: "booking", label: "Booking" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Custom Fields"
        description="Manage custom fields for clients, pets, sitters, and bookings"
        actions={
          <Link href="/settings/custom-fields/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Field
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

        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <FormRow label="Filter by Entity Type">
            <Select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              options={entityTypeOptions}
            />
          </FormRow>
        </Card>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={150} />
            <Skeleton height={150} />
            <Skeleton height={150} />
          </div>
        ) : fields.length === 0 ? (
          <EmptyState
            title="No Custom Fields"
            description="Create your first custom field"
            icon={<i className="fas fa-tag" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Create Field",
              onClick: () => window.location.href = "/settings/custom-fields/new",
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
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.lg[0],
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {field.label}
                      </div>
                      <Badge variant="info">{field.type}</Badge>
                      <Badge variant="neutral">{field.entityType}</Badge>
                      {field.required && (
                        <Badge variant="error">Required</Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                      {field.visibleToOwner && (
                        <Badge variant="neutral">Owner</Badge>
                      )}
                      {field.visibleToSitter && (
                        <Badge variant="success">Sitter</Badge>
                      )}
                      {field.visibleToClient && (
                        <Badge variant="info">Client</Badge>
                      )}
                      {field.editableBySitter && (
                        <Badge variant="warning">Sitter Editable</Badge>
                      )}
                      {field.editableByClient && (
                        <Badge variant="warning">Client Editable</Badge>
                      )}
                      {field.showInTemplates && (
                        <Badge variant="neutral">In Templates</Badge>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                    <Link href={`/settings/custom-fields/${field.id}`}>
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
