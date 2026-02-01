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

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Flex,
  Grid,
  GridCol,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { useMobile } from '@/lib/use-mobile';
import ConversationList from '@/components/messaging/ConversationList';
import ConversationView from '@/components/messaging/ConversationView';
import InboxView from '@/components/messaging/InboxView';
import { DiagnosticsPanel } from '@/components/messaging/DiagnosticsPanel';
import { isMessagingEnabled } from '@/lib/flags';
import { useAuth } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

function MessagesPageContent() {
  const isMobile = useMobile();
  const searchParams = useSearchParams();
  
  // Use ONLY client-side flag (NEXT_PUBLIC_ENABLE_MESSAGING_V1)
  // Do NOT use server-side env vars for client gating
  const messagingV1Enabled = isMessagingEnabled();
  
  // Get role from auth (client-side)
  const { user } = useAuth();
  const role = (user?.role === 'sitter' ? 'sitter' : 'owner') as 'owner' | 'sitter';
  const sitterMessagesEnabled = false; // Phase 4.2: Not implemented yet

  const showOwnerInbox = messagingV1Enabled && role === 'owner';
  const showConversations = messagingV1Enabled && (role === 'owner' || (role === 'sitter' && sitterMessagesEnabled));

  // Get sitterId from URL params for deep-linking
  const sitterIdParam = searchParams.get('sitterId');

  // Update active tab when messaging status is determined
  useEffect(() => {
    if (showConversations) {
      // Conversations available - switch to conversations tab
      setActiveTab('conversations');
    } else if (!messagingV1Enabled) {
      // Messaging disabled - stay on conversations tab to show disabled message
      setActiveTab('conversations');
    }
  }, [showConversations, messagingV1Enabled, role]);

  // Default to conversations tab (will show empty state if messaging disabled)
  const [activeTab, setActiveTab] = useState<'conversations' | 'templates' | 'inbox'>('conversations');
  
  // Update active tab when messaging status is determined
  useEffect(() => {
    console.log('[MessagesPage] Messaging status:', { messagingV1Enabled, showConversations, role });
    if (showConversations) {
      // Conversations available - switch to conversations tab
      setActiveTab('conversations');
    } else if (!messagingV1Enabled) {
      // Messaging disabled - stay on conversations tab to show disabled message
      setActiveTab('conversations');
    }
    // If messaging enabled but conversations not available (e.g., sitter without flag), stay on current tab
  }, [showConversations, messagingV1Enabled, role]);
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

  // Show flag status indicator (owner-only)
  const isOwner = role === 'owner';
  const flagStatusBadge = isOwner ? (
    <Badge 
      variant={messagingV1Enabled ? "success" : "error"}
      style={{ fontSize: tokens.typography.fontSize.xs[0], padding: `${tokens.spacing[1]} ${tokens.spacing[2]}` }}
    >
      Messaging: {messagingV1Enabled ? 'ON' : 'OFF'}
    </Badge>
  ) : null;

  return (
    <AppShell>
      <PageHeader
        title="Messages"
        description={activeTab === 'conversations' ? "View and manage conversations" : "Manage automated message templates"}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
            {flagStatusBadge}
            {activeTab === 'templates' ? (
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
          ) : null}
          </div>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {isMobile ? (
          <>
            <MobileFilterBar
              activeFilter={activeTab}
              onFilterChange={(filterId) => {
                setActiveTab(filterId as 'conversations' | 'templates' | 'inbox');
                setSelectedConversation(null);
              }}
              sticky
              options={[
                // Always show Conversations tab
                { id: 'conversations', label: 'Conversations' },
                ...(showOwnerInbox ? [{ id: 'inbox', label: 'Owner Inbox' }] : []),
                { id: 'templates', label: 'Templates' },
              ]}
            />
            {activeTab === 'conversations' ? (
              !messagingV1Enabled ? (
                <div style={{ position: 'relative' }}>
                  <EmptyState
                    title="Messaging is disabled"
                    description="Enable NEXT_PUBLIC_ENABLE_MESSAGING_V1=true to use messaging features."
                    icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                  {/* Show diagnostics even when disabled */}
                  {isOwner && (
                    <DiagnosticsPanel
                      threadsCount={0}
                      threadsLoading={false}
                      threadsError={null}
                      lastFetchUrl={undefined}
                      lastFetchStatus={undefined}
                      lastFetchResponseSize={undefined}
                    />
                  )}
                </div>
              ) : (
                <InboxView role={role} initialThreadId={selectedConversation?.id} inbox="all" />
              )
            ) : activeTab === 'inbox' ? (
              !messagingV1Enabled ? (
                <EmptyState
                  title="Messaging is disabled"
                  description="Enable ENABLE_MESSAGING_V1 to use messaging features."
                  icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                />
              ) : (
                <InboxView role="owner" initialThreadId={selectedConversation?.id} sitterId={sitterIdParam || undefined} inbox="owner" />
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
                  <Flex direction="column" gap={4}> {/* Batch 4: UI Constitution compliance */}
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                    <Skeleton height={200} />
                  </Flex>
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
                  <Flex direction="column" gap={4}> {/* Batch 4: UI Constitution compliance */}
                    {templates.map((template) => {
                      const fields = extractFields(template.content);
                      return (
                        <Card key={template.id}>
                          <Flex align="flex-start" justify="space-between" gap={4}>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: tokens.spacing[3] }}>
                                <Flex align="center" gap={3}>
                                  <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.primary }}>
                                    {template.name}
                                  </div>
                                  {getTypeBadge(template.type)}
                                </Flex>
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
                                  <Flex wrap gap={2}>
                                    {fields.map((field) => (
                                      <Badge key={field} variant="info">
                                        {`{{${field}}}`}
                                      </Badge>
                                    ))}
                                  </Flex>
                                </div>
                              )}
                            </div>
                            
                            <Flex align="center" gap={2}>
                              <Button
                                variant="tertiary"
                                size="sm"
                                onClick={() => startEdit(template)}
                              >
                                Edit
                              </Button>
                            </Flex>
                          </Flex>
                        </Card>
                      );
                    })}
                  </Flex>
                )}
              </>
            )}
          </>
        ) : (
          <Tabs
            tabs={[
              // Always show Conversations tab (will show disabled message if flag off)
              { id: 'conversations' as const, label: 'Conversations' },
              ...(showOwnerInbox ? [{ id: 'inbox' as const, label: 'Owner Inbox' }] : []),
              { id: 'templates' as const, label: 'Templates' },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => {
              console.log('[MessagesPage] Tab changed to:', id);
              setActiveTab(id as 'conversations' | 'templates' | 'inbox');
              setSelectedConversation(null);
            }}
          >
            <TabPanel id="conversations">
              {!messagingV1Enabled ? (
                <div style={{ position: 'relative' }}>
                  <EmptyState
                    title="Messaging is disabled"
                    description="Enable NEXT_PUBLIC_ENABLE_MESSAGING_V1=true to use messaging features."
                    icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                  {/* Show diagnostics even when disabled */}
                  {isOwner && (
                    <DiagnosticsPanel
                      threadsCount={0}
                      threadsLoading={false}
                      threadsError={null}
                      lastFetchUrl={undefined}
                      lastFetchStatus={undefined}
                      lastFetchResponseSize={undefined}
                    />
                  )}
                </div>
              ) : (
                <InboxView role={role} initialThreadId={selectedConversation?.id} inbox="all" />
              )}
            </TabPanel>
            {showOwnerInbox && (
              <TabPanel id="inbox">
                {!messagingV1Enabled ? (
                  <EmptyState
                    title="Messaging is disabled"
                    description="Enable ENABLE_MESSAGING_V1 to use messaging features."
                    icon={<i className="fas fa-comments" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
              ) : (
                <InboxView role="owner" initialThreadId={selectedConversation?.id} sitterId={sitterIdParam || undefined} inbox="owner" />
              )}
              </TabPanel>
            )}
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
                <Flex direction="column" gap={4}> {/* Batch 4: UI Constitution compliance */}
                  <Skeleton height={200} />
                  <Skeleton height={200} />
                  <Skeleton height={200} />
                </Flex>
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
                <Flex direction="column" gap={4}> {/* Batch 4: UI Constitution compliance */}
                  {templates.map((template) => {
                    const fields = extractFields(template.content);
                    return (
                      <Card key={template.id}>
                        <Flex align="flex-start" justify="space-between" gap={4}>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: tokens.spacing[3] }}>
                              <Flex align="center" gap={3}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.text.primary }}>
                                  {template.name}
                                </div>
                                {getTypeBadge(template.type)}
                              </Flex>
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
                                <Flex wrap gap={2}>
                                  {fields.map((field) => (
                                    <Badge key={field} variant="info">
                                      {`{{${field}}}`}
                                    </Badge>
                                  ))}
                                </Flex>
                              </div>
                            )}
                          </div>
                          
                          <Flex align="center" gap={2}>
                            <Button
                              variant="tertiary"
                              size="sm"
                              onClick={() => startEdit(template)}
                            >
                              Edit
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    );
                  })}
                </Flex>
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
          <Flex direction="column" gap={6}> {/* Batch 4: UI Constitution compliance */}
            <div>
              <Grid gap={4}> {/* Batch 4: UI Constitution compliance */}
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
              </Grid>
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
                <Flex wrap gap={2}>
                  {extractFields(formData.content).map((field) => (
                    <Badge key={field} variant="info">
                      {`{{${field}}}`}
                    </Badge>
                  ))}
                </Flex>
              </Card>
            )}
            
            {error && (
              <Card style={{ backgroundColor: tokens.colors.error[50], borderColor: tokens.colors.error[200] }}>
                <div style={{ padding: tokens.spacing[2], color: tokens.colors.error[700], fontSize: tokens.typography.fontSize.sm[0] }}>
                  {error}
                </div>
              </Card>
            )}
            
            <div style={{ paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
              <Flex gap={3}>
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
              </Flex>
            </div>
          </Flex>
        </form>
      </Modal>
    </AppShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Messages" />
        <div style={{ padding: tokens.spacing[4] }}>
          <Skeleton height={400} />
        </div>
      </AppShell>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}

