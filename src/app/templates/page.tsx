/**
 * Templates Page - Enterprise Rebuild
 *
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Plus, ClipboardList } from 'lucide-react';

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

  const fetchTemplates = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

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
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Template
            </Button>
          </Link>
        }
      />

      <div className="p-6">
        {error && (
          <Card
            className="mb-6"
            style={{
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div className="p-4" style={{ color: tokens.colors.error[700] }}>
              {error}
              <Button
                variant="tertiary"
                size="sm"
                onClick={fetchTemplates}
                className="ml-3"
              >
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
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
            icon={<ClipboardList className="w-12 h-12 text-neutral-300" />}
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
                <Flex align="flex-start" justify="space-between" gap={4}> {/* Batch 6: UI Constitution compliance */}
                  <div className="flex-1">
                    <div className="mb-3">
                      <Flex align="center" gap={3} wrap> {/* Batch 6: UI Constitution compliance */}
                      <div className="font-bold text-lg text-text-primary">
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
                    <div className="mb-2 text-sm text-text-secondary">
                      Key: {template.templateKey}
                    </div>
                    <div className="mb-2 text-sm text-text-secondary">
                      Version: {template.version}
                    </div>
                    <div className="mt-3 p-3 bg-neutral-50 rounded-md">
                      <div
                        className="text-sm text-text-secondary whitespace-pre-wrap"
                        style={{
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        <div style={{ display: '-webkit-box' }}>
                          {template.body}
                        </div>
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
