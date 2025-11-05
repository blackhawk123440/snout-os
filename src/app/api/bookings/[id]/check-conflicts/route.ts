import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sitterId } = body;

    if (!sitterId) {
      return NextResponse.json({ conflicts: [] });
    }

    // Get the booking we're trying to assign
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
        sitter: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get all existing bookings for this sitter
    const sitterBookings = await prisma.booking.findMany({
      where: {
        sitterId,
        id: { not: id }, // Exclude the current booking
        status: {
          in: ["pending", "confirmed"],
        },
      },
      include: {
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
        sitter: true,
        pets: true,
      },
    });

    const conflicts: Array<{
      bookingId: string;
      firstName: string;
      lastName: string;
      service: string;
      startAt: Date;
      endAt: Date;
      overlappingSlots: Array<{
        bookingSlot: { startAt: Date; endAt: Date };
        existingSlot: { startAt: Date; endAt: Date };
      }>;
    }> = [];

    // Helper function to check if two date ranges overlap
    const datesOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
      return start1 < end2 && start2 < end1;
    };

    // Check conflicts for bookings with time slots
    if (booking.timeSlots && booking.timeSlots.length > 0) {
      for (const sitterBooking of sitterBookings) {
        if (sitterBooking.timeSlots && sitterBooking.timeSlots.length > 0) {
          // Check each time slot against each sitter booking time slot
          const overlappingSlots: Array<{
            bookingSlot: { startAt: Date; endAt: Date };
            existingSlot: { startAt: Date; endAt: Date };
          }> = [];

          for (const bookingSlot of booking.timeSlots) {
            for (const sitterSlot of sitterBooking.timeSlots) {
              if (datesOverlap(
                new Date(bookingSlot.startAt),
                new Date(bookingSlot.endAt),
                new Date(sitterSlot.startAt),
                new Date(sitterSlot.endAt)
              )) {
                overlappingSlots.push({
                  bookingSlot: {
                    startAt: new Date(bookingSlot.startAt),
                    endAt: new Date(bookingSlot.endAt),
                  },
                  existingSlot: {
                    startAt: new Date(sitterSlot.startAt),
                    endAt: new Date(sitterSlot.endAt),
                  },
                });
              }
            }
          }

          if (overlappingSlots.length > 0) {
            conflicts.push({
              bookingId: sitterBooking.id,
              firstName: sitterBooking.firstName,
              lastName: sitterBooking.lastName,
              service: sitterBooking.service,
              startAt: new Date(sitterBooking.startAt),
              endAt: new Date(sitterBooking.endAt),
              overlappingSlots,
            });
          }
        } else {
          // Sitter booking has no time slots, check against booking's time slots
          for (const bookingSlot of booking.timeSlots) {
            if (datesOverlap(
              new Date(bookingSlot.startAt),
              new Date(bookingSlot.endAt),
              new Date(sitterBooking.startAt),
              new Date(sitterBooking.endAt)
            )) {
              conflicts.push({
                bookingId: sitterBooking.id,
                firstName: sitterBooking.firstName,
                lastName: sitterBooking.lastName,
                service: sitterBooking.service,
                startAt: new Date(sitterBooking.startAt),
                endAt: new Date(sitterBooking.endAt),
                overlappingSlots: [{
                  bookingSlot: {
                    startAt: new Date(bookingSlot.startAt),
                    endAt: new Date(bookingSlot.endAt),
                  },
                  existingSlot: {
                    startAt: new Date(sitterBooking.startAt),
                    endAt: new Date(sitterBooking.endAt),
                  },
                }],
              });
              break; // Only add once per conflict
            }
          }
        }
      }
    } else {
      // Booking has no time slots, check against sitter bookings
      for (const sitterBooking of sitterBookings) {
        if (sitterBooking.timeSlots && sitterBooking.timeSlots.length > 0) {
          // Check each sitter booking time slot against the booking date range
          const overlappingSlots: Array<{
            bookingSlot: { startAt: Date; endAt: Date };
            existingSlot: { startAt: Date; endAt: Date };
          }> = [];

          for (const sitterSlot of sitterBooking.timeSlots) {
            if (datesOverlap(
              new Date(booking.startAt),
              new Date(booking.endAt),
              new Date(sitterSlot.startAt),
              new Date(sitterSlot.endAt)
            )) {
              overlappingSlots.push({
                bookingSlot: {
                  startAt: new Date(booking.startAt),
                  endAt: new Date(booking.endAt),
                },
                existingSlot: {
                  startAt: new Date(sitterSlot.startAt),
                  endAt: new Date(sitterSlot.endAt),
                },
              });
            }
          }

          if (overlappingSlots.length > 0) {
            conflicts.push({
              bookingId: sitterBooking.id,
              firstName: sitterBooking.firstName,
              lastName: sitterBooking.lastName,
              service: sitterBooking.service,
              startAt: new Date(sitterBooking.startAt),
              endAt: new Date(sitterBooking.endAt),
              overlappingSlots,
            });
          }
        } else {
          // Both bookings have no time slots, check date ranges
          if (datesOverlap(
            new Date(booking.startAt),
            new Date(booking.endAt),
            new Date(sitterBooking.startAt),
            new Date(sitterBooking.endAt)
          )) {
            conflicts.push({
              bookingId: sitterBooking.id,
              firstName: sitterBooking.firstName,
              lastName: sitterBooking.lastName,
              service: sitterBooking.service,
              startAt: new Date(sitterBooking.startAt),
              endAt: new Date(sitterBooking.endAt),
              overlappingSlots: [{
                bookingSlot: {
                  startAt: new Date(booking.startAt),
                  endAt: new Date(booking.endAt),
                },
                existingSlot: {
                  startAt: new Date(sitterBooking.startAt),
                  endAt: new Date(sitterBooking.endAt),
                },
              }],
            });
          }
        }
      }
    }

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error("Failed to check conflicts:", error);
    return NextResponse.json({ error: "Failed to check conflicts" }, { status: 500 });
  }
}

