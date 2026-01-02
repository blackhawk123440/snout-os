/**
 * Exceptions Page - Enterprise Rebuild
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
  Input,
  Select,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  Table,
  Tabs,
  TabPanel,
  StatCard,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';
import { TableColumn } from '@/components/ui/Table';

interface Exception {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  bookingId?: string;
  booking?: {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    startAt: Date | string;
    totalPrice?: number;
    paymentStatus?: string;
    sitterId?: string;
    address?: string;
    notes?: string;
    sitter?: any;
  };
  createdAt: Date | string;
  resolvedAt?: Date | string;
  metadata?: any;
}

type SeverityTab = 'all' | 'critical' | 'high' | 'medium' | 'low';
type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'all';

// Map data severity to tab categories
const mapSeverityToTab = (severity: string): SeverityTab => {
  switch (severity) {
    case 'high':
      return 'critical';
    case 'medium':
      return 'high';
    case 'low':
      return 'medium';
    default:
      return 'all';
  }
};

// Map type to display label
const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'unpaid':
      return 'Payment';
    case 'unassigned':
      return 'Scheduling';
    case 'automation_failure':
      return 'Automation';
    case 'pricing_drift':
      return 'Pricing';
    case 'at_risk':
      return 'Client';
    default:
      return type;
  }
};

// Get all unique types from exceptions
const getUniqueTypes = (exceptions: Exception[]): string[] => {
  const types = new Set<string>();
  exceptions.forEach((e) => types.add(e.type));
  return Array.from(types).sort();
};

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SeverityTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExceptionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchExceptions();
  }, [typeFilter]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchExceptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = typeFilter === 'all' ? '/api/exceptions' : `/api/exceptions?type=${typeFilter}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch exceptions');
      }
      const data = await response.json();
      setExceptions(data.exceptions || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError('Failed to load exceptions');
      setExceptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (exception: Exception) => {
    setSelectedException(exception);
    setDetailModalOpen(true);
  };

  const handleRowSelect = (exceptionId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(exceptionId);
    } else {
      newSelected.delete(exceptionId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredExceptions.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleResolveSelected = () => {
    // TODO: Wire to API when available
    setSuccessMessage(`Resolved ${selectedIds.size} exception${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
    fetchExceptions();
  };

  // Filter exceptions
  const filteredExceptions = exceptions.filter((exception) => {
    // Severity tab filter
    if (activeTab !== 'all') {
      const exceptionTab = mapSeverityToTab(exception.severity);
      if (exceptionTab !== activeTab) return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const clientName = exception.booking
        ? `${exception.booking.firstName} ${exception.booking.lastName}`.toLowerCase()
        : '';
      const sitterName = exception.booking?.sitter
        ? `${exception.booking.sitter.firstName} ${exception.booking.sitter.lastName}`.toLowerCase()
        : '';
      const bookingId = exception.bookingId?.toLowerCase() || '';

      if (
        !exception.title.toLowerCase().includes(searchLower) &&
        !exception.description.toLowerCase().includes(searchLower) &&
        !clientName.includes(searchLower) &&
        !sitterName.includes(searchLower) &&
        !bookingId.includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter (all exceptions are "open" in current API, but we can infer resolved from resolvedAt)
    if (statusFilter !== 'all') {
      const isResolved = !!exception.resolvedAt;
      if (statusFilter === 'resolved' && !isResolved) return false;
      if (statusFilter === 'open' && isResolved) return false;
      if (statusFilter === 'in_progress') return false; // Not implemented yet
    }

    // Type filter (already applied server-side, but keep for consistency)
    if (typeFilter !== 'all' && exception.type !== typeFilter) return false;

    return true;
  });

  // Get tab counts
  const getTabCount = (tab: SeverityTab) => {
    if (tab === 'all') return exceptions.length;
    return exceptions.filter((e) => mapSeverityToTab(e.severity) === tab).length;
  };

  const tabs = [
    { id: 'all', label: 'All', badge: getTabCount('all') },
    { id: 'critical', label: 'Critical', badge: getTabCount('critical') },
    { id: 'high', label: 'High', badge: getTabCount('high') },
    { id: 'medium', label: 'Medium', badge: getTabCount('medium') },
    { id: 'low', label: 'Low', badge: getTabCount('low') },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...getUniqueTypes(exceptions).map((type) => ({
      value: type,
      label: getTypeLabel(type),
    })),
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="error">Critical</Badge>;
      case 'medium':
        return <Badge variant="warning">High</Badge>;
      case 'low':
        return <Badge variant="info">Medium</Badge>;
      default:
        return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  const getStatusBadge = (exception: Exception) => {
    if (exception.resolvedAt) {
      return <Badge variant="success">Resolved</Badge>;
    }
    // In current API, all are open, but we can add logic later
    return <Badge variant="default">Open</Badge>;
  };

  const tableColumns: TableColumn<Exception>[] = [
    {
      key: 'select',
      header: '',
      render: (exception) => (
        <input
          type="checkbox"
          checked={selectedIds.has(exception.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleRowSelect(exception.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            cursor: 'pointer',
            width: '1rem',
            height: '1rem',
          }}
        />
      ),
      width: '3rem',
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (exception) => getSeverityBadge(exception.severity),
    },
    {
      key: 'type',
      header: 'Type',
      render: (exception) => (
        <Badge variant="neutral">{getTypeLabel(exception.type)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (exception) => getStatusBadge(exception),
    },
    {
      key: 'client',
      header: 'Client',
      render: (exception) => (
        <div>
          {exception.booking
            ? `${exception.booking.firstName} ${exception.booking.lastName}`
            : '—'}
        </div>
      ),
    },
    {
      key: 'booking',
      header: 'Booking',
      render: (exception) => (
        <div>
          {exception.booking ? (
            <Link
              href={`/bookings/${exception.bookingId}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                color: tokens.colors.primary.DEFAULT,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {exception.booking.service}
            </Link>
          ) : (
            '—'
          )}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (exception) => {
        const date = new Date(exception.createdAt);
        return (
          <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        );
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (exception) => {
        // Owner info not available in current API
        return <div style={{ color: tokens.colors.text.secondary }}>—</div>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (exception) => (
        <div style={{ display: 'flex', gap: tokens.spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant="tertiary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(exception);
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell physiology="operational">
      <PageHeader
        title="Exceptions"
        description="Operational exceptions and issues that require attention"
        actions={
          <>
            <Button
              variant="primary"
              energy="active"
              onClick={handleResolveSelected}
              disabled={selectedIds.size === 0}
              leftIcon={<i className="fas fa-check" />}
            >
              Resolve Selected ({selectedIds.size})
            </Button>
            <Button
              variant="tertiary"
              onClick={fetchExceptions}
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
            depth="elevated"
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
              <Button variant="tertiary" size="sm" onClick={fetchExceptions}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Summary Cards */}
        {summary && !loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: tokens.spacing[4],
              marginBottom: tokens.spacing[6],
            }}
          >
            <StatCard
              label="Total Exceptions"
              value={summary.total || 0}
            />
            <StatCard
              label="Critical"
              value={summary.bySeverity?.high || 0}
            />
            <StatCard
              label="High"
              value={summary.bySeverity?.medium || 0}
            />
            <StatCard
              label="Medium"
              value={summary.bySeverity?.low || 0}
            />
          </div>
        )}

        {/* Category Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as SeverityTab)}>
          <TabPanel id="all">
            {/* Filters */}
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
                  placeholder="Search client, sitter, booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<i className="fas fa-search" />}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ExceptionStatus)}
                  options={statusOptions}
                />
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={typeOptions}
                />
              </div>
            </Card>

            {/* Exceptions Table */}
            {loading ? (
              <Card depth="elevated">
                <div style={{ padding: tokens.spacing[6] }}>
                  <Skeleton height={400} />
                </div>
              </Card>
            ) : filteredExceptions.length === 0 ? (
              <EmptyState
                title={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || activeTab !== 'all' ? 'No exceptions match your filters' : 'No exceptions found'}
                description={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || activeTab !== 'all' ? 'Try adjusting your filters' : 'All operations are running smoothly'}
                icon={<i className="fas fa-check-circle" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
              />
            ) : (
              <>
                {/* Select All Checkbox */}
                <Card depth="elevated" style={{ marginBottom: tokens.spacing[4] }}>
                  <div style={{ padding: tokens.spacing[4], display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredExceptions.length && filteredExceptions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{
                        cursor: 'pointer',
                        width: '1rem',
                        height: '1rem',
                      }}
                    />
                    <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      Select all ({filteredExceptions.length} exceptions)
                    </span>
                  </div>
                </Card>

                <Card depth="elevated">
                  <Table
                    columns={tableColumns}
                    data={filteredExceptions}
                    keyExtractor={(exception) => exception.id}
                    onRowClick={handleRowClick}
                  />
                </Card>
              </>
            )}
          </TabPanel>
          {tabs.filter((t) => t.id !== 'all').map((tab) => (
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
                    placeholder="Search client, sitter, booking ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<i className="fas fa-search" />}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ExceptionStatus)}
                    options={statusOptions}
                  />
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    options={typeOptions}
                  />
                </div>
              </Card>

              {loading ? (
                <Card depth="elevated">
                  <div style={{ padding: tokens.spacing[6] }}>
                    <Skeleton height={400} />
                  </div>
                </Card>
              ) : filteredExceptions.length === 0 ? (
                <EmptyState
                  title="No exceptions match your filters"
                  description="Try adjusting your filters"
                  icon={<i className="fas fa-filter" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                />
              ) : (
                <>
                  <Card depth="elevated" style={{ marginBottom: tokens.spacing[4] }}>
                    <div style={{ padding: tokens.spacing[4], display: 'flex', alignItems: 'center', gap: tokens.spacing[3] }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredExceptions.length && filteredExceptions.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{
                          cursor: 'pointer',
                          width: '1rem',
                          height: '1rem',
                        }}
                      />
                      <span style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                        Select all ({filteredExceptions.length} exceptions)
                      </span>
                    </div>
                  </Card>

                  <Card depth="elevated">
                    <Table
                      columns={tableColumns}
                      data={filteredExceptions}
                      keyExtractor={(exception) => exception.id}
                      onRowClick={handleRowClick}
                    />
                  </Card>
                </>
              )}
            </TabPanel>
          ))}
        </Tabs>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedException(null);
        }}
        title={selectedException?.title || 'Exception Details'}
        size="lg"
      >
        {selectedException && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[6] }}>
            {/* Summary Card */}
            <Card depth="elevated">
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Type
                  </div>
                  <Badge variant="neutral">{getTypeLabel(selectedException.type)}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Severity
                  </div>
                  {getSeverityBadge(selectedException.severity)}
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Status
                  </div>
                  {getStatusBadge(selectedException)}
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Description
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
                    {selectedException.description}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[1] }}>
                    Created
                  </div>
                  <div style={{ fontSize: tokens.typography.fontSize.base[0], color: tokens.colors.text.primary }}>
                    {new Date(selectedException.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Booking Link */}
            {selectedException.bookingId && (
              <Card depth="elevated">
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3] }}>
                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.semibold, color: tokens.colors.text.secondary }}>
                    Related Booking
                  </div>
                  <Link
                    href={`/bookings/${selectedException.bookingId}`}
                    style={{
                      color: tokens.colors.primary.DEFAULT,
                      textDecoration: 'none',
                      fontSize: tokens.typography.fontSize.base[0],
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {selectedException.booking
                      ? `${selectedException.booking.firstName} ${selectedException.booking.lastName} - ${selectedException.booking.service}`
                      : `View Booking ${selectedException.bookingId}`}
                  </Link>
                </div>
              </Card>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: tokens.spacing[3], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}`, justifyContent: 'flex-end' }}>
              <Button
                variant="tertiary"
                disabled
                title="Not yet wired"
              >
                Mark In Progress
              </Button>
              <Button
                variant="primary"
                disabled
                title="Not yet wired"
              >
                Resolve
              </Button>
              <Button
                variant="tertiary"
                disabled
                title="Not yet wired"
              >
                Add Note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
