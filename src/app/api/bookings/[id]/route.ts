import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logBookingStatusChange } from "@/lib/booking-status-history";
import { getCurrentUserSafe } from "@/lib/auth-helpers";
// Phase 3.4: Removed unused booking utility imports - no longer needed after moving to automation queue
import { emitBookingUpdated, emitSitterAssigned, emitSitterUnassigned } from "@/lib/event-emitter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        pets: true,
        sitter: {
          include: {
            currentTier: true,
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Failed to fetch booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      sitterId, 
      firstName, 
      lastName, 
      phone, 
      email, 
      address, 
      pickupAddress,
      dropoffAddress,
      service, 
      startAt, 
      endAt, 
      quantity, 
      afterHours, 
      holiday, 
      totalPrice, 
      paymentStatus, 
      notes,
      timeSlots,
      pets
    } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        pets: true,
        sitter: {
          include: {
            currentTier: true,
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Validate status if provided
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate service if provided
    if (service) {
      const validServices = ["Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"];
      if (!validServices.includes(service)) {
        return NextResponse.json(
          { error: `Invalid service: ${service}. Valid services are: ${validServices.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    if (startAt || endAt) {
      if (startAt) {
        const startDate = new Date(startAt);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format for startAt" },
            { status: 400 }
          );
        }
      }
      if (endAt) {
        const endDate = new Date(endAt);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format for endAt" },
            { status: 400 }
          );
        }
      }
      if (startAt && endAt) {
        const startDate = new Date(startAt);
        const endDate = new Date(endAt);
        if (startDate >= endDate) {
          return NextResponse.json(
            { error: "endAt must be after startAt" },
            { status: 400 }
          );
        }
      }
    }

    // Validate sitterId if provided
    if (sitterId !== undefined && sitterId !== null && sitterId !== "") {
      const sitterExists = await prisma.sitter.findUnique({
        where: { id: sitterId },
        include: {
          currentTier: true,
        },
      });
      if (!sitterExists) {
        return NextResponse.json(
          { error: "Sitter not found" },
          { status: 404 }
        );
      }

      // Phase 5.2: Check tier eligibility for service type
      // Get current booking service to check eligibility
      const currentBooking = await prisma.booking.findUnique({
        where: { id },
        select: { service: true },
      });

      if (currentBooking?.service) {
        const { isSitterEligibleForService } = await import("@/lib/tier-rules");
        const eligibility = await isSitterEligibleForService(sitterId, currentBooking.service);
        
        if (!eligibility.eligible) {
          return NextResponse.json(
            { error: eligibility.reason || "Sitter is not eligible for this service type" },
            { status: 400 }
          );
        }
      }
    }

    // Phase 7.3: Capture previous status for status history logging
    const previousStatusForHistory = booking.status;
    
    // Phase 7.3: Get current user for status history logging (will be used after update)
    const currentUserForHistory = await getCurrentUserSafe(request);

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(sitterId !== undefined && { 
          sitterId: sitterId === "" || sitterId === null ? null : sitterId,
          assignmentType: sitterId && sitterId !== "" ? "direct" : null,
        }),
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(email !== undefined && { email: email ? email.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(pickupAddress !== undefined && { pickupAddress: pickupAddress ? pickupAddress.trim() : null }),
        ...(dropoffAddress !== undefined && { dropoffAddress: dropoffAddress ? dropoffAddress.trim() : null }),
        ...(service && { service: service.trim() }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(quantity !== undefined && quantity >= 0 && { quantity }),
        ...(afterHours !== undefined && { afterHours }),
        ...(holiday !== undefined && { holiday }),
        ...(totalPrice !== undefined && totalPrice >= 0 && { totalPrice }),
        ...(paymentStatus && { paymentStatus }),
        ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
        // If status is being set to confirmed, also set payment status to paid
        ...(status === "confirmed" && { paymentStatus: "paid" }),
      },
      include: {
        pets: true,
        sitter: {
          include: {
            currentTier: true,
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    // Handle timeSlots and pets updates in a transaction for atomicity
    if ((timeSlots && Array.isArray(timeSlots)) || (pets && Array.isArray(pets))) {
      await prisma.$transaction(async (tx) => {
        // Handle timeSlots updates if provided
        if (timeSlots && Array.isArray(timeSlots)) {
          // Validate timeSlots structure
          for (const ts of timeSlots) {
            if (!ts || typeof ts !== 'object') {
              throw new Error("Invalid timeSlot data structure");
            }
            const tsStart = new Date(ts.startAt);
            const tsEnd = new Date(ts.endAt);
            if (isNaN(tsStart.getTime()) || isNaN(tsEnd.getTime())) {
              throw new Error("Invalid date format in timeSlot");
            }
            if (tsStart >= tsEnd) {
              throw new Error("timeSlot endAt must be after startAt");
            }
          }

          // Delete existing timeSlots for this booking
          await tx.timeSlot.deleteMany({
            where: { bookingId: id },
          });

          // Create new timeSlots
          if (timeSlots.length > 0) {
            await tx.timeSlot.createMany({
              data: timeSlots.map((ts: { startAt: string | Date; endAt: string | Date; duration?: number }) => {
                const startDate = new Date(ts.startAt);
                const endDate = new Date(ts.endAt);
                const calculatedDuration = ts.duration || Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                return {
                  bookingId: id,
                  startAt: startDate,
                  endAt: endDate,
                  duration: calculatedDuration > 0 ? calculatedDuration : 30, // Default to 30 min if invalid
                };
              }),
            });
          }

          // Update quantity based on timeSlots count
          await tx.booking.update({
            where: { id },
            data: { quantity: timeSlots.length > 0 ? timeSlots.length : updatedBooking.quantity },
          });
        }

        // Handle pets updates if provided
        if (pets && Array.isArray(pets)) {
          // Validate pets structure
          if (pets.length === 0) {
            throw new Error("At least one pet is required");
          }

          for (const pet of pets) {
            if (!pet || typeof pet !== 'object') {
              throw new Error("Invalid pet data structure");
            }
            if (!pet.species || !pet.species.trim()) {
              throw new Error("Each pet must have a species");
            }
          }

          // Delete existing pets for this booking
          await tx.pet.deleteMany({
            where: { bookingId: id },
          });

          // Create new pets
          await tx.pet.createMany({
            data: pets.map((pet: { name?: string; species: string; notes?: string }) => ({
              bookingId: id,
              name: (pet.name || `Pet ${pet.species}`).trim(),
              species: pet.species.trim(),
              notes: pet.notes ? pet.notes.trim() : null,
            })),
          });
        }
      });
    }

    // Fetch final booking with all relations after all updates
    const finalBooking = await prisma.booking.findUnique({
      where: { id },
      include: {
        pets: true,
        sitter: {
          include: {
            currentTier: true,
          },
        },
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    if (!finalBooking) {
      return NextResponse.json({ error: "Failed to fetch updated booking" }, { status: 500 });
    }

    // Emit events for Automation Center
    const previousSitterId = booking.sitterId;
    
    // Emit booking.updated event
    await emitBookingUpdated(finalBooking, previousStatusForHistory);
    
    // Emit sitter assignment/unassignment events
    if (sitterId !== undefined) {
      if (sitterId && sitterId !== previousSitterId) {
        // Sitter was assigned
        const sitter = await prisma.sitter.findUnique({ where: { id: sitterId } });
        if (sitter) {
          await emitSitterAssigned(finalBooking, sitter);
          
          // Phase 3.4: Enqueue sitter assignment automation jobs
          const { enqueueAutomation } = await import("@/lib/automation-queue");
          
          await enqueueAutomation(
            "sitterAssignment",
            "sitter",
            { bookingId: finalBooking.id, sitterId },
            `sitterAssignment:sitter:${finalBooking.id}:${sitterId}`
          );

          await enqueueAutomation(
            "sitterAssignment",
            "client",
            { bookingId: finalBooking.id, sitterId },
            `sitterAssignment:client:${finalBooking.id}:${sitterId}`
          );
        }
      } else if (!sitterId && previousSitterId) {
        // Sitter was unassigned
        await emitSitterUnassigned(finalBooking, previousSitterId);
      }
    }

    // Phase 7.3: Log status change to status history if status changed
    // Per Master Spec 3.3.3: "Booking status history is immutable and stored."
    if (status && status !== previousStatusForHistory) {
      const changedByUserId = currentUserForHistory?.id || null;
      await logBookingStatusChange(finalBooking.id, status, {
        fromStatus: previousStatusForHistory,
        changedBy: changedByUserId,
        reason: null, // Can be enhanced later to accept reason from request
        metadata: {
          sitterIdChanged: sitterId !== undefined,
          paymentStatusChanged: body.paymentStatus !== undefined,
        },
      });
    }

    // Phase 3.4: Enqueue booking confirmation automations instead of executing directly
    if (status === "confirmed" && previousStatusForHistory !== "confirmed") {
      const { enqueueAutomation } = await import("@/lib/automation-queue");
      
      // Enqueue booking confirmation jobs
      await enqueueAutomation(
        "bookingConfirmation",
        "client",
        { bookingId: finalBooking.id },
        `bookingConfirmation:client:${finalBooking.id}`
      );

      if (finalBooking.sitterId) {
        await enqueueAutomation(
          "bookingConfirmation",
          "sitter",
          { bookingId: finalBooking.id, sitterId: finalBooking.sitterId },
          `bookingConfirmation:sitter:${finalBooking.id}`
        );
      }

      await enqueueAutomation(
        "bookingConfirmation",
        "owner",
        { bookingId: finalBooking.id },
        `bookingConfirmation:owner:${finalBooking.id}`
      );
    }

    // Phase 3.4: Legacy direct execution code removed - now handled by automation queue
    // All booking confirmation and sitter assignment automations are enqueued above

    return NextResponse.json({ booking: finalBooking });
  } catch (error) {
    console.error("Failed to update booking:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}