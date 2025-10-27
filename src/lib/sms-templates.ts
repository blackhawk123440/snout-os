import { sendSMS } from "@/lib/openphone";
import { formatPetsByQuantity } from "@/lib/booking-utils";

interface Booking {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  service: string;
  startAt: Date;
  endAt: Date;
  totalPrice: number;
  pets: Array<{ species: string }>;
  sitter?: {
    firstName: string;
    lastName: string;
  };
}

export async function sendInitialBookingConfirmation(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 BOOKING CONFIRMED!\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is confirmed for ${booking.startAt.toLocaleDateString()} at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
  
  return await sendSMS(booking.phone, message);
}

export async function sendBookingConfirmedToClient(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 BOOKING CONFIRMED!\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking is confirmed for ${booking.startAt.toLocaleDateString()} at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nWe'll see you soon!`;
  
  return await sendSMS(booking.phone, message);
}

export async function sendClientNightBeforeReminder(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🌙 REMINDER!\n\nHi ${booking.firstName},\n\nJust a friendly reminder about your ${booking.service} appointment tomorrow at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\n\nWe're excited to care for your pets!`;
  
  return await sendSMS(booking.phone, message);
}

export async function sendSitterNightBeforeReminder(booking: Booking, sitterPhone: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🌙 REMINDER!\n\nHi,\n\nYou have a ${booking.service} appointment tomorrow at ${booking.startAt.toLocaleTimeString()}.\n\nClient: ${booking.firstName} ${booking.lastName}\nPets: ${petQuantities}\nAddress: ${booking.address}\n\nPlease confirm your availability.`;
  
  return await sendSMS(sitterPhone, message);
}

export async function sendPostVisitThankYou(booking: Booking): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 THANK YOU!\n\nHi ${booking.firstName},\n\nThank you for choosing Snout Services! We hope your pets enjoyed their ${booking.service.toLowerCase()}.\n\nPets: ${petQuantities}\n\nWe look forward to caring for your pets again soon!`;
  
  return await sendSMS(booking.phone, message);
}

export async function sendSitterAssignmentNotification(booking: Booking, sitterPhone: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `👋 SITTER ASSIGNED!\n\nHi,\n\nYou've been assigned to ${booking.firstName} ${booking.lastName}'s ${booking.service} booking on ${booking.startAt.toLocaleDateString()} at ${booking.startAt.toLocaleTimeString()}.\n\nPets: ${petQuantities}\nAddress: ${booking.address}\n\nPlease confirm your availability.`;
  
  return await sendSMS(sitterPhone, message);
}

export async function sendReportToClient(booking: Booking, reportContent: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `🐾 VISIT REPORT\n\nHi ${booking.firstName},\n\nYour ${booking.service} visit has been completed!\n\nPets: ${petQuantities}\nSitter: ${booking.sitter?.firstName || 'Assigned sitter'}\n\nReport: ${reportContent}\n\nThank you for choosing Snout Services!`;
  
  return await sendSMS(booking.phone, message);
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
  
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone) {
    console.error("Owner phone number not configured");
    return false;
  }
  
  return await sendSMS(ownerPhone, message);
}

export async function sendPaymentReminder(booking: Booking, paymentLink: string): Promise<boolean> {
  const petQuantities = formatPetsByQuantity(booking.pets);
  const message = `💳 PAYMENT REMINDER\n\nHi ${booking.firstName},\n\nYour ${booking.service} booking on ${booking.startAt.toLocaleDateString()} is ready for payment.\n\nPets: ${petQuantities}\nTotal: $${booking.totalPrice.toFixed(2)}\n\nPay now: ${paymentLink}`;
  
  return await sendSMS(booking.phone, message);
}