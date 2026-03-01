import { prisma } from "@/lib/db";
import { enqueueAutomation } from "@/lib/automation-queue";

export async function processReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const tomorrowBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["pending", "confirmed"] },
        startAt: { gte: tomorrow, lt: dayAfter },
      },
      include: { pets: true, timeSlots: true, sitter: true },
    });

    let processed = 0;
    for (const booking of tomorrowBookings) {
      try {
        await enqueueAutomation(
          "nightBeforeReminder",
          "client",
          {
            bookingId: booking.id,
            firstName: booking.firstName,
            lastName: booking.lastName,
            phone: booking.phone,
            service: booking.service,
          },
          `nightBeforeReminder:client:${booking.id}:${tomorrow.toISOString().slice(0, 10)}`
        );
        if (booking.sitterId) {
          await enqueueAutomation(
            "nightBeforeReminder",
            "sitter",
            {
              bookingId: booking.id,
              sitterId: booking.sitterId,
              firstName: booking.firstName,
              lastName: booking.lastName,
              service: booking.service,
            },
            `nightBeforeReminder:sitter:${booking.id}:${tomorrow.toISOString().slice(0, 10)}`
          );
        }
        processed++;
      } catch (err) {
        console.error(`[Reminders] Failed to enqueue for booking ${booking.id}:`, err);
      }
    }
    return { processed };
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

    const todayBookings = await prisma.booking.findMany({
      where: { startAt: { gte: today, lt: tomorrow } },
    });

    const byStatus = todayBookings.reduce(
      (acc, b) => {
        acc[b.status] = (acc[b.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const completed = todayBookings.filter((b) => b.status === "completed");
    const revenue = completed.reduce((s, b) => s + (b.totalPrice || 0), 0);

    return {
      total: todayBookings.length,
      pending: byStatus.pending || 0,
      confirmed: byStatus.confirmed || 0,
      completed: byStatus.completed || 0,
      revenue,
    };
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