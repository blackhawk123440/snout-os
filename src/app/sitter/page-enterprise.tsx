/**
 * Sitter Dashboard Page - Enterprise Rebuild
 * 
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and tokens.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  PageHeader,
  Card,
  StatCard,
  Tabs,
  TabPanel,
  Button,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  SectionHeader,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';
import { tokens } from '@/lib/design-tokens';

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  pets: Array<{ species: string; name?: string; notes?: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  timeSlots?: Array<{
    id: string;
    startAt: Date | string;
    endAt: Date | string;
    duration: number;
  }>;
  notes?: string | null;
}

type TabType = "today" | "upcoming" | "completed" | "earnings" | "settings" | "tier";

function SitterPageContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sitterId, setSitterId] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(80.0);
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sitterTier, setSitterTier] = useState<any>(null);
  const [tierProgress, setTierProgress] = useState<any>(null);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    // Get sitter ID from URL params or localStorage
    const id = searchParams?.get('id') || (typeof window !== 'undefined' ? localStorage.getItem('sitterId') : null) || '';
    setSitterId(id);
    
    if (id) {
      fetchSitterBookings(id);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchSitterBookings = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/sitter/${id}/bookings`);
      const data = await response.json();
      setBookings(data.bookings || []);
      if (data.sitter?.commissionPercentage) {
        setCommissionPercentage(data.sitter.commissionPercentage);
      }
      
      // Fetch sitter tier info
      const sitterResponse = await fetch(`/api/sitters/${id}`);
      const sitterData = await sitterResponse.json();
      if (sitterData.sitter?.currentTier) {
        setSitterTier(sitterData.sitter.currentTier);
      }

      // Fetch tier progress data from dashboard API
      try {
        const dashboardResponse = await fetch(`/api/sitters/${id}/dashboard`);
        const dashboardData = await dashboardResponse.json();
        if (dashboardData.tier || dashboardData.performance || dashboardData.nextTier) {
          setTierProgress({
            tier: dashboardData.tier,
            performance: dashboardData.performance,
            nextTier: dashboardData.nextTier,
            improvementAreas: dashboardData.improvementAreas || [],
          });
        }
      } catch (error) {
        console.error("Failed to fetch tier progress:", error);
      }

      // Fetch earnings data
      try {
        const earningsResponse = await fetch(`/api/sitter/${id}/earnings`);
        const earningsDataResponse = await earningsResponse.json();
        if (earningsDataResponse.summary) {
          setEarningsData(earningsDataResponse);
        }
      } catch (error) {
        console.error("Failed to fetch earnings data:", error);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateSitterEarnings = (totalPrice: number): number => {
    return (totalPrice * commissionPercentage) / 100;
  };

  const formatPetsByQuantity = (pets: Array<{ species: string }>): string => {
    const counts: Record<string, number> = {};
    pets.forEach(pet => {
      counts[pet.species] = (counts[pet.species] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">{status}</Badge>;
      case "confirmed":
        return <Badge variant="info">{status}</Badge>;
      case "completed":
        return <Badge variant="success">{status}</Badge>;
      case "cancelled":
        return <Badge variant="error">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayBookings = bookings
    .filter(booking => {
      const bookingDate = new Date(booking.startAt);
      bookingDate.setHours(0, 0, 0, 0);
      return bookingDate.getTime() === today.getTime() && 
             booking.status !== "cancelled" &&
             (booking.status === "confirmed" || booking.status === "pending");
    })
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.startAt) > new Date() && booking.status !== "cancelled"
  );

  const completedBookings = bookings.filter(booking => 
    booking.status === "completed"
  );

  const isOverdue = (booking: Booking) => {
    return new Date(booking.startAt) < new Date() && booking.status === "confirmed";
  };

  const checkIn = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      alert("Checked in successfully!");
      fetchSitterBookings(sitterId);
      setShowDetailModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Failed to check in:", error);
      alert("Failed to check in");
    }
  };

  const calculateTravelTime = (booking1: Booking | null, booking2: Booking) => {
    if (!booking1) return 0;
    return 15; // Default 15 minutes
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const tabs: Array<{ id: TabType; label: string; badge?: number }> = [
    { id: "today", label: "Today", badge: todayBookings.length },
    { id: "upcoming", label: "Upcoming", badge: upcomingBookings.length },
    { id: "completed", label: "Completed", badge: completedBookings.length },
    { id: "earnings", label: "Earnings" },
    { id: "tier", label: "Tier Progress" },
    { id: "settings", label: "Settings" },
  ];

  const totalEarnings = completedBookings.reduce(
    (sum, b) => sum + calculateSitterEarnings(b.totalPrice),
    0
  );

  if (loading && !sitterId) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={200} />
        </div>
      </AppShell>
    );
  }

  if (!sitterId) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[6] }}>
          <EmptyState
            title="Sitter ID Required"
            description="Please provide a sitter ID in the URL or localStorage"
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Sitter Dashboard"
        description="Your pet care assignments and earnings"
        actions={
          <>
            <Link href="/sitter/inbox">
              <Button variant="primary" leftIcon={<i className="fas fa-inbox" />}>
                Messages
              </Button>
            </Link>
            <Link href={`/sitter-dashboard?id=${sitterId}`}>
              <Button variant="secondary" leftIcon={<i className="fas fa-calendar-alt" />}>
                Full Dashboard
              </Button>
            </Link>
            <Button
              variant="tertiary"
              onClick={() => fetchSitterBookings(sitterId)}
              disabled={loading}
              leftIcon={<i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div style={{ padding: tokens.spacing[6] }}>
        {/* Tier Badge */}
        {sitterTier && (
          <Card
            style={{
              marginBottom: tokens.spacing[6],
              backgroundColor: tokens.colors.primary[50],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: tokens.borderRadius.md,
                  backgroundColor: tokens.colors.primary[500],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.colors.neutral[0],
                  fontSize: tokens.typography.fontSize.xl[0],
                }}
              >
                <i className="fas fa-star" />
              </div>
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                  Current Tier: {sitterTier.name}
                </div>
                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                  Priority Level: {sitterTier.priorityLevel}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: tokens.spacing[6],
            marginBottom: tokens.spacing[6],
          }}
        >
          <StatCard
            label="Upcoming"
            value={upcomingBookings.length}
            icon={<i className="fas fa-calendar" />}
          />
          <StatCard
            label="Completed"
            value={completedBookings.length}
            icon={<i className="fas fa-check-circle" />}
          />
          <StatCard
            label={`Total Earnings (${commissionPercentage}%)`}
            value={`$${totalEarnings.toFixed(2)}`}
            icon={<i className="fas fa-dollar-sign" />}
          />
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as TabType)}
        >
          {/* Today Tab */}
          <TabPanel id="today">
            <Card>
              <SectionHeader title={`Today's Visits (${todayBookings.length})`} />
              <div style={{ padding: tokens.spacing[6] }}>
                {todayBookings.length === 0 ? (
                  <EmptyState
                    title="No visits scheduled for today"
                    description="You have no bookings scheduled for today"
                    icon={<i className="fas fa-calendar" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {todayBookings.map((booking, index) => {
                      const previousBooking = index > 0 ? todayBookings[index - 1] : null;
                      const travelTime = calculateTravelTime(previousBooking, booking);
                      const overdue = isOverdue(booking);
                      
                      return (
                        <Card
                          key={booking.id}
                          style={{
                            borderColor: overdue ? tokens.colors.error.DEFAULT : tokens.colors.border.default,
                            backgroundColor: overdue ? tokens.colors.error[50] : undefined,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: tokens.spacing[4],
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                  {booking.firstName} {booking.lastName.charAt(0)}.
                                </div>
                                {overdue && (
                                  <Badge variant="error">OVERDUE</Badge>
                                )}
                                {getStatusBadge(booking.status)}
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
                                  <span><i className="fas fa-clock" style={{ marginRight: tokens.spacing[1] }} /></span>
                                  {formatTime(booking.startAt)}
                                  <span><i className="fas fa-paw" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                                  {formatPetsByQuantity(booking.pets)}
                                  <span><i className="fas fa-map-marker-alt" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                                  {booking.address}
                                </div>
                                {previousBooking && (
                                  <div style={{ color: tokens.colors.info.DEFAULT, fontSize: tokens.typography.fontSize.xs[0] }}>
                                    <i className="fas fa-route" style={{ marginRight: tokens.spacing[1] }} />
                                    ~{travelTime} min travel from previous visit
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2] }}>
                              <Button
                                variant="tertiary"
                                size="sm"
                                onClick={() => handleBookingClick(booking)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => checkIn(booking.id)}
                              >
                                Check In
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Upcoming Tab */}
          <TabPanel id="upcoming">
            <Card>
              <SectionHeader title={`Upcoming Bookings (${upcomingBookings.length})`} />
              <div style={{ padding: tokens.spacing[6] }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    <Skeleton height={100} />
                    <Skeleton height={100} />
                    <Skeleton height={100} />
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <EmptyState
                    title="No upcoming bookings"
                    description="You have no upcoming bookings scheduled"
                    icon={<i className="fas fa-calendar" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id} style={{ cursor: 'pointer' }} onClick={() => handleBookingClick(booking)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {booking.firstName} {booking.lastName}
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
                                <span><i className="fas fa-calendar" style={{ marginRight: tokens.spacing[1] }} /></span>
                                {formatDate(booking.startAt)}
                                <span><i className="fas fa-clock" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                                {formatTime(booking.startAt)}
                                <span><i className="fas fa-paw" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                                {formatPetsByQuantity(booking.pets)}
                                <span><i className="fas fa-dollar-sign" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                                ${booking.totalPrice.toFixed(2)}
                              </div>
                              <div>
                                <span><i className="fas fa-map-marker-alt" style={{ marginRight: tokens.spacing[1] }} /></span>
                                {booking.address}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Completed Tab */}
          <TabPanel id="completed">
            <Card>
              <SectionHeader title={`Completed Bookings (${completedBookings.length})`} />
              <div style={{ padding: tokens.spacing[6] }}>
                {completedBookings.length === 0 ? (
                  <EmptyState
                    title="No completed bookings"
                    description="You haven't completed any bookings yet"
                    icon={<i className="fas fa-check-circle" style={{ fontSize: '3rem', color: tokens.colors.neutral[300] }} />}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                    {completedBookings.slice(0, 20).map((booking) => (
                      <Card key={booking.id} style={{ cursor: 'pointer' }} onClick={() => handleBookingClick(booking)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[3], marginBottom: tokens.spacing[2] }}>
                              <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0] }}>
                                {booking.firstName} {booking.lastName}
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              <span><i className="fas fa-calendar" style={{ marginRight: tokens.spacing[1] }} /></span>
                              {formatDate(booking.startAt)}
                              <span><i className="fas fa-paw" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                              {formatPetsByQuantity(booking.pets)}
                              <span><i className="fas fa-dollar-sign" style={{ marginRight: tokens.spacing[1], marginLeft: tokens.spacing[4] }} /></span>
                              ${booking.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {completedBookings.length > 20 && (
                      <div style={{ textAlign: 'center', padding: tokens.spacing[4], color: tokens.colors.text.secondary, fontSize: tokens.typography.fontSize.sm[0] }}>
                        +{completedBookings.length - 20} more completed bookings
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Earnings Tab */}
          <TabPanel id="earnings">
            <Card>
              <SectionHeader title="Earnings Breakdown" />
              <div style={{ padding: tokens.spacing[6] }}>
                {earningsData ? (
                  <>
                    {/* Summary Cards */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: tokens.spacing[4],
                        marginBottom: tokens.spacing[6],
                      }}
                    >
                      <Card style={{ padding: tokens.spacing[6] }}>
                        <div style={{ fontSize: tokens.typography.fontSize.sm[0], fontWeight: tokens.typography.fontWeight.medium, color: tokens.colors.text.secondary, marginBottom: tokens.spacing[2], textTransform: 'uppercase' }}>
                          Total Earnings
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize['3xl'][0], fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.text.primary, marginBottom: tokens.spacing[1] }}>
                          ${earningsData.summary.totalEarnings.toFixed(2)}
                        </div>
                        <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                          {earningsData.summary.totalBookings} bookings ({earningsData.summary.commissionPercentage}% commission)
                        </div>
                      </Card>
                      <StatCard
                        label="Last 30 Days"
                        value={`$${earningsData.summary.earningsLast30Days.toFixed(2)}`}
                      />
                      <StatCard
                        label="Last 90 Days"
                        value={`$${earningsData.summary.earningsLast90Days.toFixed(2)}`}
                      />
                    </div>

                    {/* Earnings by Service Type */}
                    {earningsData.earningsByService && earningsData.earningsByService.length > 0 && (
                      <div style={{ marginBottom: tokens.spacing[6] }}>
                        <SectionHeader title="Earnings by Service Type" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginTop: tokens.spacing[4] }}>
                          {earningsData.earningsByService.map((service: any, idx: number) => (
                            <Card key={idx}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                                    {service.service}
                                  </div>
                                  <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                    {service.bookingCount} booking{service.bookingCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                                    ${service.totalEarnings.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                                    from ${service.totalRevenue.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Earnings by Booking */}
                    <div>
                      <SectionHeader title="Earnings by Booking" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2], marginTop: tokens.spacing[4], maxHeight: '24rem', overflowY: 'auto' }}>
                        {earningsData.earningsByBooking.map((item: any) => (
                          <Card key={item.bookingId}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                                  {item.clientName}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                                  {formatDate(item.date)} - {item.service}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: tokens.typography.fontWeight.bold, color: tokens.colors.primary.DEFAULT }}>
                                  ${item.earnings.toFixed(2)}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.xs[0], color: tokens.colors.text.secondary }}>
                                  from ${item.totalPrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Loading earnings data"
                    description="Please wait while we fetch your earnings information"
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Tier Progress Tab */}
          <TabPanel id="tier">
            <Card>
              <SectionHeader title="Tier Progress" />
              <div style={{ padding: tokens.spacing[6] }}>
                {tierProgress ? (
                  <>
                    {/* Current Tier */}
                    {tierProgress.tier && (
                      <Card
                        style={{
                          marginBottom: tokens.spacing[6],
                          backgroundColor: tokens.colors.primary[50],
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[4] }}>
                          <div
                            style={{
                              width: '3rem',
                              height: '3rem',
                              borderRadius: tokens.borderRadius.md,
                              backgroundColor: tokens.colors.primary[500],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: tokens.colors.neutral[0],
                              fontSize: tokens.typography.fontSize.xl[0],
                            }}
                          >
                            <i className="fas fa-star" />
                          </div>
                          <div>
                            <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], color: tokens.colors.primary.DEFAULT }}>
                              Current Tier: {tierProgress.tier.name}
                            </div>
                            <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                              Priority Level: {tierProgress.tier.priorityLevel}
                            </div>
                            {tierProgress.tier.benefits && (
                              <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[2] }}>
                                Benefits: {typeof tierProgress.tier.benefits === 'string' ? tierProgress.tier.benefits : JSON.stringify(tierProgress.tier.benefits)}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Performance Metrics */}
                    {tierProgress.performance && (
                      <div style={{ marginBottom: tokens.spacing[6] }}>
                        <SectionHeader title="Performance Metrics" />
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: tokens.spacing[4],
                            marginTop: tokens.spacing[4],
                          }}
                        >
                          <StatCard
                            label="Points"
                            value={tierProgress.performance.points || 0}
                          />
                          <StatCard
                            label="Completion Rate"
                            value={`${tierProgress.performance.completionRate?.toFixed(1) || '0.0'}%`}
                          />
                          <StatCard
                            label="Response Rate"
                            value={`${tierProgress.performance.responseRate?.toFixed(1) || '0.0'}%`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Next Tier */}
                    {tierProgress.nextTier && (
                      <Card
                        style={{
                          marginBottom: tokens.spacing[6],
                          backgroundColor: tokens.colors.info[50],
                          borderColor: tokens.colors.info[200],
                        }}
                      >
                        <div style={{ fontWeight: tokens.typography.fontWeight.bold, fontSize: tokens.typography.fontSize.lg[0], marginBottom: tokens.spacing[2], color: tokens.colors.primary.DEFAULT }}>
                          Next Tier: {tierProgress.nextTier.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[1], fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                          {tierProgress.nextTier.pointTarget && (
                            <div>Point Target: {tierProgress.nextTier.pointTarget}</div>
                          )}
                          {tierProgress.nextTier.minCompletionRate && (
                            <div>Min Completion Rate: {tierProgress.nextTier.minCompletionRate}%</div>
                          )}
                          {tierProgress.nextTier.minResponseRate && (
                            <div>Min Response Rate: {tierProgress.nextTier.minResponseRate}%</div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Improvement Areas */}
                    {tierProgress.improvementAreas && tierProgress.improvementAreas.length > 0 && (
                      <div>
                        <SectionHeader title="Areas to Improve" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[3], marginTop: tokens.spacing[4] }}>
                          {tierProgress.improvementAreas.map((area: string, idx: number) => (
                            <Card
                              key={idx}
                              style={{
                                backgroundColor: tokens.colors.warning[50],
                                borderColor: tokens.colors.warning[200],
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: tokens.spacing[2] }}>
                                <div
                                  style={{
                                    width: '1.5rem',
                                    height: '1.5rem',
                                    borderRadius: tokens.borderRadius.full,
                                    backgroundColor: tokens.colors.warning[200],
                                    color: tokens.colors.warning[700],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontSize: tokens.typography.fontSize.xs[0],
                                    fontWeight: tokens.typography.fontWeight.bold,
                                  }}
                                >
                                  {idx + 1}
                                </div>
                                <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary }}>
                                  {area}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="Loading tier progress"
                    description="Please wait while we fetch your tier information"
                  />
                )}
              </div>
            </Card>
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel id="settings">
            <Card>
              <SectionHeader title="Personal Settings" />
              <div style={{ padding: tokens.spacing[6] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
                  <div>
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>
                      Commission Percentage
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.lg[0] }}>{commissionPercentage}%</div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                      Set by owner
                    </div>
                  </div>
                  {sitterTier && (
                    <div>
                      <div style={{ fontWeight: tokens.typography.fontWeight.semibold, marginBottom: tokens.spacing[2] }}>
                        Current Tier
                      </div>
                      <div style={{ fontSize: tokens.typography.fontSize.lg[0] }}>{sitterTier.name}</div>
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                        Priority: {sitterTier.priorityLevel}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabPanel>
        </Tabs>
      </div>

      {/* Visit Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBooking(null);
        }}
        title="Visit Details"
      >
        {selectedBooking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[4] }}>
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>Client</div>
              <p>{selectedBooking.firstName} {selectedBooking.lastName.charAt(0)}.</p>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                {selectedBooking.phone}
              </p>
            </div>
            
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>Service</div>
              <p>{selectedBooking.service}</p>
              <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                {formatDate(selectedBooking.startAt)} at {formatTime(selectedBooking.startAt)}
              </p>
            </div>
            
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>Address</div>
              <p>{selectedBooking.address}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedBooking.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: tokens.colors.info.DEFAULT, fontSize: tokens.typography.fontSize.sm[0] }}
              >
                Get Directions →
              </a>
            </div>
            
            <div>
              <div style={{ fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>Pets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing[2] }}>
                {selectedBooking.pets.map((pet, idx) => (
                  <Card key={idx} style={{ backgroundColor: tokens.colors.neutral[50] }}>
                    <div style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                      {pet.name || `Pet ${idx + 1}`}
                    </div>
                    <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary }}>
                      {pet.species}
                    </div>
                    {pet.notes && (
                      <div style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.secondary, marginTop: tokens.spacing[1] }}>
                        {pet.notes}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
            
            {selectedBooking.notes && (
              <div>
                <div style={{ fontWeight: tokens.typography.fontWeight.bold, marginBottom: tokens.spacing[2] }}>Notes</div>
                <p style={{ fontSize: tokens.typography.fontSize.sm[0], color: tokens.colors.text.primary, whiteSpace: 'pre-wrap' }}>
                  {selectedBooking.notes}
                </p>
              </div>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing[2], paddingTop: tokens.spacing[4], borderTop: `1px solid ${tokens.colors.border.default}` }}>
              <Button
                variant="primary"
                onClick={() => checkIn(selectedBooking.id)}
                style={{ flex: 1 }}
              >
                Check In
              </Button>
              <Button
                variant="tertiary"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBooking(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

export default function SitterPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div style={{ padding: tokens.spacing[6] }}>
          <Skeleton height={200} />
        </div>
      </AppShell>
    }>
      <SitterPageContent />
    </Suspense>
  );
}

