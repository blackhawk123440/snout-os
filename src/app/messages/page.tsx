/**
 * Messages Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 * 
 * Features:
 * - Conversations tab: View and send messages with masked numbers
 * - Templates tab: Manage message templates
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  FormRow,
  Tabs,
  TabPanel,
  MobileFilterBar,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import ConversationList from '@/components/messaging/ConversationList';
import ConversationView from '@/components/messaging/ConversationView';

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  fields: string[];
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  participantName: string;
  participantPhone: string;
  participantType: 'client' | 'sitter';
  bookingId: string | null;
  bookingTitle: string | null;
  lastMessage: string;
  lastMessageAt: Date | string;
  unreadCount: number;
  messageCount: number;
}

export default function MessagesPage() {
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<'conversations' | 'templates'>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "booking_confirmation",
    content: "",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/message-templates");
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError('Failed to load message templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = editingTemplate ? `/api/message-templates/${editingTemplate.id}` : "/api/message-templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        resetForm();
        fetchTemplates();
      } else {
        setError("Failed to save template");
      }
    } catch {
      setError("Failed to save template");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "booking_confirmation", content: "" });
    setShowAddForm(false);
    setEditingTemplate(null);
    setPreviewData({});
    setError(null);
  };

  const startEdit = (template: MessageTemplate) => {
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
    });
    setEditingTemplate(template);
    setShowAddForm(true);
  };

  const extractFields = (content: string): string[] => {
    const fieldRegex = /\{\{(\w+)\}\}/g;
    const fields: string[] = [];
    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      if (!fields.includes(match[1])) {
        fields.push(match[1]);
      }
    }
    return fields;
  };

  const templateTypes = [
    { value: "booking_confirmation", label: "Booking Confirmation" },
    { value: "visit_started", label: "Visit Started" },
    { value: "visit_completed", label: "Visit Completed" },
    { value: "payment_reminder", label: "Payment Reminder" },
    { value: "sitter_assignment", label: "Sitter Assignment" },
    { value: "owner_notification", label: "Owner Notification" },
  ];

  const getTypeBadge = (type: string) => {
    const typeConfig = templateTypes.find(t => t.value === type);
    if (!typeConfig) return <Badge>{type}</Badge>;
    
    const variantMap: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
      'booking_confirmation': 'info',
      'visit_started': 'success',
      'visit_completed': 'success',
      'payment_reminder': 'warning',
      'sitter_assignment': 'info',
      'owner_notification': 'default',
    };
    
    return <Badge variant={variantMap[type] || 'default'}>{typeConfig.label}</Badge>;
  };

  return (
    <AppShell>
      <PageHeader
        title="Messages"
        description={activeTab === 'conversations' ? "View and manage conversations" : "Manage automated message templates"}
        actions={
          activeTab === 'templates' ? (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                leftIcon={<i className="fas fa-plus" />}
              >
                New Template
              </Button>
              <Button
                variant="tertiary"
                onClick={fetchTemplates}
                disabled={loading}
                leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
              >
                Refresh
              </Button>
            </>
          ) : null
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {isMobile ? (
          <>
            <MobileFilterBar
              activeFilter={activeTab}
              onFilterChange={(filterId) => {
                setActiveTab(filterId as 'conversations' | 'templates');
                setSelectedConversation(null);
              }}
              sticky
              options={[
                { id: 'conversations', label: 'Conversations' },
                { id: 'templates', label: 'Templates' },
              ]}
            />
            {activeTab === 'conversations' ? (
              selectedConversation ? (
                <ConversationView
                  participantPhone={selectedConversation.participantPhone}
                  participantName={selectedConversation.participantName}
                  bookingId={selectedConversation.bookingId}
                  role="owner"
                  onBack={() => setSelectedConversation(null)}
                />
              ) : (
                <ConversationList
                  role="owner"
                  onSelectConversation={setSelectedConversation}
                />
              )
            ) : (
              <>
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

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                  </div>
                ) : templates.length === 0 ? (
                  <EmptyState
                    title="No message templates"
                    description="Create your first message template to get started"
                    icon={<i className="fas fa-envelope" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                    action={{
                      label: "Create Template",
                      onClick: () => {
                        resetForm();
                        setShowAddForm(true);
                      },
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {templates.map((template) => {
                      const fields = extractFields(template.content);
                      return (
                        <Card key={template.id}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.primary }}>
                                  {template.name}
                                </div>
                                {getTypeBadge(template.type)}
                              </div>
                              
                              <div style={{ marginBottom: tokens.spacing[3] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                  Template Content:
                                </div>
                                <Card style={{ backgroundColor: tokens.colors.neutral[50], padding: tokens.spacing[3] }}>
                                  <div style={{ whiteSpace: 'pre-wrap', fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                    {template.content}
                                  </div>
                                </Card>
                              </div>
                              
                              {fields.length > 0 && (
                                <div>
                                  <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                    Available Fields:
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                                    {fields.map((field) => (
                                      <Badge key={field} variant="info">
                                        {`{{${field}}}`}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                              <Button
                                variant="tertiary"
                                size="sm"
                                onClick={() => startEdit(template)}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <Tabs
            tabs={[
              { id: 'conversations', label: 'Conversations' },
              { id: 'templates', label: 'Templates' },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => {
              setActiveTab(id as 'conversations' | 'templates');
              setSelectedConversation(null);
            }}
          >
            <TabPanel id="conversations">
              {selectedConversation ? (
                <ConversationView
                  participantPhone={selectedConversation.participantPhone}
                  participantName={selectedConversation.participantName}
                  bookingId={selectedConversation.bookingId}
                  role="owner"
                  onBack={() => setSelectedConversation(null)}
                />
              ) : (
                <ConversationList
                  role="owner"
                  onSelectConversation={setSelectedConversation}
                />
              )}
            </TabPanel>
            
            <TabPanel id="templates">
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

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  <Skeleton height={200} />
                  <Skeleton height={200} />
                  <Skeleton height={200} />
                </div>
              ) : templates.length === 0 ? (
                <EmptyState
                  title="No message templates"
                  description="Create your first message template to get started"
                  icon={<i className="fas fa-envelope" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  action={{
                    label: "Create Template",
                    onClick: () => {
                      resetForm();
                      setShowAddForm(true);
                    },
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  {templates.map((template) => {
                    const fields = extractFields(template.content);
                    return (
                      <Card key={template.id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[3] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.primary }}>
                                {template.name}
                              </div>
                              {getTypeBadge(template.type)}
                            </div>
                            
                            <div style={{ marginBottom: tokens.spacing[3] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                Template Content:
                              </div>
                              <Card style={{ backgroundColor: tokens.colors.neutral[50], padding: tokens.spacing[3] }}>
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                  {template.content}
                                </div>
                              </Card>
                            </div>
                            
                            {fields.length > 0 && (
                              <div>
                                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                  Available Fields:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                                  {fields.map((field) => (
                                    <Badge key={field} variant="info">
                                      {`{{${field}}}`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => startEdit(template)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabPanel>
          </Tabs>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      <Modal
        isOpen={showAddForm}
        onClose={resetForm}
        title={editingTemplate ? "Edit Template" : "Add Template"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6] }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacing[4] }}>
              <FormRow
                label="Template Name"
                required
                error={error && formData.name === "" ? "Template name is required" : undefined}
              >
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                  required
                />
              </FormRow>
              
              <FormRow
                label="Template Type"
                required
              >
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  options={templateTypes}
                  required
                />
              </FormRow>
            </div>
            
            <FormRow
              label="Message Content"
              required
              helperText="Use {{fieldName}} for dynamic fields. Available fields: {{clientName}}, {{service}}, {{date}}, {{time}}, {{sitterName}}, {{totalPrice}}, etc."
              error={error && formData.content === "" ? "Message content is required" : undefined}
            >
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                placeholder="Enter your message template content here..."
                required
              />
            </FormRow>
            
            {/* Field Preview */}
            {formData.content && extractFields(formData.content).length > 0 && (
              <Card style={{ backgroundColor: tokens.colors.neutral[50] }}>
                <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  Detected Fields:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                  {extractFields(formData.content).map((field) => (
                    <Badge key={field} variant="info">
                      {`{{${field}}}`}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
            
            {error && (
              <Card style={{ backgroundColor: tokens.colors.error[50], borderColor: tokens.colors.error[200] }}>
                <div style={{ padding: tokens.spacing[2], color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0] }}>
                  {error}
                </div>
              </Card>
            )}
            
            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
              <Button
                type="submit"
                variant="primary"
                style={{ flex: 1 }}
              >
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
              <Button
                type="button"
                variant="tertiary"
                onClick={resetForm}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

