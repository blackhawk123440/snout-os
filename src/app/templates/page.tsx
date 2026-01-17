/**
 * Templates Page - Enterprise Rebuild
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
  Flex,
  Grid,
  GridCol,
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
  version: number;
  isActive: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", type: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append("category", filter.category);
      if (filter.type) params.append("type", filter.type);

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchTemplates();
      } else {
        setError('Failed to delete template');
      }
    } catch (err) {
      setError('Failed to delete template');
    }
  };

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "client", label: "Client" },
    { value: "sitter", label: "Sitter" },
    { value: "owner", label: "Owner" },
    { value: "report", label: "Report" },
    { value: "invoice", label: "Invoice" },
  ];

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "sms", label: "SMS" },
    { value: "email", label: "Email" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Message Templates"
        description="Manage all message templates"
        actions={
          <Link href="/templates/new">
            <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
              Create Template
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
              <Button
                variant="tertiary"
                size="sm"
                onClick={fetchTemplates}
                style={{ marginLeft: tokens.spacing[3] }}
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card style={{ marginBottom: tokens.spacing[6] }}>
          <Flex gap={4} align="center" wrap> {/* Batch 6: UI Constitution compliance */}
            <Select
              label="Category"
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              options={categoryOptions}
              style={{ minWidth: '200px' }}
            />
            <Select
              label="Type"
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              options={typeOptions}
              style={{ minWidth: '150px' }}
            />
          </Flex>
        </Card>

        {loading ? (
          <Flex direction="column" gap={4}> {/* Batch 6: UI Constitution compliance */}
            <Skeleton height={200} />
            <Skeleton height={200} />
            <Skeleton height={200} />
          </Flex>
        ) : templates.length === 0 ? (
          <EmptyState
            title="No Templates Yet"
            description="Create your first message template"
            icon={<i className="fas fa-file-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Create Template",
              onClick: () => {
                window.location.href = '/templates/new';
              },
            }}
          />
        ) : (
          <Flex direction="column" gap={4}> {/* Batch 6: UI Constitution compliance */}
            {templates.map((template) => (
              <Card key={template.id}>
                <Flex align="flex-start" justify="space-between" gap={4}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: tokens.spacing[3] }}>
                      <Flex align="center" gap={3} wrap>
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.lg[0],
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {template.name}
                      </div>
                      <Badge variant={template.type === 'email' ? 'info' : 'default'}>
                        {template.type.toUpperCase()}
                      </Badge>
                      <Badge variant="neutral">{template.category}</Badge>
                      {template.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                      </Flex>
                    </div>
                    <div style={{ marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      Key: {template.templateKey}
                    </div>
                    <div style={{ marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      Version: {template.version}
                    </div>
                    <div
                      style={{
                        marginTop: tokens.spacing[3],
                        padding: tokens.spacing[3],
                        backgroundColor: tokens.colors.neutral[50],
                        borderRadius: tokens.borderRadius.md,
                      }}
                    >
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          whiteSpace: 'pre-wrap',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          maxHeight: '4.5rem',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {template.body}
                      </div>
                    </div>
                  </div>
                  <Flex gap={2} align="center"> {/* Batch 6: UI Constitution compliance */}
                    <Link href={`/templates/${template.id}`}>
                      <Button variant="primary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
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
    </AppShell>
  );
}
