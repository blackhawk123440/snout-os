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
  pets: Pet[];
  sitter?: Sitter;
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

export interface Pet {
  id: string;
  name: string;
  species: string;
  bookingId: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export class BookingAPI {
  async getBookings(): Promise<Booking[]> {
    try {
      const bookings = await prisma.booking.findMany({
        include: {
          pets: true,
          sitter: true,
        },
        orderBy: {
          startAt: "desc",
        },
      });

      return bookings;
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      return [];
    }
  }

  async getBooking(id: string): Promise<Booking | null> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          pets: true,
          sitter: true,
        },
      });

      return booking;
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      return null;
    }
  }

  async createBooking(data: Partial<Booking>): Promise<Booking | null> {
    try {
      const booking = await prisma.booking.create({
        data: {
          firstName: data.firstName!,
          lastName: data.lastName!,
          phone: data.phone!,
          email: data.email || null,
          address: data.address!,
          service: data.service!,
          startAt: data.startAt!,
          endAt: data.endAt!,
          status: data.status || "pending",
          totalPrice: data.totalPrice || 0,
          pets: {
            create: data.pets?.map(pet => ({
              name: pet.name,
              species: pet.species,
            })) || [],
          },
        },
        include: {
          pets: true,
          sitter: true,
        },
      });

      return booking;
    } catch (error) {
      console.error("Failed to create booking:", error);
      return null;
    }
  }

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
    try {
      const booking = await prisma.booking.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone && { phone: data.phone }),
          ...(data.email && { email: data.email }),
          ...(data.address && { address: data.address }),
          ...(data.service && { service: data.service }),
          ...(data.startAt && { startAt: data.startAt }),
          ...(data.endAt && { endAt: data.endAt }),
          ...(data.status && { status: data.status }),
          ...(data.totalPrice && { totalPrice: data.totalPrice }),
          ...(data.sitter && { sitterId: data.sitter.id }),
        },
        include: {
          pets: true,
          sitter: true,
        },
      });

      return booking;
    } catch (error) {
      console.error("Failed to update booking:", error);
      return null;
    }
  }

  async deleteBooking(id: string): Promise<boolean> {
    try {
      await prisma.booking.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error("Failed to delete booking:", error);
      return false;
    }
  }

  async getSitters(): Promise<Sitter[]> {
    try {
      const sitters = await prisma.sitter.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      return sitters;
    } catch (error) {
      console.error("Failed to fetch sitters:", error);
      return [];
    }
  }

  async getSitter(id: string): Promise<Sitter | null> {
    try {
      const sitter = await prisma.sitter.findUnique({
        where: { id },
      });

      return sitter;
    } catch (error) {
      console.error("Failed to fetch sitter:", error);
      return null;
    }
  }

  async createSitter(data: Partial<Sitter>): Promise<Sitter | null> {
    try {
      const sitter = await prisma.sitter.create({
        data: {
          firstName: data.firstName!,
          lastName: data.lastName!,
          phone: data.phone!,
          email: data.email!,
          isActive: data.isActive !== false,
        },
      });

      return sitter;
    } catch (error) {
      console.error("Failed to create sitter:", error);
      return null;
    }
  }

  async updateSitter(id: string, data: Partial<Sitter>): Promise<Sitter | null> {
    try {
      const sitter = await prisma.sitter.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.phone && { phone: data.phone }),
          ...(data.email && { email: data.email }),
          ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
        },
      });

      return sitter;
    } catch (error) {
      console.error("Failed to update sitter:", error);
      return null;
    }
  }

  async deleteSitter(id: string): Promise<boolean> {
    try {
      await prisma.sitter.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error("Failed to delete sitter:", error);
      return false;
    }
  }
}

export const bookingAPI = new BookingAPI();