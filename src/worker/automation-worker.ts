import { prisma } from "@/lib/db";
import { sendClientNightBeforeReminder, sendSitterNightBeforeReminder } from "@/lib/sms-templates";
import { sendSMS } from "@/lib/openphone";
import { getOwnerPhone, getSitterPhone } from "@/lib/phone-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";
import { formatPetsByQuantity, calculatePriceBreakdown } from "@/lib/booking-utils";
import { bookingToCanonical, formatCanonicalBookingForMessage } from "@/lib/booking-format";
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

        // Convert booking to canonical format
        const canonical = bookingToCanonical({
          id: booking.id,
          service: booking.service,
          firstName: booking.firstName,
          lastName: booking.lastName,
          phone: booking.phone,
          email: booking.email,
          notes: booking.notes,
          createdAt: booking.createdAt,
          startAt: booking.startAt,
          endAt: booking.endAt,
          pets: booking.pets,
          timeSlots: booking.timeSlots || [],
        });

        // Format for message template
        const formatted = formatCanonicalBookingForMessage(canonical);
        
        // Send reminder to client
        if (shouldSendToClient) {
          let clientMessageTemplate = await getMessageTemplate("nightBeforeReminder", "client");
          // If template is null (doesn't exist) or empty string, use default
          if (!clientMessageTemplate || clientMessageTemplate.trim() === "") {
            clientMessageTemplate = "🌙 REMINDER!\n\nHi {{firstName}},\n\nJust a friendly reminder about your {{service}} appointment:\n\nDates and times\n{{datesTimes}}\n\nPets\n{{pets}}\n\nWe're excited to care for your pets!";
          }
          const clientMessage = replaceTemplateVariables(clientMessageTemplate, {
            firstName: booking.firstName,
            lastName: booking.lastName,
            service: formatted.service,
            datesTimes: formatted.datesTimes,
            pets: formatted.pets,
            petQuantities, // Keep for backward compatibility
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
                  sitterMessageTemplate = "🌙 REMINDER!\n\nHi {{sitterFirstName}},\n\nYou have a {{service}} appointment:\n\nDates and times\n{{datesTimes}}\n\nClient: {{firstName}} {{lastName}}\nPets\n{{pets}}\nAddress: {{address}}\nYour Earnings: ${{earnings}}\n\nPlease confirm your availability.";
                }
                const sitterMessage = replaceTemplateVariables(sitterMessageTemplate, {
                  sitterFirstName: sitter.firstName,
                  firstName: booking.firstName,
                  lastName: booking.lastName,
                  service: formatted.service,
                  datesTimes: formatted.datesTimes,
                  pets: formatted.pets,
                  petQuantities, // Keep for backward compatibility
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