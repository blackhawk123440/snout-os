import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/openphone";
import { getOwnerPhone } from "@/lib/phone-utils";

export async function processReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find bookings for tomorrow
    const tomorrowBookings = await prisma.booking.findMany({
      where: {
        startAt: {
          gte: tomorrow,
          lt: dayAfter,
        },
        status: "confirmed",
      },
      include: {
        pets: true,
        sitter: true,
        timeSlots: {
          orderBy: {
            startAt: "asc",
          },
        },
      },
    });

    // Phase 3.5: Enqueue automation jobs instead of executing directly
    // Per Master Spec Line 259: "Move every automation execution to the worker queue"
    const { enqueueAutomation } = await import("../lib/automation-queue");

    // Enqueue reminder automation jobs for each booking
    for (const booking of tomorrowBookings) {
      try {
        // Enqueue client reminder job
        await enqueueAutomation(
          "nightBeforeReminder",
          "client",
          { bookingId: booking.id },
          `nightBeforeReminder:client:${booking.id}:${booking.startAt.toISOString()}`
        );

        // Enqueue sitter reminder job if sitter is assigned
        if (booking.sitterId) {
          await enqueueAutomation(
            "nightBeforeReminder",
            "sitter",
            { bookingId: booking.id, sitterId: booking.sitterId },
            `nightBeforeReminder:sitter:${booking.id}:${booking.sitterId}:${booking.startAt.toISOString()}`
          );
        }
      } catch (error) {
        console.error(`Failed to enqueue reminder automation for booking ${booking.id}:`, error);
      }
    }

    return { processed: tomorrowBookings.length };
  } catch (error) {
    console.error("Failed to process reminders:", error);
    throw error;
  }
}

export async function processDailySummary() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's bookings
    const todayBookings = await prisma.booking.findMany({
      where: {
        startAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        pets: true,
        sitter: true,
      },
    });

    const stats = {
      total: todayBookings.length,
      pending: todayBookings.filter(b => b.status === "pending").length,
      confirmed: todayBookings.filter(b => b.status === "confirmed").length,
      completed: todayBookings.filter(b => b.status === "completed").length,
      revenue: todayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    };

    // Send summary to owner
    const ownerPhone = await getOwnerPhone(undefined, "dailySummary");
    if (ownerPhone) {
      const message = `📊 DAILY SUMMARY\n\nToday's Bookings:\n• Total: ${stats.total}\n• Pending: ${stats.pending}\n• Confirmed: ${stats.confirmed}\n• Completed: ${stats.completed}\n• Revenue: $${stats.revenue.toFixed(2)}`;
      
      await sendSMS(ownerPhone, message);
    }

    return stats;
  } catch (error) {
    console.error("Failed to process daily summary:", error);
    throw error;
  }
}

// Background job processor
export async function startAutomationWorker() {
  // Process reminders every hour
  setInterval(async () => {
    try {
      await processReminders();
    } catch (error) {
      console.error("Reminder processing failed:", error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Process daily summary at 9 PM
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 21) { // 9 PM
      try {
        await processDailySummary();
      } catch (error) {
        console.error("Daily summary processing failed:", error);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
}