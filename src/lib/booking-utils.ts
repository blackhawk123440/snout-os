import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  isActive: boolean;
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
  booking: { startAt: Date; endAt: Date; sitterId?: string },
  allBookings: Array<{ id: string; startAt: Date; endAt: Date; sitterId?: string }>
): Array<{ id: string; startAt: Date; endAt: Date }> {
  return allBookings
    .filter(b => b.id !== booking.id)
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