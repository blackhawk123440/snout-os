/**
 * Templates Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Tabs for category filtering, table view, modal editor.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  Table,
  Tabs,
  TabPanel,
  FormRow,
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
  updatedAt: string;
  createdAt: string;
}

type CategoryTab = 'all' | 'booking' | 'reminder' | 'payment' | 'review' | 'internal';

// Map existing categories to tab categories
const mapCategoryToTab = (category: string): CategoryTab => {
  const lower = category.toLowerCase();
  if (lower.includes('booking') || lower === 'client') return 'booking';
  if (lower.includes('reminder')) return 'reminder';
  if (lower.includes('payment') || lower === 'invoice') return 'payment';
  if (lower.includes('review')) return 'review';
  if (lower === 'owner' || lower === 'report' || lower === 'sitter') return 'internal';
  return 'all';
};

// Safe template variables for preview
const TEMPLATE_VARIABLES = [
  { name: '{client_name}', description: 'Client full name' },
  { name: '{first_name}', description: 'Client first name' },
  { name: '{last_name}', description: 'Client last name' },
  { name: '{pet_names}', description: 'Pet names' },
  { name: '{service}', description: 'Service type' },
  { name: '{start_date}', description: 'Booking start date' },
  { name: '{time_window}', description: 'Booking time window' },
  { name: '{total_price}', description: 'Total booking price' },
  { name: '{address}', description: 'Service address' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'client',
    type: 'sms',
    body: '',
    subject: '',
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

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
      const response = await fetch('/api/templates');
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

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'client',
      type: 'sms',
      body: '',
      subject: '',
      isActive: true,
    });
    setEditorModalOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      type: template.type,
      body: template.body,
      subject: template.subject || '',
      isActive: template.isActive,
    });
    setEditorModalOpen(true);
  };

  const handleDuplicateTemplate = async (template: Template) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category,
      type: template.type,
      body: template.body,
      subject: template.subject || '',
      isActive: template.isActive,
    });
    setEditorModalOpen(true);
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !template.isActive,
        }),
      });
      if (response.ok) {
        setSuccessMessage(`Template ${!template.isActive ? 'enabled' : 'disabled'}`);
        fetchTemplates();
      } else {
        setError('Failed to update template');
      }
    } catch (err) {
      setError('Failed to update template');
    }
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.body.trim() || !formData.type) {
      setError('Name, body, and channel are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const templateKey = editingTemplate
        ? editingTemplate.templateKey
        : `${formData.category}.${formData.type}.${Date.now()}`;

      const payload: any = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        templateKey,
        body: formData.body,
        isActive: formData.isActive,
      };

      if (formData.type === 'email' && formData.subject) {
        payload.subject = formData.subject;
      }

      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessMessage(`Template ${editingTemplate ? 'updated' : 'created'} successfully`);
        setEditorModalOpen(false);
        fetchTemplates();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save template');
      }
    } catch (err) {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Category tab filter
    if (activeTab !== 'all') {
      const templateTab = mapCategoryToTab(template.category);
      if (templateTab !== activeTab) return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !template.name.toLowerCase().includes(searchLower) &&
        !template.body.toLowerCase().includes(searchLower) &&
        !template.templateKey.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      if (template.isActive !== isActive) return false;
    }

    // Channel filter
    if (channelFilter !== 'all') {
      if (template.type !== channelFilter) return false;
    }

    return true;
  });

  // Tab counts
  const getTabCount = (tab: CategoryTab) => {
    if (tab === 'all') return templates.length;
    return templates.filter((t) => mapCategoryToTab(t.category) === tab).length;
  };

  const categoryOptions = [
    { value: 'client', label: 'Client' },
    { value: 'sitter', label: 'Sitter' },
    { value: 'owner', label: 'Owner' },
    { value: 'report', label: 'Report' },
    { value: 'invoice', label: 'Invoice' },
  ];

  const channelOptions = [
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
  ];

  const tabs = [
    { id: 'all', label: 'All', badge: getTabCount('all') },
    { id: 'booking', label: 'Booking', badge: getTabCount('booking') },
    { id: 'reminder', label: 'Reminder', badge: getTabCount('reminder') },
    { id: 'payment', label: 'Payment', badge: getTabCount('payment') },
    { id: 'review', label: 'Review', badge: getTabCount('review') },
    { id: 'internal', label: 'Internal', badge: getTabCount('internal') },
  ];

  const tableColumns: TableColumn<Template>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (template) => (
        <div style={{ fontWeight: tokens.typography.fontWeight.medium }}>
          {template.name}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (template) => {
        const variantMap: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
          client: 'info',
          sitter: 'success',
          owner: 'warning',
          report: 'default',
          invoice: 'default',
        };
        return <Badge variant={variantMap[template.category] || 'default'}>{template.category}</Badge>;
      },
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (template) => (
        <Badge variant={template.type === 'email' ? 'info' : 'default'}>
          {template.type.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (template) => (
        <Badge variant={template.isActive ? 'success' : 'neutral'}>
          {template.isActive ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (template) => {
        const date = new Date(template.updatedAt);
        return (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (template) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => handleEditTemplate(template)}
          >
            Edit
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => handleDuplicateTemplate(template)}
          >
            Duplicate
          </Button>
          <Button
            variant={template.isActive ? 'tertiary' : 'primary'}
            size="sm"
            onClick={() => handleToggleActive(template)}
          >
            {template.isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  // SMS character count warning (160 chars is standard SMS limit, warn at 140)
  const smsCharacterCount = formData.type === 'sms' ? formData.body.length : 0;
  const smsWarning = smsCharacterCount > 140 && smsCharacterCount <= 160;

  return (
    <AppShell physiology="operational">
      <PageHeader
        title="Templates"
        description="Message templates used by automations"
        actions={
          <Button variant="primary" energy="active" onClick={handleNewTemplate} leftIcon={<i className="fas fa-plus" />}>
            New Template
          </Button>
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
            depth="critical"
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.error[50],
              borderColor: tokens.colors.error[200],
            }}
          >
            <div style={{ padding: tokens.spacing[4], color: tokens.colors.error[700], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              {error.includes('Failed to load') && (
                <Button variant="tertiary" size="sm" onClick={fetchTemplates}>
                  Retry
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Category Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as CategoryTab)}>
          <TabPanel id="all">
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={statusOptions}
                />
                <Select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Channels' },
                    ...channelOptions,
                  ]}
                />
              </div>
            </Card>

            {/* Templates Table */}
            {loading ? (
              <Card depth="elevated">
                <div style={{ padding: tokens.spacing[6] }}>
                  <Skeleton height={400} />
                </div>
              </Card>
            ) : filteredTemplates.length === 0 ? (
              <EmptyState
                title={searchTerm || statusFilter !== 'all' || channelFilter !== 'all' || activeTab !== 'all' ? 'No templates match your filters' : 'No templates yet'}
                description={searchTerm || statusFilter !== 'all' || channelFilter !== 'all' || activeTab !== 'all' ? 'Try adjusting your filters' : 'Create your first message template to get started'}
                icon={<i className="fas fa-file-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                action={
                  searchTerm || statusFilter !== 'all' || channelFilter !== 'all' || activeTab !== 'all'
                    ? undefined
                    : {
                        label: 'New Template',
                        onClick: handleNewTemplate,
                      }
                }
              />
            ) : (
              <Card depth="elevated">
                <Table
                  columns={tableColumns}
                  data={filteredTemplates}
                  keyExtractor={(template) => template.id}
                />
              </Card>
            )}
          </TabPanel>
          {tabs.filter(t => t.id !== 'all').map(tab => (
            <TabPanel key={tab.id} id={tab.id}>
              {/* Same content as "all" tab */}
              <Card depth="elevated" style={{ marginBottom: tokens.spacing[6] }}>
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={statusOptions}
                  />
                  <Select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Channels' },
                      ...channelOptions,
                    ]}
                  />
                </div>
              </Card>

              {loading ? (
                <Card depth="elevated">
                  <div style={{ padding: tokens.spacing[6] }}>
                    <Skeleton height={400} />
                  </div>
                </Card>
              ) : filteredTemplates.length === 0 ? (
                <EmptyState
                  title="No templates match your filters"
                  description="Try adjusting your filters"
                  icon={<i className="fas fa-file-alt" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                />
              ) : (
                <Card depth="elevated">
                  <Table
                    columns={tableColumns}
                    data={filteredTemplates}
                    keyExtractor={(template) => template.id}
                  />
                </Card>
              )}
            </TabPanel>
          ))}
        </Tabs>
      </div>

      {/* Template Editor Modal */}
      <Modal
        isOpen={editorModalOpen}
        onClose={() => {
          setEditorModalOpen(false);
          setEditingTemplate(null);
          setError(null);
        }}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        size="xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6], maxHeight: '80vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: tokens.spacing[6] }}>
            {/* Main Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
              <FormRow label="Name" required>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Template name"
                />
              </FormRow>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing[4] }}>
                <FormRow label="Category" required>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    options={categoryOptions}
                  />
                </FormRow>

                <FormRow label="Channel" required>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    options={channelOptions}
                  />
                </FormRow>
              </div>

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
                    placeholder="Template body with {{variables}}"
                    rows={10}
                  />
                  {formData.type === 'sms' && (
                    <div style={{ marginTop: tokens.spacing[2], display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span style={{ fontSize: tokens.typography.fontSize.sm[0] }}>Active</span>
                </label>
              </FormRow>
            </div>

            {/* Variables Preview */}
            <Card depth="elevated" style={{ backgroundColor: tokens.colors.neutral[50] }}>
              <div style={{ padding: tokens.spacing[4] }}>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[3] }}>
                  Available Variables (Examples)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <div
                      key={variable.name}
                    style={{
                      fontSize: tokens.typography.fontSize.xs[0],
                      fontFamily: tokens.typography.fontFamily.mono.join(', '),
                      padding: tokens.spacing[2],
                        backgroundColor: tokens.colors.background.primary,
                        borderRadius: tokens.borderRadius.sm,
                        border: `1px solid ${tokens.colors.border.default}`,
                      }}
                    >
                      <div style={{ fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.primary }}>
                        {variable.name}
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                        {variable.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
            <Button
              variant="tertiary"
              onClick={() => {
                setEditorModalOpen(false);
                setEditingTemplate(null);
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveTemplate}
              disabled={saving || !formData.name.trim() || !formData.body.trim()}
              isLoading={saving}
            >
              {saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
