import { prisma } from "@/lib/db";
import { sendClientNightBeforeReminder, sendSitterNightBeforeReminder } from "@/lib/sms-templates";
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
      },
    });

    // Send reminders
    for (const booking of tomorrowBookings) {
      try {
        // Skip if email is required but missing
        if (!booking.email) {
          console.warn(`Skipping reminder for booking ${booking.id} - no email`);
          continue;
        }

        // Create a booking object with required fields
        const bookingForReminder = {
          ...booking,
          email: booking.email,
          totalPrice: booking.totalPrice || 0,
          sitter: booking.sitter ? {
            firstName: booking.sitter.firstName,
            lastName: booking.sitter.lastName,
          } : undefined,
        };

        // Send reminder to client
        await sendClientNightBeforeReminder(bookingForReminder);
        
        // Send reminder to sitter if assigned
        if (booking.sitter && booking.sitterId) {
          await sendSitterNightBeforeReminder(bookingForReminder, booking.sitterId);
        }
      } catch (error) {
        console.error(`Failed to send reminders for booking ${booking.id}:`, error);
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