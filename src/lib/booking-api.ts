// ============================================================================
// BOOKING DASHBOARD API CALLS
// ============================================================================

export interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  service: string;
  minutes?: number;
  quantity: number;
  startAt: string;
  endAt: string;
  afterHours: boolean;
  holiday: boolean;
  special?: string;
  totalPrice?: number;
  status: string;
  sitterId?: string;
  sitter?: Sitter;
  pets: Pet[];
  timeSlots?: TimeSlot[];
  createdAt: string;
  createdFrom?: string;
  paymentStatus?: string;
  stripePaymentLinkUrl?: string;
  paidAt?: string;
  archived?: boolean;
  archivedAt?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
}

export interface TimeSlot {
  id: string;
  startAt: string;
  endAt: string;
  duration: number;
}

export interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  stripeAccountId?: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

export const bookingAPI = {
  /**
   * Fetch all bookings
   */
  async fetchBookings(): Promise<Booking[]> {
    const response = await fetch("/api/bookings");
    if (!response.ok) throw new Error("Failed to fetch bookings");
    const data = await response.json();
    return data.bookings || [];
  },

  /**
   * Fetch active sitters
   */
  async fetchSitters(): Promise<Sitter[]> {
    const response = await fetch("/api/sitters?active=true");
    if (!response.ok) throw new Error("Failed to fetch sitters");
    const data = await response.json();
    return data.sitters || [];
  },

  /**
   * Update a booking
   */
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update booking");
    const data = await response.json();
    return data.booking;
  },

  /**
   * Delete a booking
   */
  async deleteBooking(id: string): Promise<void> {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete booking");
  },

  /**
   * Check for sitter scheduling conflicts
   */
  async checkConflicts(
    sitterId: string,
    startAt: string,
    endAt: string,
    excludeBookingId: string
  ): Promise<{ hasConflict: boolean; conflictingBookings: any[] }> {
    const response = await fetch(`/api/sitters/${sitterId}/conflicts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt, endAt, excludeBookingId }),
    });
    if (!response.ok) throw new Error("Failed to check conflicts");
    return await response.json();
  },

  /**
   * Calculate booking price
   */
  async calculatePrice(
    service: string,
    minutes: number | undefined,
    petCount: number,
    afterHours: boolean,
    holiday: boolean
  ): Promise<number> {
    const response = await fetch("/api/calculate-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, minutes, petCount, afterHours, holiday }),
    });
    if (!response.ok) throw new Error("Failed to calculate price");
    const data = await response.json();
    return data.totalPrice;
  },

  /**
   * Create Stripe payment link
   */
  async createPaymentLink(bookingId: string): Promise<string> {
    const response = await fetch("/api/payments/create-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    if (!response.ok) throw new Error("Failed to create payment link");
    const data = await response.json();
    return data.paymentLink;
  },

  /**
   * Create Stripe invoice
   */
  async createInvoice(bookingId: string): Promise<{ invoiceId: string; invoiceUrl?: string }> {
    const response = await fetch("/api/stripe/create-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create invoice");
    }
    return await response.json();
  },

  /**
   * Fetch a single booking by ID
   */
  async fetchBookingById(bookingId: string): Promise<Booking | null> {
    const bookings = await this.fetchBookings();
    return bookings.find((b) => b.id === bookingId) || null;
  },
};

