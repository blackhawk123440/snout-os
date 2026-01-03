/**
 * Service Settings Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect } from 'react';
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

interface ServiceConfig {
  id: string;
  serviceName: string;
  basePrice: number;
  defaultVisitLength: number;
  category: string;
  minBookingNotice: number;
  gpsCheckInRequired: boolean;
  photosRequired: boolean;
  weekendMultiplier: number;
  config: string;
}

export default function ServiceSettingsPage() {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/service-configs");
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      const data = await response.json();
      setServices(data.configs || []);
    } catch (err) {
      setError('Failed to load services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const response = await fetch(`/api/service-configs/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchServices();
      } else {
        setError('Failed to delete service');
      }
    } catch (err) {
      setError('Failed to delete service');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Service Settings"
        description="Configure all service types and rules"
        actions={
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<i className="fas fa-plus" />}
          >
            Add Service
          </Button>
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
        ) : services.length === 0 ? (
          <EmptyState
            title="No Services Configured"
            description="Create your first service configuration"
            icon={<i className="fas fa-cog" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
            action={{
              label: "Add Service",
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            {services.map((service) => {
              const config = service.config ? JSON.parse(service.config) : {};
              return (
                <Card key={service.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing[4] }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: tokens.typography.fontWeight.bold,
                          fontSize: tokens.typography.fontSize.lg[0],
                          color: tokens.colors.text.primary,
                          marginBottom: tokens.spacing[2],
                        }}
                      >
                        {service.serviceName}
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: tokens.spacing[4],
                          fontSize: tokens.typography.fontSize.sm[0],
                          color: tokens.colors.text.secondary,
                          marginBottom: tokens.spacing[3],
                        }}
                      >
                        <div>
                          <strong>Base Price:</strong> ${service.basePrice}
                        </div>
                        <div>
                          <strong>Default Length:</strong> {service.defaultVisitLength} min
                        </div>
                        <div>
                          <strong>Category:</strong> {service.category}
                        </div>
                        <div>
                          <strong>Weekend Multiplier:</strong> {service.weekendMultiplier}x
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[2] }}>
                        {service.gpsCheckInRequired && (
                          <Badge variant="info">GPS Required</Badge>
                        )}
                        {service.photosRequired && (
                          <Badge variant="success">Photos Required</Badge>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: tokens.spacing[2], alignItems: 'center' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingService(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteService(service.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
