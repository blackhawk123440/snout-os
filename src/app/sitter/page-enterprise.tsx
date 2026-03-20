/**
 * Sitter Dashboard Page - Enterprise Rebuild
 *
 * Complete rebuild using design system and components.
 * Zero legacy styling - all through components and Tailwind classes.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Inbox,
  Calendar,
  RefreshCw,
  Star,
  CheckCircle2,
  DollarSign,
  Clock,
  PawPrint,
  MapPin,
  Route,
} from 'lucide-react';
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
  useToast,
} from '@/components/ui';
import { AppShell } from '@/components/layout/AppShell';

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
  const { showToast } = useToast();
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
      showToast({ variant: 'success', message: 'Checked in successfully' });
      fetchSitterBookings(sitterId);
      setShowDetailModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Failed to check in:", error);
      showToast({ variant: 'error', message: 'Failed to check in' });
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
        <div className="p-6">
          <Skeleton height={200} />
        </div>
      </AppShell>
    );
  }

  if (!sitterId) {
    return (
      <AppShell>
        <PageHeader title="Sitter Dashboard" />
        <div className="p-6">
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
              <Button variant="primary" leftIcon={<Inbox className="h-4 w-4" />}>
                Messages
              </Button>
            </Link>
            <Link href={`/sitter-dashboard?id=${sitterId}`}>
              <Button variant="secondary" leftIcon={<Calendar className="h-4 w-4" />}>
                Full Dashboard
              </Button>
            </Link>
            <Button
              variant="tertiary"
              onClick={() => fetchSitterBookings(sitterId)}
              disabled={loading}
              leftIcon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </>
        }
      />

      <div className="p-6">
        {/* Tier Badge */}
        {sitterTier && (
          <Card className="mb-6 bg-accent-secondary">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-accent-primary flex items-center justify-center text-white text-xl">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-accent-primary">
                  Current Tier: {sitterTier.name}
                </div>
                <div className="text-sm text-text-secondary">
                  Priority Level: {sitterTier.priorityLevel}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-6">
          <StatCard
            label="Upcoming"
            value={upcomingBookings.length}
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatCard
            label="Completed"
            value={completedBookings.length}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            label={`Total Earnings (${commissionPercentage}%)`}
            value={`$${totalEarnings.toFixed(2)}`}
            icon={<DollarSign className="h-4 w-4" />}
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
              <div className="p-6">
                {todayBookings.length === 0 ? (
                  <EmptyState
                    title="No visits scheduled for today"
                    description="You have no bookings scheduled for today"
                    icon={<Calendar className="h-12 w-12 text-neutral-300" />}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {todayBookings.map((booking, index) => {
                      const previousBooking = index > 0 ? todayBookings[index - 1] : null;
                      const travelTime = calculateTravelTime(previousBooking, booking);
                      const overdue = isOverdue(booking);

                      return (
                        <Card
                          key={booking.id}
                          className={overdue ? 'border-status-danger-border bg-status-danger-bg' : ''}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-bold text-lg">
                                  {booking.firstName} {booking.lastName.charAt(0)}.
                                </div>
                                {overdue && (
                                  <Badge variant="error">OVERDUE</Badge>
                                )}
                                {getStatusBadge(booking.status)}
                              </div>

                              <div className="flex flex-col gap-1 text-sm text-text-secondary">
                                <div className="flex items-center gap-4">
                                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 mr-1" /></span>
                                  {formatTime(booking.startAt)}
                                  <span className="inline-flex items-center gap-1 ml-4"><PawPrint className="h-3.5 w-3.5 mr-1" /></span>
                                  {formatPetsByQuantity(booking.pets)}
                                  <span className="inline-flex items-center gap-1 ml-4"><MapPin className="h-3.5 w-3.5 mr-1" /></span>
                                  {booking.address}
                                </div>
                                {previousBooking && (
                                  <div className="text-info text-xs inline-flex items-center">
                                    <Route className="h-3 w-3 mr-1" />
                                    ~{travelTime} min travel from previous visit
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
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
              <div className="p-6">
                {loading ? (
                  <div className="flex flex-col gap-4">
                    <Skeleton height={100} />
                    <Skeleton height={100} />
                    <Skeleton height={100} />
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <EmptyState
                    title="No upcoming bookings"
                    description="You have no upcoming bookings scheduled"
                    icon={<Calendar className="h-12 w-12 text-neutral-300" />}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id} className="cursor-pointer" onClick={() => handleBookingClick(booking)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-lg">
                                {booking.firstName} {booking.lastName}
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>

                            <div className="flex flex-col gap-1 text-sm text-text-secondary">
                              <div className="flex items-center gap-4">
                                <span className="inline-flex items-center"><Calendar className="h-3.5 w-3.5 mr-1" /></span>
                                {formatDate(booking.startAt)}
                                <span className="inline-flex items-center ml-4"><Clock className="h-3.5 w-3.5 mr-1" /></span>
                                {formatTime(booking.startAt)}
                                <span className="inline-flex items-center ml-4"><PawPrint className="h-3.5 w-3.5 mr-1" /></span>
                                {formatPetsByQuantity(booking.pets)}
                                <span className="inline-flex items-center ml-4"><DollarSign className="h-3.5 w-3.5 mr-1" /></span>
                                ${booking.totalPrice.toFixed(2)}
                              </div>
                              <div>
                                <span className="inline-flex items-center"><MapPin className="h-3.5 w-3.5 mr-1" /></span>
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
              <div className="p-6">
                {completedBookings.length === 0 ? (
                  <EmptyState
                    title="No completed bookings"
                    description="You haven't completed any bookings yet"
                    icon={<CheckCircle2 className="h-12 w-12 text-neutral-300" />}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {completedBookings.slice(0, 20).map((booking) => (
                      <Card key={booking.id} className="cursor-pointer" onClick={() => handleBookingClick(booking)}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-bold text-lg">
                                {booking.firstName} {booking.lastName}
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-text-secondary">
                              <span className="inline-flex items-center"><Calendar className="h-3.5 w-3.5 mr-1" /></span>
                              {formatDate(booking.startAt)}
                              <span className="inline-flex items-center ml-4"><PawPrint className="h-3.5 w-3.5 mr-1" /></span>
                              {formatPetsByQuantity(booking.pets)}
                              <span className="inline-flex items-center ml-4"><DollarSign className="h-3.5 w-3.5 mr-1" /></span>
                              ${booking.totalPrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {completedBookings.length > 20 && (
                      <div className="text-center p-4 text-text-secondary text-sm">
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
              <div className="p-6">
                {earningsData ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                      <Card className="p-6">
                        <div className="text-sm font-medium text-text-secondary mb-2 uppercase">
                          Total Earnings
                        </div>
                        <div className="text-3xl font-bold text-text-primary mb-1">
                          ${earningsData.summary.totalEarnings.toFixed(2)}
                        </div>
                        <div className="text-xs text-text-secondary">
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
                      <div className="mb-6">
                        <SectionHeader title="Earnings by Service Type" />
                        <div className="flex flex-col gap-2 mt-4">
                          {earningsData.earningsByService.map((service: any, idx: number) => (
                            <Card key={idx}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold">
                                    {service.service}
                                  </div>
                                  <div className="text-sm text-text-secondary">
                                    {service.bookingCount} booking{service.bookingCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-accent-primary">
                                    ${service.totalEarnings.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-text-secondary">
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
                      <div className="flex flex-col gap-2 mt-4 max-h-96 overflow-y-auto">
                        {earningsData.earningsByBooking.map((item: any) => (
                          <Card key={item.bookingId}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold">
                                  {item.clientName}
                                </div>
                                <div className="text-sm text-text-secondary">
                                  {formatDate(item.date)} - {item.service}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-accent-primary">
                                  ${item.earnings.toFixed(2)}
                                </div>
                                <div className="text-xs text-text-secondary">
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
              <div className="p-6">
                {tierProgress ? (
                  <>
                    {/* Current Tier */}
                    {tierProgress.tier && (
                      <Card className="mb-6 bg-accent-secondary">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-md bg-accent-primary flex items-center justify-center text-white text-xl">
                            <Star className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="font-bold text-lg text-accent-primary">
                              Current Tier: {tierProgress.tier.name}
                            </div>
                            <div className="text-sm text-text-secondary">
                              Priority Level: {tierProgress.tier.priorityLevel}
                            </div>
                            {tierProgress.tier.benefits && (
                              <div className="text-sm text-text-secondary mt-2">
                                Benefits: {typeof tierProgress.tier.benefits === 'string' ? tierProgress.tier.benefits : JSON.stringify(tierProgress.tier.benefits)}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Performance Metrics */}
                    {tierProgress.performance && (
                      <div className="mb-6">
                        <SectionHeader title="Performance Metrics" />
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mt-4">
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
                      <Card className="mb-6 bg-blue-50 border-blue-200">
                        <div className="font-bold text-lg mb-2 text-accent-primary">
                          Next Tier: {tierProgress.nextTier.name}
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-text-secondary">
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
                        <div className="flex flex-col gap-3 mt-4">
                          {tierProgress.improvementAreas.map((area: string, idx: number) => (
                            <Card
                              key={idx}
                              className="bg-status-warning-bg border-yellow-200"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center shrink-0 text-xs font-bold">
                                  {idx + 1}
                                </div>
                                <div className="text-sm text-text-primary">
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
              <div className="p-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="font-semibold mb-2">
                      Commission Percentage
                    </div>
                    <div className="text-lg">{commissionPercentage}%</div>
                    <div className="text-sm text-text-secondary mt-1">
                      Set by owner
                    </div>
                  </div>
                  {sitterTier && (
                    <div>
                      <div className="font-semibold mb-2">
                        Current Tier
                      </div>
                      <div className="text-lg">{sitterTier.name}</div>
                      <div className="text-sm text-text-secondary mt-1">
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
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-bold mb-2">Client</div>
              <p>{selectedBooking.firstName} {selectedBooking.lastName.charAt(0)}.</p>
              <p className="text-sm text-text-secondary">
                {selectedBooking.phone}
              </p>
            </div>

            <div>
              <div className="font-bold mb-2">Service</div>
              <p>{selectedBooking.service}</p>
              <p className="text-sm text-text-secondary">
                {formatDate(selectedBooking.startAt)} at {formatTime(selectedBooking.startAt)}
              </p>
            </div>

            <div>
              <div className="font-bold mb-2">Address</div>
              <p>{selectedBooking.address}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedBooking.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-info text-sm"
              >
                Get Directions →
              </a>
            </div>

            <div>
              <div className="font-bold mb-2">Pets</div>
              <div className="flex flex-col gap-2">
                {selectedBooking.pets.map((pet, idx) => (
                  <Card key={idx} className="bg-neutral-50">
                    <div className="font-semibold">
                      {pet.name || `Pet ${idx + 1}`}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {pet.species}
                    </div>
                    {pet.notes && (
                      <div className="text-sm text-text-secondary mt-1">
                        {pet.notes}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {selectedBooking.notes && (
              <div>
                <div className="font-bold mb-2">Notes</div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {selectedBooking.notes}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-4 border-t border-border-default">
              <Button
                variant="primary"
                onClick={() => checkIn(selectedBooking.id)}
                className="flex-1"
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
        <div className="p-6">
          <Skeleton height={200} />
        </div>
      </AppShell>
    }>
      <SitterPageContent />
    </Suspense>
  );
}
