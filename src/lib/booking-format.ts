/**
 * Canonical booking payload format and shared formatting utilities
 * All booking data should use this format for consistency across:
 * - Database storage
 * - Dashboard display
 * - Automated messages (SMS/Email)
 */

import { Prisma } from "@prisma/client";

const TIMEZONE = "America/Chicago";

/**
 * Canonical booking payload shape
 * This is the single source of truth for booking data structure
 */
export interface CanonicalBookingPayload {
  id: string;
  serviceType: "dog-walking" | "drop-in" | "pet-sitting" | "pet-taxi";
  pets: {
    dogs: number;
    cats: number;
    farm: number;
    reptiles: number;
    otherDescription?: string;
  };
  selections: Array<{
    dateISO: string; // UTC date for that calendar day (YYYY-MM-DD)
    slots: Array<{
      startISO: string; // UTC start time (ISO string)
      durationMinutes: number;
    }>;
  }>;
  contact: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  createdAtISO: string;
}

/**
 * Formatted slot information for display
 */
export interface FormattedSlot {
  startLocalLabel: string; // e.g., "9:00 AM"
  endLocalLabel: string; // e.g., "9:30 AM"
  durationLabel: string; // e.g., "30 min"
  combined: string; // e.g., "9:00 AM - 9:30 AM (30 min)"
}

/**
 * Grouped booking selections for display
 */
export interface GroupedSelections {
  dateLabel: string; // e.g., "January 7, 2026"
  dateISO: string;
  slots: FormattedSlot[];
}

/**
 * Convert service name to canonical service type
 */
export function normalizeServiceType(service: string): CanonicalBookingPayload["serviceType"] {
  const normalized = service.toLowerCase().trim();
  if (normalized.includes("walk") || normalized.includes("walking")) {
    return "dog-walking";
  }
  if (normalized.includes("drop") || normalized.includes("drop-in") || normalized.includes("drop in")) {
    return "drop-in";
  }
  if (normalized.includes("taxi")) {
    return "pet-taxi";
  }
  // Default to pet-sitting for housesitting, 24/7 care, etc.
  return "pet-sitting";
}

/**
 * Convert pet species to canonical pet counts
 */
export function normalizePets(
  pets: Array<{ species: string; name?: string }>
): CanonicalBookingPayload["pets"] {
  const counts = {
    dogs: 0,
    cats: 0,
    farm: 0,
    reptiles: 0,
    other: [] as string[],
  };

  pets.forEach((pet) => {
    const species = pet.species?.toLowerCase().trim() || "";
    if (species.includes("dog")) {
      counts.dogs++;
    } else if (species.includes("cat")) {
      counts.cats++;
    } else if (species.includes("farm") || species.includes("horse") || species.includes("cow")) {
      counts.farm++;
    } else if (
      species.includes("reptile") ||
      species.includes("snake") ||
      species.includes("lizard") ||
      species.includes("turtle")
    ) {
      counts.reptiles++;
    } else {
      counts.other.push(pet.species || "Other");
    }
  });

  return {
    dogs: counts.dogs,
    cats: counts.cats,
    farm: counts.farm,
    reptiles: counts.reptiles,
    otherDescription: counts.other.length > 0 ? counts.other.join(", ") : undefined,
  };
}

/**
 * Format a time slot with duration
 * Converts UTC ISO string to America/Chicago timezone
 */
