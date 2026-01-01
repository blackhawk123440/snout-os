/**
 * Templates Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  Table,
  SectionHeader,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

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
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const deleteTemplate = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/templates/${templateToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setSuccessMessage(`Template "${templateToDelete.name}" deleted successfully`);
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
        fetchTemplates();
      } else {
        setError("Failed to delete template");
      }
    } catch (err) {
      setError("Failed to delete template");
    } finally {
      setDeleting(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.templateKey.toLowerCase().includes(searchLower) ||
      template.body.toLowerCase().includes(searchLower) ||
      template.category.toLowerCase().includes(searchLower)
    );
  });

  const getTypeBadge = (type: string) => {
    return <Badge variant={type === 'email' ? 'info' : 'default'}>{type.toUpperCase()}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const variantMap: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
      'client': 'info',
      'sitter': 'success',
      'owner': 'warning',
      'report': 'default',
      'invoice': 'default',
    };
    return <Badge variant={variantMap[category] || 'default'}>{category}</Badge>;
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
        description="Manage all message templates for automated communications"
        actions={
          <>
            <Link href="/templates/new">
              <Button variant="primary" leftIcon={<i className="fas fa-plus" />}>
                Create Template
              </Button>
            </Link>
            <Button
              variant="tertiary"
              onClick={fetchTemplates}
              disabled={loading}
              leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Success Banner */}
        {successMessage && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.success[50],
              borderColor: tokens.colors.success[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.success[700] }}>
              {successMessage}
            </div>
          </Card>
        )}

        {/* Error Banner */}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: tokens.spacing[4],
              padding: tokens.spacing[6],
            }}
          >
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<i className="fas fa-search" />}
            />
            <Select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              options={categoryOptions}
            />
            <Select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              options={typeOptions}
            />
          </div>
        </Card>

        {/* Templates List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <Skeleton height={200} />
            <Skeleton height={200} />
            <Skeleton height={200} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            title={searchTerm || filter.category || filter.type ? "No templates match your filters" : "No templates yet"}
            description={searchTerm || filter.category || filter.type ? "Try adjusting your search or filters" : "Create your first message template to get started"}
            icon={<i className="fas fa-file-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={
              searchTerm || filter.category || filter.type
                ? undefined
                : {
                    label: "Create Template",
                    onClick: () => router.push("/templates/new"),
                  }
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3], flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.primary }}>
                        {template.name}
                      </div>
                      {getTypeBadge(template.type)}
                      {getCategoryBadge(template.category)}
                      {template.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginBottom: tokens.spacing[3] }}>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Key:</span> {template.templateKey}
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        <span style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Version:</span> {template.version}
                      </div>
                    </div>

                    <Card style={{ backgroundColor: tokens.colors.neutral[50], padding: tokens.spacing[3] }}>
                      <div
                        style={{
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.primary,
                          whiteSpace: 'pre-wrap',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.5',
                        }}
                      >
                        {template.body}
                      </div>
                    </Card>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                    <Link href={`/templates/${template.id}`}>
                      <Button variant="primary" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteClick(template)}
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        title="Delete Template"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
          <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
            Are you sure you want to delete the template <strong>{templateToDelete?.name}</strong>?
          </div>
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
            <Button
              variant="danger"
              onClick={deleteTemplate}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              variant="tertiary"
              onClick={() => {
                setDeleteModalOpen(false);
                setTemplateToDelete(null);
              }}
              disabled={deleting}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

