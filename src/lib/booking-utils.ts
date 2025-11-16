import { DEFAULT_RATES, computeQuote, DEFAULT_HOLIDAYS, getRateForService } from "./rates";

export interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  service: string;
  startAt: Date;
  endAt: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Sitter {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rate {
  id: string;
  service: string;
  duration: number;
  price: number;
  description: string;
}

export const COLORS = {
  primary: "#432f21",
  primaryLight: "#fce1ef",
  primaryLighter: "#fef7fb",
  secondary: "#e2e8f0",
  accent: "#f8fafc",
  white: "#ffffff",
  gray: "#6b7280",
  border: "#e5e7eb",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

export function formatPetsByQuantity(pets: Array<{ species: string }>): string {
  const counts: Record<string, number> = {};
  
  pets.forEach(pet => {
    counts[pet.species] = (counts[pet.species] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
    .join(', ');
}


export function groupPets(pets: Array<{ species: string }>): Record<string, number> {
  const groups: Record<string, number> = {};
  
  pets.forEach(pet => {
    groups[pet.species] = (groups[pet.species] || 0) + 1;
  });
  
  return groups;
}

export function getPetIcon(species: string): string {
  const iconMap: Record<string, string> = {
    'dog': 'fas fa-dog',
    'cat': 'fas fa-cat',
    'bird': 'fas fa-dove',
    'fish': 'fas fa-fish',
    'rabbit': 'fas fa-rabbit',
    'reptile': 'fas fa-dragon',
    'reptiles': 'fas fa-dragon',
    'farm animal': 'fas fa-horse',
    'farm animals': 'fas fa-horse',
    'farm': 'fas fa-horse',
    'hamster': 'fas fa-paw',
    'guinea pig': 'fas fa-paw',
    'turtle': 'fas fa-paw',
    'snake': 'fas fa-paw',
    'lizard': 'fas fa-paw',
    'ferret': 'fas fa-paw',
    'chinchilla': 'fas fa-paw',
    'hedgehog': 'fas fa-paw',
    'other': 'fas fa-paw'
  };
  
  return iconMap[species.toLowerCase()] || 'fas fa-paw';
}

export function getServiceIcon(service: string): string {
  const iconMap: Record<string, string> = {
    'Dog Walking': 'fas fa-dog',
    'Housesitting': 'fas fa-home',
    'Drop-ins': 'fas fa-bone',
    'Pet Taxi': 'fas fa-car',
    '24/7 Care': 'fas fa-heart',
    'Pet Sitting': 'fas fa-home',
    'Pet Care': 'fas fa-paw'
  };
  
  return iconMap[service] || 'fas fa-paw';
}

export interface PriceBreakdown {
  basePrice: number;
  additionalPets: number;
  holidayAdd: number;
  afterHoursAdd: number;
  quantity: number;
  total: number;
  breakdown: Array<{
    label: string;
    amount: number;
    description?: string;
  }>;
}

export function calculatePriceBreakdown(booking: {
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  pets: Array<{ species: string }>;
  quantity?: number;
  afterHours?: boolean;
  holiday?: boolean;
  totalPrice?: number | null;
  timeSlots?: Array<{ id?: string; startAt: Date | string; endAt: Date | string; duration: number }>;
}): PriceBreakdown {
  const petCount = booking.pets.length;
  const rate = getRateForService(booking.service);
  
  if (!rate) {
    return {
      basePrice: 0,
      additionalPets: 0,
      holidayAdd: 0,
      afterHoursAdd: 0,
      quantity: booking.quantity || 1,
      total: booking.totalPrice || 0,
      breakdown: [{
        label: 'Service Not Found',
        amount: booking.totalPrice || 0,
        description: 'Unable to calculate breakdown'
      }]
    };
  }

  const startDate = booking.startAt instanceof Date ? booking.startAt : new Date(booking.startAt);
  const endDate = booking.endAt instanceof Date ? booking.endAt : new Date(booking.endAt);
  
  const quoteInput = {
    service: booking.service,
    quantity: booking.quantity || 1,
    petCount,
    afterHours: booking.afterHours || false,
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    holidayDatesISO: DEFAULT_HOLIDAYS,
    rate,
  };

  const holidayApplied = computeQuote(quoteInput).holidayApplied;
  
  const breakdown: Array<{ label: string; amount: number; description?: string }> = [];
  let basePrice = 0;

  if (booking.service === "Housesitting" || booking.service === "24/7 Care") {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    basePrice = rate.base * diffDays;
    breakdown.push({
      label: `${booking.service} (${diffDays} ${diffDays === 1 ? 'night' : 'nights'})`,
      amount: basePrice,
      description: `$${rate.base} × ${diffDays} nights`
    });
    
    // Add additional pets cost for house sitting and 24/7 care
    const addlPets = Math.max(petCount - 1, 0);
    if (addlPets > 0) {
      const addlPetTotal = addlPets * rate.addlPet * diffDays;
      basePrice += addlPetTotal;
      breakdown.push({
        label: `Additional Pets (${addlPets})`,
        amount: addlPetTotal,
        description: `$${rate.addlPet} × ${addlPets} × ${diffDays} nights`
      });
    }
  } else {
    // Visit-based services: price per time slot, supporting 30/60 minute pricing
    const hasSlots = Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0;
    if (hasSlots) {
      const addlPets = Math.max(petCount - 1, 0);
      let count30 = 0;
      let count60 = 0;
      booking.timeSlots!.forEach(ts => {
        const dur = typeof ts.duration === 'number' ? ts.duration : 30;
        if (dur >= 60) count60++; else count30++;
      });
      const per30 = rate.base;
      const per60 = rate.base60 ?? rate.base;
      const holidayAddPerVisit = holidayApplied ? rate.holidayAdd : 0;
      // Additional pets: $5 per additional pet per visit for Drop-ins, Dog Walking, Pet Taxi
      // $10 per additional pet per visit for House sitting, 24/7 Care
      const addlPetsPerVisit = addlPets * rate.addlPet;
      const afterHoursPerVisit = booking.afterHours ? 0 : 0;

      // Calculate base price without additional pets (they'll be added separately)
      const base30 = count30 * (per30 + holidayAddPerVisit + afterHoursPerVisit);
      const base60 = count60 * (per60 + holidayAddPerVisit + afterHoursPerVisit);
      basePrice = base30 + base60;

      if (count30 > 0) {
        breakdown.push({
          label: `${booking.service} (30 min × ${count30})`,
          amount: count30 * per30,
          description: `$${per30} × ${count30} visits`
        });
      }
      if (count60 > 0) {
        breakdown.push({
          label: `${booking.service} (60 min × ${count60})`,
          amount: count60 * per60,
          description: `$${per60} × ${count60} visits`
        });
      }

      if (addlPetsPerVisit > 0) {
        const visits = count30 + count60;
        const additionalPetsAmount = addlPetsPerVisit * visits;
        breakdown.push({
          label: `Additional Pets (${addlPets})`,
          amount: additionalPetsAmount,
          description: `$${rate.addlPet} × ${addlPets} × ${visits} visits`
        });
      }

      if (holidayAddPerVisit > 0) {
        const visits = count30 + count60;
        breakdown.push({
          label: `Holiday Rate`,
          amount: holidayAddPerVisit * visits,
          description: `$${rate.holidayAdd} × ${visits} visits`
        });
      }

    } else {
      // For services without timeSlots (Housesitting, 24/7 Care), calculate based on nights
      const startDate = new Date(booking.startAt);
      const endDate = new Date(booking.endAt);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
      const quantity = diffDays; // Number of nights
      const addlPets = Math.max(petCount - 1, 0);
      basePrice = rate.base * quantity;
      breakdown.push({
        label: `${booking.service} (${quantity} ${quantity === 1 ? 'visit' : 'visits'})`,
        amount: basePrice,
        description: `$${rate.base} × ${quantity} visits`
      });

      // Add additional pets cost
      if (addlPets > 0) {
        const addlPetTotal = addlPets * rate.addlPet * quantity;
        basePrice += addlPetTotal;
        breakdown.push({
          label: `Additional Pets (${addlPets})`,
          amount: addlPetTotal,
          description: `$${rate.addlPet} × ${addlPets} × ${quantity} visits`
        });
      }

      if (holidayApplied) {
        const holidayTotal = rate.holidayAdd * quantity;
        breakdown.push({
          label: `Holiday Rate`,
          amount: holidayTotal,
          description: `$${rate.holidayAdd} × ${quantity} visits`
        });
      }
    }
  }

  // Overtime removed - no longer calculating overtime charges
  let overtimeTotal = 0;

  // After hours (kept as separate line only if used as a flat fee; currently 0)
  let afterHoursTotal = 0;
  if (booking.afterHours) {
    // If changed in future to a flat fee, adjust here
    afterHoursTotal = 0;
  }

  // Calculate additional pets total separately for visit-based services with timeSlots
  // (For house sitting/24-7 care, additional pets are already added to basePrice above)
  // (For services without timeSlots, additional pets are already added to basePrice in the else block)
  let additionalPetsTotal = 0;
  const isHouseSittingService = booking.service === "Housesitting" || booking.service === "24/7 Care";
  if (!isHouseSittingService && Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0) {
    // For visit-based services with timeSlots, additional pets are calculated separately
    // We need to calculate the same way as in the breakdown above
    const addlPets = Math.max(petCount - 1, 0);
    if (addlPets > 0) {
      // Count visits the same way as in the breakdown (count30 + count60)
      let count30 = 0;
      let count60 = 0;
      booking.timeSlots.forEach(ts => {
        const dur = typeof ts.duration === 'number' ? ts.duration : 30;
        if (dur >= 60) count60++; else count30++;
      });
      const visits = count30 + count60;
      additionalPetsTotal = addlPets * rate.addlPet * visits;
    }
  }
  // For house sitting/24-7 care, additional pets are already in basePrice (added at line 200)
  // For services without timeSlots, additional pets are already in basePrice (added at line 263)

  const total = basePrice + additionalPetsTotal + afterHoursTotal;

  return {
    basePrice,
    additionalPets: 0, // rolled into per-visit above when slots are present
    holidayAdd: 0,     // rolled into per-visit above when slots are present
    afterHoursAdd: afterHoursTotal,
    quantity: booking.timeSlots?.length || booking.quantity || 1,
    total: Number(total.toFixed(2)),
    breakdown
  };
}

export function isValidStatus(status: string): status is "pending" | "confirmed" | "completed" | "cancelled" {
  return ["pending", "confirmed", "completed", "cancelled"].includes(status);
}

export function isValidService(service: string): service is "Dog Walking" | "Pet Sitting" | "Pet Boarding" | "Pet Grooming" {
  return ["Dog Walking", "Pet Sitting", "Pet Boarding", "Pet Grooming"].includes(service);
}

export interface TimeConflict {
  bookingId: string;
  startAt: Date;
  endAt: Date;
}

export interface SitterConflict {
  sitterId: string;
  conflicts: TimeConflict[];
}

export function hasTimeConflict(
  startAt: Date,
  endAt: Date,
  existingBookings: Array<{ startAt: Date; endAt: Date }>
): boolean {
  return existingBookings.some(booking => {
    return (
      (startAt < booking.endAt && endAt > booking.startAt) ||
      (booking.startAt < endAt && booking.endAt > startAt)
    );
  });
}

export function hasSitterConflict(
  sitterId: string,
  startAt: Date,
  endAt: Date,
  existingBookings: Array<{ sitterId: string; startAt: Date; endAt: Date }>
): boolean {
  const sitterBookings = existingBookings.filter(booking => booking.sitterId === sitterId);
  return hasTimeConflict(startAt, endAt, sitterBookings);
}

export function getBookingConflicts(
  booking: { id?: string; startAt: Date; endAt: Date; sitterId?: string },
  allBookings: Array<{ id: string; startAt: Date; endAt: Date; sitterId?: string }>
): Array<{ id: string; startAt: Date; endAt: Date }> {
  return allBookings
    .filter(b => !booking.id || b.id !== booking.id)
    .filter(b => {
      if (booking.sitterId && b.sitterId && booking.sitterId !== b.sitterId) {
        return false;
      }
      return hasTimeConflict(booking.startAt, booking.endAt, [b]);
    })
    .map(b => ({ id: b.id, startAt: b.startAt, endAt: b.endAt }));
}

export function getConflictStatus(
  booking: { startAt: Date; endAt: Date; sitterId?: string },
  allBookings: Array<{ id: string; startAt: Date; endAt: Date; sitterId?: string }>
): "none" | "time" | "sitter" {
  const conflicts = getBookingConflicts(booking, allBookings);
  
  if (conflicts.length === 0) {
    return "none";
  }
  
  const sitterConflicts = conflicts.filter(c => {
    const conflictBooking = allBookings.find(b => b.id === c.id);
    return conflictBooking?.sitterId === booking.sitterId;
  });
  
  return sitterConflicts.length > 0 ? "sitter" : "time";
}

/**
 * Format date to match booking details page format
 * Uses toLocaleDateString() default format
 */
export function formatDateForMessage(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
}

/**
 * Format time to match booking details page format
 * Uses UTC methods to get original time components (since dates are stored with local time as UTC)
 * Formats as "H:MM AM/PM"
 */
export function formatTimeForMessage(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Dates are stored with local time as UTC, so use UTC methods to get the original time
  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Format dates and times for automated messages
 * 
 * RULES:
 * - For Drop-Ins, Walks, and Pet Taxi: include every selected visit date, visit time, and visit duration.
 *   If multiple visits exist, list them all in order.
 * - For House Sitting and 24/7 Care: include the single start date and start time and the single end date and end time.
 * 
 * All data is pulled directly from booking details with no hardcoding.
 */
export function formatDatesAndTimesForMessage(booking: {
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  timeSlots?: Array<{ startAt: Date | string; endAt: Date | string; duration: number }>;
}): string {
  const isHouseSittingService = booking.service === "Housesitting" || booking.service === "24/7 Care";
  const hasTimeSlots = Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0;

  // For Drop-Ins, Walks, and Pet Taxi: include every selected visit date, visit time, and visit duration
  // If multiple visits exist, list them all in order
  if (hasTimeSlots && !isHouseSittingService) {
    // Sort timeSlots by startAt to ensure they're in order
    const sortedSlots = [...booking.timeSlots!].sort((a, b) => {
      const aStart = typeof a.startAt === 'string' ? new Date(a.startAt) : a.startAt;
      const bStart = typeof b.startAt === 'string' ? new Date(b.startAt) : b.startAt;
      return aStart.getTime() - bStart.getTime();
    });
    
    // Group timeSlots by date
    const slotsByDate: Record<string, Array<{ startAt: Date; endAt: Date; duration: number }>> = {};
    
    sortedSlots.forEach(slot => {
      const slotStart = typeof slot.startAt === 'string' ? new Date(slot.startAt) : slot.startAt;
      const slotEnd = typeof slot.endAt === 'string' ? new Date(slot.endAt) : slot.endAt;
      const dateKey = formatDateForMessage(slotStart);
      
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = [];
      }
      slotsByDate[dateKey].push({ startAt: slotStart, endAt: slotEnd, duration: slot.duration });
    });

    // Format each date with its time slots (all visits listed in order)
    const dateStrings = Object.keys(slotsByDate).sort().map(dateKey => {
      const slots = slotsByDate[dateKey];
      const timeStrings = slots.map(slot => {
        const startTime = formatTimeForMessage(slot.startAt);
        const endTime = formatTimeForMessage(slot.endAt);
        return `${startTime} - ${endTime} (${slot.duration} min)`;
      });
      return `${dateKey}\n${timeStrings.join('\n')}`;
    });

    return dateStrings.join('\n\n');
  }

  // For House Sitting and 24/7 Care: include the single start date and start time and the single end date and end time
  if (isHouseSittingService) {
    const startDate = typeof booking.startAt === 'string' ? new Date(booking.startAt) : booking.startAt;
    const endDate = typeof booking.endAt === 'string' ? new Date(booking.endAt) : booking.endAt;
    
    const startDateStr = formatDateForMessage(startDate);
    const startTimeStr = formatTimeForMessage(startDate);
    const endDateStr = formatDateForMessage(endDate);
    const endTimeStr = formatTimeForMessage(endDate);
    
    return `Start: ${startDateStr} at ${startTimeStr}\nEnd: ${endDateStr} at ${endTimeStr}`;
  }

  // Fallback: single date/time (shouldn't normally happen, but handle gracefully)
  const startDate = typeof booking.startAt === 'string' ? new Date(booking.startAt) : booking.startAt;
  const dateStr = formatDateForMessage(startDate);
  const timeStr = formatTimeForMessage(startDate);
  
  return `${dateStr} at ${timeStr}`;
}

/**
 * Extract ALL booking variables for template replacement
 * Pulls every date and time value directly from booking details
 * Includes: start date, end date, visit dates, visit times, overnight times, pickup times, drop off times, etc.
 * 
 * This ensures all template variables are bound to actual booking data with no hardcoded values
 */
export function extractAllBookingVariables(booking: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  service: string;
  startAt: Date | string;
  endAt: Date | string;
  totalPrice?: number;
  pets: Array<{ name?: string; species: string }>;
  timeSlots?: Array<{ startAt: Date | string; endAt: Date | string; duration: number }>;
  sitter?: {
    firstName: string;
    lastName: string;
  } | null;
}): Record<string, string | number> {
  const startDate = typeof booking.startAt === 'string' ? new Date(booking.startAt) : booking.startAt;
  const endDate = typeof booking.endAt === 'string' ? new Date(booking.endAt) : booking.endAt;
  
  // Format all dates and times using shared functions
  const formattedDatesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  
  // Extract all individual date/time components
  const startDateStr = formatDateForMessage(startDate);
  const startTimeStr = formatTimeForMessage(startDate);
  const endDateStr = formatDateForMessage(endDate);
  const endTimeStr = formatTimeForMessage(endDate);
  
  // Extract visit dates and times from timeSlots
  const visitDates: string[] = [];
  const visitTimes: string[] = [];
  const visitStartTimes: string[] = [];
  const visitEndTimes: string[] = [];
  const visitDurations: string[] = [];
  
  if (Array.isArray(booking.timeSlots) && booking.timeSlots.length > 0) {
    booking.timeSlots.forEach(slot => {
      const slotStart = typeof slot.startAt === 'string' ? new Date(slot.startAt) : slot.startAt;
      const slotEnd = typeof slot.endAt === 'string' ? new Date(slot.endAt) : slot.endAt;
      
      visitDates.push(formatDateForMessage(slotStart));
      visitStartTimes.push(formatTimeForMessage(slotStart));
      visitEndTimes.push(formatTimeForMessage(slotEnd));
      visitTimes.push(`${formatTimeForMessage(slotStart)} - ${formatTimeForMessage(slotEnd)}`);
      visitDurations.push(`${slot.duration} min`);
    });
  }
  
  // Format pets
  const petQuantities = formatPetsByQuantity(booking.pets);
  
  // Build comprehensive variables object
  const variables: Record<string, string | number> = {
    // Basic booking info
    bookingId: booking.id,
    firstName: booking.firstName,
    lastName: booking.lastName,
    phone: booking.phone,
    email: booking.email || '',
    service: booking.service,
    
    // Addresses
    address: booking.address || 'TBD',
    pickupAddress: booking.pickupAddress || 'TBD',
    dropoffAddress: booking.dropoffAddress || 'TBD',
    
    // Combined dates/times (formatted as shown in booking details)
    datesTimes: formattedDatesTimes,
    
    // Start date/time components
    startDate: startDateStr,
    startTime: startTimeStr,
    startDateTime: `${startDateStr} at ${startTimeStr}`,
    // Legacy aliases used in many templates
    // {{date}} and {{time}} should always resolve to the booking's start date/time
    date: startDateStr,
    time: startTimeStr,
    
    // End date/time components
    endDate: endDateStr,
    endTime: endTimeStr,
    endDateTime: `${endDateStr} at ${endTimeStr}`,
    
    // Visit-based variables (for services with timeSlots)
    visitDates: visitDates.join(', '),
    visitTimes: visitTimes.join(', '),
    visitStartTimes: visitStartTimes.join(', '),
    visitEndTimes: visitEndTimes.join(', '),
    visitDurations: visitDurations.join(', '),
    visitCount: booking.timeSlots?.length || 0,
    
    // Pet information
    petQuantities,
    petCount: booking.pets.length,
    
    // Pricing
    totalPrice: booking.totalPrice || 0,
    total: booking.totalPrice || 0,
    
    // Sitter information
    sitterFirstName: booking.sitter?.firstName || '',
    sitterLastName: booking.sitter?.lastName || '',
    sitterName: booking.sitter ? `${booking.sitter.firstName} ${booking.sitter.lastName}` : '',
  };
  
  return variables;
}