export function formatSlot(slot: {
  startISO: string;
  durationMinutes: number;
}): FormattedSlot {
  const startDate = new Date(slot.startISO);
  
  // Format times in 12-hour format with AM/PM, converted to America/Chicago
  const formatTime = (date: Date) => {
    // Use toLocaleString to convert UTC time to America/Chicago timezone
    const timeStr = date.toLocaleString("en-US", {
      timeZone: TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    // Format: "9:00 AM" or "12:30 PM"
    // Ensure minutes are always 2 digits
    const parts = timeStr.split(" ");
    if (parts.length >= 2) {
      const [time, period] = parts;
      const [hours, minutes] = time.split(":");
      return `${hours}:${String(minutes || "00").padStart(2, "0")} ${period}`;
    }
    return timeStr;
  };

  const startLocalLabel = formatTime(startDate);
  
  // Calculate end time
  const endDate = new Date(startDate.getTime() + slot.durationMinutes * 60000);
  const endLocalLabel = formatTime(endDate);
  
  const durationLabel = `${slot.durationMinutes} min`;
  const combined = `${startLocalLabel} - ${endLocalLabel} (${durationLabel})`;

  return {
    startLocalLabel,
    endLocalLabel,
    durationLabel,
    combined,
  };
}

/**
 * Format date with full month name
 * Returns format like "January 7, 2026"
 * Date should be in YYYY-MM-DD format (UTC calendar day)
 */
export function formatDateLabel(dateISO: string): string {
  // Parse dateISO as YYYY-MM-DD and convert to America/Chicago for display
  // We want to show the calendar date in America/Chicago timezone
  const [year, month, day] = dateISO.split("-").map(Number);
  // Create a date in UTC at noon to avoid timezone boundary issues
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIMEZONE,
  };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get calendar date from ISO datetime string
 * Returns YYYY-MM-DD in UTC
 */
export function getDateISO(datetimeISO: string): string {
  const date = new Date(datetimeISO);
  // Get UTC date components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Group selections by date and format for display
 */
export function groupSelectionsByDate(
  selections: CanonicalBookingPayload["selections"]
): GroupedSelections[] {
  // Group by dateISO and sort
  const grouped = new Map<string, GroupedSelections>();

  selections.forEach((selection) => {
    if (!grouped.has(selection.dateISO)) {
      grouped.set(selection.dateISO, {
        dateLabel: formatDateLabel(selection.dateISO),
        dateISO: selection.dateISO,
        slots: [],
      });
    }

    const group = grouped.get(selection.dateISO)!;
    
    // Add all slots for this date and sort by start time
    selection.slots.forEach((slot) => {
      group.slots.push(formatSlot(slot));
    });
    
    // Sort slots by start time
    group.slots.sort((a, b) => {
      const timeA = parseTimeLabel(a.startLocalLabel);
      const timeB = parseTimeLabel(b.startLocalLabel);
      return timeA - timeB;
    });
  });

  // Convert to array and sort by date
  const result = Array.from(grouped.values());
  result.sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  return result;
}

/**
 * Parse time label to minutes since midnight for sorting
 * e.g., "9:00 AM" -> 540, "12:00 PM" -> 720
 */
function parseTimeLabel(timeLabel: string): number {
  const [time, period] = timeLabel.split(" ");
  const [hours, minutes] = time.split(":").map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === "PM" && hours !== 12) {
    totalMinutes += 12 * 60;
  } else if (period === "AM" && hours === 12) {
    totalMinutes -= 12 * 60;
  }
  return totalMinutes;
}

/**
 * Convert database booking to canonical payload
 */
export function bookingToCanonical(
  booking: {
    id: string;
    service: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    createdAt: Date | string;
    startAt?: Date | string;
    endAt?: Date | string;
    pets: Array<{ species: string; name?: string }>;
    timeSlots?: Array<{
      startAt: Date | string;
      endAt: Date | string;
      duration: number;
    }>;
  }
): CanonicalBookingPayload {
  const serviceType = normalizeServiceType(booking.service);
  const pets = normalizePets(booking.pets);

  // Group timeSlots by date, or use startAt/endAt if no timeSlots
  const selectionsMap = new Map<
    string,
    Array<{ startISO: string; durationMinutes: number }>
  >();

  if (booking.timeSlots && booking.timeSlots.length > 0) {
    // Use timeSlots if available
    booking.timeSlots.forEach((slot) => {
      const startDate = typeof slot.startAt === "string" ? new Date(slot.startAt) : slot.startAt;
      const dateISO = getDateISO(startDate.toISOString());
      const startISO = startDate.toISOString();
      const durationMinutes = slot.duration || 30;

      if (!selectionsMap.has(dateISO)) {
        selectionsMap.set(dateISO, []);
      }

      selectionsMap.get(dateISO)!.push({
        startISO,
        durationMinutes,
      });
    });
  } else if (booking.startAt && booking.endAt) {
    // For bookings without timeSlots (like house sitting), use startAt/endAt
    const startDate = typeof booking.startAt === "string" ? new Date(booking.startAt) : booking.startAt;
    const endDate = typeof booking.endAt === "string" ? new Date(booking.endAt) : booking.endAt;
    const dateISO = getDateISO(startDate.toISOString());
    const startISO = startDate.toISOString();
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    selectionsMap.set(dateISO, [{
      startISO,
      durationMinutes: Math.max(durationMinutes, 30), // Minimum 30 minutes
    }]);
  }

  // Convert to selections array
  const selections = Array.from(selectionsMap.entries()).map(([dateISO, slots]) => ({
    dateISO,
    slots: slots.sort((a, b) => a.startISO.localeCompare(b.startISO)),
  }));

  // Sort selections by date
  selections.sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const createdAtISO =
    typeof booking.createdAt === "string"
      ? new Date(booking.createdAt).toISOString()
      : booking.createdAt.toISOString();

  return {
    id: booking.id,
    serviceType,
    pets,
    selections,
    contact: {
      name: `${booking.firstName} ${booking.lastName}`,
      phone: booking.phone,
      email: booking.email || undefined,
      notes: booking.notes || undefined,
    },
    createdAtISO,
  };
}

/**
 * Format canonical booking for message template
 * Returns formatted string with dates, times, and pets
 */
export function formatCanonicalBookingForMessage(
  payload: CanonicalBookingPayload
): {
  service: string;
  datesTimes: string;
  pets: string;
  notes?: string;
} {
  const serviceLabels: Record<CanonicalBookingPayload["serviceType"], string> = {
    "dog-walking": "Dog walking",
    "drop-in": "Drop-in",
    "pet-sitting": "Pet sitting",
    "pet-taxi": "Pet Taxi",
  };

  const service = serviceLabels[payload.serviceType] || payload.serviceType;

  // Group selections by date
  const grouped = groupSelectionsByDate(payload.selections);

  // Format dates and times
  const dateTimeLines: string[] = [];
  grouped.forEach((group) => {
    dateTimeLines.push(group.dateLabel);
    group.slots.forEach((slot) => {
      dateTimeLines.push(slot.combined);
    });
  });

  const datesTimes = dateTimeLines.join("\n");

  // Format pets
  const petLines: string[] = [];
  if (payload.pets.dogs > 0) petLines.push(`Dogs: ${payload.pets.dogs}`);
  if (payload.pets.cats > 0) petLines.push(`Cats: ${payload.pets.cats}`);
  if (payload.pets.farm > 0) petLines.push(`Farm animals: ${payload.pets.farm}`);
  if (payload.pets.reptiles > 0) petLines.push(`Reptiles: ${payload.pets.reptiles}`);
  if (payload.pets.otherDescription) {
    petLines.push(`Other: ${payload.pets.otherDescription}`);
  }

  const pets = petLines.length > 0 ? petLines.join("\n") : "None";

  return {
    service,
    datesTimes,
    pets,
    notes: payload.contact.notes,
  };
}

/**
 * Validate canonical booking payload
 */
export function validateCanonicalBooking(
  payload: Partial<CanonicalBookingPayload>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.selections || !Array.isArray(payload.selections) || payload.selections.length === 0) {
    errors.push("At least one date must be selected");
  } else {
    payload.selections.forEach((selection, idx) => {
      if (!selection.dateISO) {
        errors.push(`Selection ${idx + 1}: Missing dateISO`);
      }
      if (!selection.slots || !Array.isArray(selection.slots) || selection.slots.length === 0) {
        errors.push(`Selection ${idx + 1}: At least one time slot is required`);
      } else {
        selection.slots.forEach((slot, slotIdx) => {
          if (!slot.startISO) {
            errors.push(`Selection ${idx + 1}, Slot ${slotIdx + 1}: Missing startISO`);
          }
          if (typeof slot.durationMinutes !== "number" || slot.durationMinutes <= 0) {
            errors.push(`Selection ${idx + 1}, Slot ${slotIdx + 1}: Invalid durationMinutes`);
          } else {
            // Validate that end time can be computed
            try {
              const startDate = new Date(slot.startISO);
              const endDate = new Date(startDate.getTime() + slot.durationMinutes * 60000);
              if (isNaN(endDate.getTime())) {
                errors.push(`Selection ${idx + 1}, Slot ${slotIdx + 1}: Cannot compute end time`);
              }
            } catch (e) {
              errors.push(`Selection ${idx + 1}, Slot ${slotIdx + 1}: Invalid startISO format`);
            }
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

