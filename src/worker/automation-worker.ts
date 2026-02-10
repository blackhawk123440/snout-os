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

    // Note: Booking model not available in messaging dashboard schema
    // Return empty - reminder processing not available
    return { processed: 0 };
    
    // Original code (commented out - Booking model not available):
    // const tomorrowBookings = await prisma.booking.findMany({ ... });
    // ... (Booking model queries disabled)
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

    // Note: Booking model not available in messaging dashboard schema
    // Return empty stats - daily summary not available
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      revenue: 0,
    };
    
    // Original code (commented out - Booking model not available):
    // const todayBookings = await prisma.booking.findMany({ ... });
    // ... (Booking model queries disabled)
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