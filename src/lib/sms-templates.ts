import { sendMessage } from "@/lib/message-utils";
import { formatPetsByQuantity, formatDatesAndTimesForMessage } from "@/lib/booking-utils";
import { getOwnerPhone, getSitterPhone } from "@/lib/phone-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string | null;
  service: string;
  startAt: Date;
  endAt: Date;
  totalPrice: number;
  pets: Array<{ species: string }>;
  timeSlots?: Array<{ id?: string; startAt: Date; endAt: Date; duration: number }>;
  sitter?: {
    firstName: string;
    lastName: string;
  };
}

export async function sendInitialBookingConfirmation(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  const message = `🐾 BOOKING CONFIRMED!\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is confirmed for:\n${datesTimes}\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
  
  return await sendMessage(booking.phone, message);
}

export async function sendBookingConfirmedToClient(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  const message = `🐾 BOOKING CONFIRMED!\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is confirmed for:\n${datesTimes}\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
  
  return await sendMessage(booking.phone, message);
}

export async function sendClientNightBeforeReminder(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  const message = `🌙 REMINDER!\n\nHi ${booking.firstName},\n\nJust a friendly reminder about your ${booking.service} appointment:\n${datesTimes}\n\nPets: ${petQuantities}\n\nWe're excited to care for your pets!`;
  
  return await sendMessage(booking.phone, message);
}

export async function sendSitterNightBeforeReminder(booking: Booking, sitterId?: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  
  // Calculate sitter earnings if sitterId is provided
  let earningsText = '';
  if (sitterId && booking.totalPrice) {
    const { prisma } = await import("@/lib/db");
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
    });
    if (sitter) {
      const commissionPercentage = sitter.commissionPercentage || 80.0;
      const earnings = (booking.totalPrice * commissionPercentage) / 100;
      earningsText = `\nYour Earnings: $${earnings.toFixed(2)}`;
    }
  }
  const message = `🌙 REMINDER!\n\nHi,\n\nYou have a ${booking.service} appointment:\n${datesTimes}\n\nClient: ${booking.firstName} ${booking.lastName}\nPets: ${petQuantities}\nAddress: ${booking.address}${earningsText}\n\nPlease confirm your availability.`;
  
  let sitterPhone: string | null = null;
  if (sitterId) {
    sitterPhone = await getSitterPhone(sitterId, undefined, "nightBeforeReminder");
  }
  
  if (!sitterPhone) {
    console.error("Sitter phone number not found");
    return false;
  }
  
  return await sendMessage(sitterPhone, message);
}

export async function sendPostVisitThankYou(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 THANK YOU!\n\nHi ${booking.firstName},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their ${booking.service.toLowerCase()}.\n\nPets: ${petQuantities}\n\nWe look forward to caring for your pets again soon!`;
  
  return await sendMessage(booking.phone, message);
}

export async function sendSitterAssignmentNotification(booking: Booking, sitterId?: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  
  // Calculate sitter earnings if sitterId is provided
  let earningsText = '';
  if (sitterId && booking.totalPrice) {
    const { prisma } = await import("@/lib/db");
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
    });
    if (sitter) {
      const commissionPercentage = sitter.commissionPercentage || 80.0;
      const earnings = (booking.totalPrice * commissionPercentage) / 100;
      earningsText = `\nYour Earnings: $${earnings.toFixed(2)}`;
    }
  }
  const message = `👋 SITTER ASSIGNED!\n\nHi,\n\nYou've been assigned to ${booking.firstName} ${booking.lastName}'s ${booking.service} booking:\n${datesTimes}\n\nPets: ${petQuantities}\nAddress: ${booking.address}${earningsText}\n\nPlease confirm your availability.`;
  
  let sitterPhone: string | null = null;
  if (sitterId) {
    sitterPhone = await getSitterPhone(sitterId, undefined, "sitterAssignment");
  }
  
  if (!sitterPhone) {
    console.error("Sitter phone number not found");
    return false;
  }
  
  return await sendMessage(sitterPhone, message);
}

export async function sendReportToClient(booking: Booking, reportContent: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 VISIT REPORT\n\nHi ${booking.firstName},\n\nYour ${booking.service} visit has been completed!\n\nPets: ${petQuantities}\nSitter: ${booking.sitter?.firstName || 'Assigned sitter'}\n\nReport: ${reportContent}\n\nThank you for choosing Snout Services!`;
  
  return await sendMessage(booking.phone, message);
}

export async function sendOwnerAlert(
  firstName: string,
  lastName: string,
  phone: string,
  service: string,
  startAt: Date,
  pets: Array<{ species: string }>
): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(pets);
  const message = `📱 NEW BOOKING ALERT\n\n${firstName} ${lastName} - ${service}\nDate: ${startAt.toLocaleDateString()} at ${startAt.toLocaleTimeString()}\nPets: ${petQuantities}\nPhone: ${phone}`;
  
  const ownerPhone = await getOwnerPhone(undefined, "ownerNewBookingAlert");
  if (!ownerPhone) {
    console.error("Owner phone number not configured");
    return false;
  }
  
  return await sendMessage(ownerPhone, message);
}

export async function sendPaymentReminder(booking: Booking, paymentLink: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const datesTimes = formatDatesAndTimesForMessage({
    service: booking.service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    timeSlots: booking.timeSlots || [],
  });
  const message = `💳 PAYMENT REMINDER\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is ready for payment:\n${datesTimes}\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nPay now: ${paymentLink}`;
  
  return await sendMessage(booking.phone, message);
}