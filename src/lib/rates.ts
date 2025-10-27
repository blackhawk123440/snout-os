import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Rate {
  id: string;
  service: string;
  duration: number;
  price: number;
  description: string;
}

export async function getAllRates(): Promise<Rate[]> {
  try {
    const rates = await prisma.rate.findMany({
      orderBy: { duration: 'asc' }
    });
    return rates;
  } catch (error) {
    console.error("Failed to fetch rates:", error);
    return [];
  }
}

export async function calculateBookingPrice(
  service: string,
  startAt: Date,
  endAt: Date,
  petCount: number
): Promise<number> {
  try {
    const rates = await getAllRates();
    const serviceRate = rates.find(rate => rate.service === service);
    
    if (!serviceRate) {
      throw new Error(`No rate found for service: ${service}`);
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    let totalPrice = 0;

    if (service === "Pet Sitting") {
      // Housesitting: $50 base rate per day
      const days = Math.ceil(durationHours / 24);
      totalPrice = days * 50;
      
      // Overtime: $10 per hour after 8 hours per day
      const overtimeHours = Math.max(0, durationHours - (days * 8));
      totalPrice += overtimeHours * 10;
    } else {
      // Other services: use duration-based pricing
      const basePrice = serviceRate.price;
      const durationMultiplier = Math.ceil(durationHours);
      totalPrice = basePrice * durationMultiplier;
    }

    // Pet count multiplier
    if (petCount > 1) {
      totalPrice += (petCount - 1) * 5; // $5 per additional pet
    }

    return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error("Failed to calculate booking price:", error);
    return 0;
  }
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}