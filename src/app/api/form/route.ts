import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateBookingPrice } from "@/lib/rates";
import { formatPhoneForAPI } from "@/lib/phone-format";
import { formatPetsByQuantity, calculatePriceBreakdown } from "@/lib/booking-utils";
import { sendOwnerAlert } from "@/lib/sms-templates";
import { getOwnerPhone } from "@/lib/phone-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";
import { sendMessage } from "@/lib/message-utils";

const parseOrigins = (value?: string | null) => {
  if (!value) return [];
  return value
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
};

const ALLOWED_ORIGINS = [
  "https://snout-form.onrender.com",
  "https://leahs-supercool-site-c731e5.webflow.io",
  ...parseOrigins(process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN),
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.RENDER_EXTERNAL_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[];

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
  };
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
      petNames,
      petSpecies,
      specialInstructions,
      additionalNotes,
      selectedDates,
      dateTimes,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !service || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Validate and normalize service name
    const validServices = ["Dog Walking", "Housesitting", "24/7 Care", "Drop-ins", "Pet Taxi"];
    if (!validServices.includes(service)) {
      return NextResponse.json(
        { error: `Invalid service: ${service}. Valid services are: ${validServices.join(', ')}` },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    // Validate service-specific required fields
    if (service === "Pet Taxi") {
      if (!pickupAddress || !dropoffAddress) {
        return NextResponse.json(
          { error: "Pickup and dropoff addresses are required for Pet Taxi service" },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }
    } else if (service !== "Housesitting" && service !== "24/7 Care") {
      // For non-house sitting services, address is required
      if (!address) {
        return NextResponse.json(
          { error: "Service address is required" },
          { status: 400, headers: buildCorsHeaders(request) }
        );
      }
    }

    // Create pets array - handle cases where petNames might be undefined or not an array
    // Also handle if pets are sent as an array directly
    let pets: Array<{ name: string; species: string }> = [];
    
    if (Array.isArray(body.pets) && body.pets.length > 0) {
      // Pets are sent as an array of objects with name and species
      pets = body.pets.map((pet: any) => ({
        name: pet.name || "Pet",
        species: pet.species || "Dog",
      }));
    } else if (Array.isArray(petNames) && petNames.length > 0) {
      // Pets are sent as separate arrays for names and species
      pets = petNames.map((name: string, index: number) => ({
        name: name || `Pet ${index + 1}`,
        species: (Array.isArray(petSpecies) ? petSpecies[index] : petSpecies) || "Dog",
      }));
    } else {
      pets = [{ name: "Pet 1", species: "Dog" }]; // Default to one pet if none provided
    }

    // Calculate price
    const priceCalculation = await calculateBookingPrice(
      service,
      new Date(startAt),
      new Date(endAt),
      pets.length,
      1, // quantity - will be overridden by timeSlots length if present
      false // afterHours
    );

    // Helper function to convert 12-hour time to 24-hour format
    const convertTo24Hour = (time12h: string): string => {
      if (!time12h) return '09:00:00';
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
      return `${String(hours).padStart(2, '0')}:${minutes}:00`;
    };

    // Helper function to format dates and times for messages
    const formatDatesAndTimes = (
      timeSlots: Array<{ startAt: Date; endAt: Date; duration: number }>,
      selectedDates?: string[],
      dateTimes?: any
    ): string => {
      // If we have timeSlots, use those
      if (timeSlots.length > 0) {
        // Group by date
        const byDate: { [key: string]: Array<{ time: string; duration: number }> } = {};
        timeSlots.forEach(slot => {
          const dateKey = slot.startAt.toISOString().split('T')[0];
          const timeStr = slot.startAt.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push({ time: timeStr, duration: slot.duration });
        });

        // Format grouped dates
        const dateStrings = Object.keys(byDate).sort().map(dateKey => {
          const date = new Date(dateKey);
          const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          const times = byDate[dateKey].map(t => {
            if (t.duration) {
              return `${t.time} (${t.duration}min)`;
            }
            return t.time;
          }).join(', ');
          return `${dateStr} at ${times}`;
        });

        return dateStrings.join('\n');
      }

      // Fallback to selectedDates and dateTimes if available
      if (selectedDates && Array.isArray(selectedDates) && selectedDates.length > 0) {
        let parsedDateTimes: any = dateTimes;
        if (typeof dateTimes === 'string') {
          try {
            parsedDateTimes = JSON.parse(dateTimes);
          } catch {
            parsedDateTimes = {};
          }
        }

        const dateStrings = selectedDates.sort().map(dateStr => {
          const date = new Date(dateStr);
          const dateFormatted = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          });
          const times = parsedDateTimes[dateStr];
          if (Array.isArray(times) && times.length > 0) {
            const timeStrings = times.map((timeEntry: any) => {
              const timeValue = timeEntry?.time || timeEntry?.timeValue || timeEntry;
              const durationValue = timeEntry?.duration || timeEntry?.durationValue;
              if (typeof timeValue === 'string') {
                return durationValue ? `${timeValue} (${durationValue}min)` : timeValue;
              }
              return '';
            }).filter(Boolean).join(', ');
            return `${dateFormatted} at ${timeStrings}`;
          }
          return dateFormatted;
        });

        return dateStrings.join('\n');
      }

      // Final fallback to startAt
      const date = new Date(startAt);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }) + ' at ' + date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };

    // Create timeSlots array from selectedDates and dateTimes
    const timeSlotsData: Array<{ startAt: Date; endAt: Date; duration: number }> = [];
    
    // Handle dateTimes - might be stringified JSON or already an object
    let parsedDateTimes: any = dateTimes;
    if (typeof dateTimes === 'string') {
      try {
        parsedDateTimes = JSON.parse(dateTimes);
      } catch {
        parsedDateTimes = {};
      }
    }
    
    if (selectedDates && Array.isArray(selectedDates) && selectedDates.length > 0 && parsedDateTimes) {
      selectedDates.forEach((dateStr: string) => {
        const times = parsedDateTimes[dateStr];
        if (Array.isArray(times) && times.length > 0) {
          times.forEach((timeEntry: any) => {
            const timeValue = timeEntry?.time || timeEntry?.timeValue || timeEntry;
            const durationValue = timeEntry?.duration || timeEntry?.durationValue || 30;
            
            if (typeof timeValue === 'string' && timeValue.includes(':')) {
              const time24h = convertTo24Hour(timeValue);
              const duration = typeof durationValue === 'number' ? durationValue : 30;
              const startDateTime = new Date(`${dateStr}T${time24h}`);
              const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
              
              timeSlotsData.push({
                startAt: startDateTime,
                endAt: endDateTime,
                duration,
              });
            }
          });
        }
      });
    }

    // For house sitting and 24/7 care, calculate quantity based on number of nights
    // For other services, use timeSlots length
    const isHouseSittingService = service === "Housesitting" || service === "24/7 Care";
    let quantity: number;
    let bookingStartAt = startAt;
    let bookingEndAt = endAt;
    
    if (isHouseSittingService && selectedDates && Array.isArray(selectedDates) && selectedDates.length > 1) {
      // For house sitting, quantity is number of nights (number of days - 1)
      const sortedDates = [...selectedDates].sort();
      quantity = sortedDates.length - 1;
      
      // Update startAt and endAt to use first and last dates
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      
      // Get times from first and last dates
      const firstDateTimes = parsedDateTimes[firstDate] || [];
      const lastDateTimes = parsedDateTimes[lastDate] || [];
      
      const firstTime = firstDateTimes.length > 0 ? firstDateTimes[0] : null;
      const lastTime = lastDateTimes.length > 0 ? lastDateTimes[lastDateTimes.length - 1] : null;
      
      if (firstTime && firstTime.time) {
        const time24h = convertTo24Hour(firstTime.time);
        bookingStartAt = `${firstDate}T${time24h}`;
      } else {
        bookingStartAt = `${firstDate}T09:00:00`;
      }
      
      if (lastTime && lastTime.time) {
        const time24h = convertTo24Hour(lastTime.time);
        bookingEndAt = new Date(`${lastDate}T${time24h}`).toISOString();
      } else {
        bookingEndAt = new Date(`${lastDate}T23:59:59`).toISOString();
      }
    } else {
      // For other services, quantity is number of time slots
      quantity = timeSlotsData.length > 0 ? timeSlotsData.length : 1;
    }
    
    // Calculate price breakdown BEFORE creating booking using the same method as the booking details page
    const breakdown = calculatePriceBreakdown({
      service,
      startAt: new Date(bookingStartAt),
      endAt: new Date(bookingEndAt),
      pets: pets.map(pet => ({ species: pet.species })),
      quantity,
      afterHours: false,
      holiday: priceCalculation.holidayApplied,
      timeSlots: timeSlotsData.map(slot => ({
        startAt: slot.startAt,
        endAt: slot.endAt,
        duration: slot.duration,
      })),
    });

    // Create booking with timeSlots
    const bookingData = {
      firstName,
      lastName,
      phone: formatPhoneForAPI(phone),
      email: email || null,
      address: address || null,
      pickupAddress: pickupAddress || null,
      dropoffAddress: dropoffAddress || null,
      service,
      startAt: new Date(bookingStartAt),
      endAt: new Date(bookingEndAt),
      status: "pending",
      totalPrice: breakdown.total, // Use calculated breakdown total
      quantity,
      afterHours: false,
      holiday: priceCalculation.holidayApplied,
      pets: {
        create: pets.map(pet => ({
          name: pet.name,
          species: pet.species,
        })),
      },
      notes: specialInstructions || additionalNotes || null,
      timeSlots: timeSlotsData.length > 0
        ? {
            create: timeSlotsData.map(slot => ({
              startAt: slot.startAt,
              endAt: slot.endAt,
              duration: slot.duration,
            })),
          }
        : undefined,
    };

    const booking = await prisma.booking.create({
      data: bookingData as Prisma.BookingCreateInput,
      include: {
        pets: true,
        timeSlots: true,
      },
    });

    // Send SMS confirmation to client (if automation enabled)
    const petQuantities = formatPetsByQuantity(booking.pets);
    const shouldSendToClient = await shouldSendToRecipient("ownerNewBookingAlert", "client");
    
    if (shouldSendToClient) {
      const formattedDatesTimes = formatDatesAndTimes(timeSlotsData, selectedDates, parsedDateTimes);
      
      let clientMessageTemplate = await getMessageTemplate("ownerNewBookingAlert", "client");
      if (!clientMessageTemplate) {
        clientMessageTemplate = "🐾 BOOKING RECEIVED!\n\nHi {{firstName}},\n\nWe've received your {{service}} booking request:\n{{datesTimes}}\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll confirm your booking shortly. Thank you!";
      }
      
      const clientMessage = replaceTemplateVariables(clientMessageTemplate, {
        firstName,
        service: booking.service, // Use the actual service name from the booking
        datesTimes: formattedDatesTimes,
        date: new Date(bookingStartAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: new Date(bookingStartAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        petQuantities,
        totalPrice: breakdown.total.toFixed(2),
      });
      
      await sendMessage(phone, clientMessage, booking.id);
    }

    // Send alert to owner (if automation enabled)
    const shouldSendToOwner = await shouldSendToRecipient("ownerNewBookingAlert", "owner");
    
    if (shouldSendToOwner) {
      const ownerPhone = await getOwnerPhone(undefined, "ownerNewBookingAlert");
      
      if (ownerPhone) {
        const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${booking.id}`;
        const formattedDatesTimes = formatDatesAndTimes(timeSlotsData, selectedDates, parsedDateTimes);
        
        let ownerMessageTemplate = await getMessageTemplate("ownerNewBookingAlert", "owner");
        if (!ownerMessageTemplate) {
          ownerMessageTemplate = "📱 NEW BOOKING!\n\n{{firstName}} {{lastName}}\n{{phone}}\n\n{{service}}\n{{datesTimes}}\n{{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView details: {{bookingUrl}}";
        }
        
        const ownerMessage = replaceTemplateVariables(ownerMessageTemplate, {
          firstName,
          lastName,
          phone,
          service: booking.service, // Use the actual service name from the booking
          datesTimes: formattedDatesTimes,
          date: new Date(bookingStartAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          time: new Date(bookingStartAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          petQuantities,
          totalPrice: breakdown.total.toFixed(2),
          bookingUrl: bookingDetailsUrl,
        });
        
        await sendMessage(ownerPhone, ownerMessage, booking.id);
      } else {
        await sendOwnerAlert(
          firstName,
          lastName,
          phone,
          booking.service, // Use the actual service name from the booking
          new Date(bookingStartAt),
          pets
        );
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        totalPrice: breakdown.total,
        status: booking.status,
      },
    }, {
      headers: buildCorsHeaders(request),
    });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { 
        error: "Failed to create booking", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500, headers: buildCorsHeaders(request) }
    );
  }
}