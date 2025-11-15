import { prisma } from "@/lib/db";
import { sendClientNightBeforeReminder, sendSitterNightBeforeReminder } from "@/lib/sms-templates";
import { sendSMS } from "@/lib/openphone";
import { getOwnerPhone, getSitterPhone } from "@/lib/phone-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";
import { formatPetsByQuantity, calculatePriceBreakdown, formatDatesAndTimesForMessage, formatDateForMessage, formatTimeForMessage } from "@/lib/booking-utils";
import { sendMessage } from "@/lib/message-utils";

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

    // Check if automation is enabled
    const shouldSendToClient = await shouldSendToRecipient("nightBeforeReminder", "client");
    const shouldSendToSitter = await shouldSendToRecipient("nightBeforeReminder", "sitter");

    // Send reminders
    for (const booking of tomorrowBookings) {
      try {
        // Skip if email is required but missing
        if (!booking.email) {
          console.warn(`Skipping reminder for booking ${booking.id} - no email`);
          continue;
        }

        // Calculate accurate total
        const breakdown = calculatePriceBreakdown(booking);
        const calculatedTotal = breakdown.total;
        const petQuantities = formatPetsByQuantity(booking.pets);

        // Format dates and times using the shared function that matches booking details
        const formattedDatesTimes = formatDatesAndTimesForMessage({
          service: booking.service,
          startAt: booking.startAt,
          endAt: booking.endAt,
          timeSlots: booking.timeSlots || [],
        });
        
        // Send reminder to client
        if (shouldSendToClient) {
          let clientMessageTemplate = await getMessageTemplate("nightBeforeReminder", "client");
          // If template is null (doesn't exist) or empty string, use default
          if (!clientMessageTemplate || clientMessageTemplate.trim() === "") {
            clientMessageTemplate = "🌙 REMINDER!\n\nHi {{firstName}},\n\nJust a friendly reminder about your {{service}} appointment:\n{{datesTimes}}\n\nPets: {{petQuantities}}\n\nWe're excited to care for your pets!";
          }
          const clientMessage = replaceTemplateVariables(clientMessageTemplate, {
            firstName: booking.firstName,
            lastName: booking.lastName,
            service: booking.service,
            datesTimes: formattedDatesTimes,
            date: formatDateForMessage(booking.startAt),
            time: formatTimeForMessage(booking.startAt),
            petQuantities,
          });
          await sendMessage(booking.phone, clientMessage, booking.id);
        } else {
          // Fallback to hardcoded function if automation disabled
          const bookingForReminder = {
            ...booking,
            email: booking.email,
            totalPrice: calculatedTotal,
            sitter: booking.sitter ? {
              firstName: booking.sitter.firstName,
              lastName: booking.sitter.lastName,
            } : undefined,
          };
          await sendClientNightBeforeReminder(bookingForReminder);
        }
        
        // Send reminder to sitter if assigned
        if (booking.sitter && booking.sitterId) {
          if (shouldSendToSitter) {
            const sitter = await prisma.sitter.findUnique({
              where: { id: booking.sitterId },
            });
            
            if (sitter) {
              const sitterPhone = await getSitterPhone(booking.sitterId, undefined, "nightBeforeReminder");
              
              if (sitterPhone) {
                const commissionPercentage = sitter.commissionPercentage || 80.0;
                const sitterEarnings = (calculatedTotal * commissionPercentage) / 100;
                
                let sitterMessageTemplate = await getMessageTemplate("nightBeforeReminder", "sitter");
                // If template is null (doesn't exist) or empty string, use default
                if (!sitterMessageTemplate || sitterMessageTemplate.trim() === "") {
                  sitterMessageTemplate = "🌙 REMINDER!\n\nHi {{sitterFirstName}},\n\nYou have a {{service}} appointment:\n{{datesTimes}}\n\nClient: {{firstName}} {{lastName}}\nPets: {{petQuantities}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
                }
                const sitterMessage = replaceTemplateVariables(sitterMessageTemplate, {
                  sitterFirstName: sitter.firstName,
                  firstName: booking.firstName,
                  lastName: booking.lastName,
                  service: booking.service,
                  datesTimes: formattedDatesTimes,
                  date: formatDateForMessage(booking.startAt),
                  time: formatTimeForMessage(booking.startAt),
                  petQuantities,
                  address: booking.address || 'TBD',
                  earnings: sitterEarnings.toFixed(2),
                  totalPrice: calculatedTotal, // Pass actual total so earnings can be calculated
                  total: calculatedTotal,
                }, {
                  isSitterMessage: true,
                  sitterCommissionPercentage: commissionPercentage,
                });
                
                await sendMessage(sitterPhone, sitterMessage, booking.id);
              }
            }
          } else {
            // Fallback to hardcoded function if automation disabled
            const bookingForReminder = {
              ...booking,
              email: booking.email,
              totalPrice: calculatedTotal,
              sitter: booking.sitter ? {
                firstName: booking.sitter.firstName,
                lastName: booking.sitter.lastName,
              } : undefined,
            };
            await sendSitterNightBeforeReminder(bookingForReminder, booking.sitterId);
          }
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
// Stores interval IDs for cleanup
let reminderIntervalId: NodeJS.Timeout | null = null;
let dailySummaryIntervalId: NodeJS.Timeout | null = null;
let lastDailySummaryDate: string | null = null;

/**
 * Starts the automation worker with proper interval management
 * Returns cleanup function for graceful shutdown
 */
export async function startAutomationWorker(): Promise<() => void> {
  // Process reminders every hour (at the top of each hour)
  const scheduleNextReminder = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next hour on the hour
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    // Clear existing interval if any
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
    }
    
    // Set initial timeout to align with the hour
    setTimeout(async () => {
      try {
        await processReminders();
      } catch (error) {
        console.error("Reminder processing failed:", error);
      }
      
      // Then set interval for every hour after that
      reminderIntervalId = setInterval(async () => {
        try {
          await processReminders();
        } catch (error) {
          console.error("Reminder processing failed:", error);
        }
      }, 60 * 60 * 1000); // 1 hour
    }, msUntilNextHour);
  };

  // Process daily summary at 9 PM (only once per day)
  const scheduleDailySummary = () => {
    const now = new Date();
    const today = now.toDateString();
    
    // Clear existing interval if any
    if (dailySummaryIntervalId) {
      clearInterval(dailySummaryIntervalId);
    }
    
    // Calculate milliseconds until 9 PM today or tomorrow
    const targetTime = new Date(now);
    targetTime.setHours(21, 0, 0, 0); // 9 PM
    
    if (targetTime <= now) {
      // If 9 PM has passed today, schedule for tomorrow
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntil9PM = targetTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      const currentDate = new Date().toDateString();
      // Only process if we haven't processed today
      if (lastDailySummaryDate !== currentDate) {
        try {
          await processDailySummary();
          lastDailySummaryDate = currentDate;
        } catch (error) {
          console.error("Daily summary processing failed:", error);
        }
      }
      
      // Schedule for next day at 9 PM
      dailySummaryIntervalId = setInterval(async () => {
        const checkDate = new Date().toDateString();
        if (lastDailySummaryDate !== checkDate) {
          try {
            await processDailySummary();
            lastDailySummaryDate = checkDate;
          } catch (error) {
            console.error("Daily summary processing failed:", error);
          }
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntil9PM);
  };

  // Start both schedulers
  scheduleNextReminder();
  scheduleDailySummary();

  // Return cleanup function for graceful shutdown
  return () => {
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
    }
    if (dailySummaryIntervalId) {
      clearInterval(dailySummaryIntervalId);
      dailySummaryIntervalId = null;
    }
  };
}

/**
 * Stops the automation worker and cleans up resources
 */
export function stopAutomationWorker(): void {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
  if (dailySummaryIntervalId) {
    clearInterval(dailySummaryIntervalId);
    dailySummaryIntervalId = null;
  }
}