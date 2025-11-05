import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateBookingPrice } from "@/lib/rates";
import { formatPhoneForAPI } from "@/lib/phone-format";
import { formatPetsByQuantity } from "@/lib/booking-utils";
import { sendOwnerAlert } from "@/lib/sms-templates";
import { getOwnerPhone } from "@/lib/phone-utils";
import { shouldSendToRecipient, getMessageTemplate, replaceTemplateVariables } from "@/lib/automation-utils";
import { sendMessage } from "@/lib/message-utils";

// CORS headers for cross-origin requests (Webflow embedding)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
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
        { status: 400, headers: corsHeaders }
      );
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

    // Create booking with timeSlots
    const booking = await prisma.booking.create({
      data: {
        firstName,
        lastName,
        phone: formatPhoneForAPI(phone),
        email: email || null,
        address: address || null,
        service,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: "pending",
        totalPrice: priceCalculation.total,
        quantity: timeSlotsData.length > 0 ? timeSlotsData.length : 1,
        afterHours: false,
        holiday: priceCalculation.holidayApplied,
        pets: {
          create: pets.map(pet => ({
            name: pet.name,
            species: pet.species,
          })),
        },
        timeSlots: timeSlotsData.length > 0 ? {
          create: timeSlotsData,
        } : undefined,
        special: specialInstructions || additionalNotes || null,
      },
      include: {
        pets: true,
        timeSlots: true,
      },
    });

    // Send SMS confirmation to client (if automation enabled)
    const petQuantities = formatPetsByQuantity(booking.pets);
    const shouldSendToClient = await shouldSendToRecipient("ownerNewBookingAlert", "client");
    
    console.log(`[form/route] Should send to client: ${shouldSendToClient}`);
    
    if (shouldSendToClient) {
      let clientMessageTemplate = await getMessageTemplate("ownerNewBookingAlert", "client");
      if (!clientMessageTemplate) {
        clientMessageTemplate = "🐾 BOOKING RECEIVED!\n\nHi {{firstName}},\n\nWe've received your {{service}} booking request for {{date}} at {{time}}.\n\nPets: {{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nWe'll confirm your booking shortly. Thank you!";
      }
      
      const clientMessage = replaceTemplateVariables(clientMessageTemplate, {
        firstName,
        service,
        date: new Date(startAt).toLocaleDateString(),
        time: new Date(startAt).toLocaleTimeString(),
        petQuantities,
        totalPrice: priceCalculation.total.toFixed(2),
      });
      
      console.log(`[form/route] Sending client message to ${phone}`);
      const clientMessageSent = await sendMessage(phone, clientMessage, booking.id);
      console.log(`[form/route] Client message sent: ${clientMessageSent}`);
    } else {
      console.log(`[form/route] Skipping client message - automation disabled or recipient not configured`);
    }

    // Send alert to owner (if automation enabled)
    const shouldSendToOwner = await shouldSendToRecipient("ownerNewBookingAlert", "owner");
    
    console.log(`[form/route] Should send to owner: ${shouldSendToOwner}`);
    
    if (shouldSendToOwner) {
      const ownerPhone = await getOwnerPhone(undefined, "ownerNewBookingAlert");
      console.log(`[form/route] Owner phone: ${ownerPhone || 'Not configured'}`);
      
      if (ownerPhone) {
        const bookingDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?booking=${booking.id}`;
        
        let ownerMessageTemplate = await getMessageTemplate("ownerNewBookingAlert", "owner");
        if (!ownerMessageTemplate) {
          ownerMessageTemplate = "📱 NEW BOOKING!\n\n{{firstName}} {{lastName}}\n{{phone}}\n\n{{service}} — {{date}} at {{time}}\n{{petQuantities}}\nTotal: $" + "{{totalPrice}}" + "\n\nView details: {{bookingUrl}}";
        }
        
        const ownerMessage = replaceTemplateVariables(ownerMessageTemplate, {
          firstName,
          lastName,
          phone,
          service,
          date: new Date(startAt).toLocaleDateString(),
          time: new Date(startAt).toLocaleTimeString(),
          petQuantities,
          totalPrice: priceCalculation.total.toFixed(2),
          bookingUrl: bookingDetailsUrl,
        });
        
        console.log(`[form/route] Sending owner message to ${ownerPhone}`);
        const ownerMessageSent = await sendMessage(ownerPhone, ownerMessage, booking.id);
        console.log(`[form/route] Owner message sent: ${ownerMessageSent}`);
      } else {
        console.log(`[form/route] Owner phone not configured, using fallback sendOwnerAlert`);
        await sendOwnerAlert(
          firstName,
          lastName,
          phone,
          service,
          new Date(startAt),
          pets
        );
      }
    } else {
      console.log(`[form/route] Skipping owner message - automation disabled or recipient not configured`);
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        totalPrice: priceCalculation.total,
        status: booking.status,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { 
        error: "Failed to create booking", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}