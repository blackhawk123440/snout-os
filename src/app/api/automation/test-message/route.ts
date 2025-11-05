import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/message-utils";
import { replaceTemplateVariables } from "@/lib/automation-utils";
import { formatPhoneForAPI, formatPhoneForDisplay, isValidPhoneNumber } from "@/lib/phone-format";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, phoneNumber, recipientType } = body;

    if (!template || !phoneNumber) {
      return NextResponse.json(
        { error: "Template and phone number are required" },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { 
          error: "Invalid phone number format",
          details: "Please enter a valid 10-digit US phone number (with or without country code)"
        },
        { status: 400 }
      );
    }

    // Generate sample data for testing
    const sampleData: Record<string, string | number> = {
      firstName: "John",
      lastName: "Doe",
      phone: "+12562589183",
      email: "john.doe@example.com",
      address: "123 Main St, City, State 12345",
      service: "Dog Walking",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startAt: new Date().toLocaleString(),
      endAt: new Date(Date.now() + 3600000).toLocaleString(),
      petQuantities: "2 dogs, 1 cat",
      pets: "Buddy, Max, Fluffy",
      totalPrice: "75.00",
      price: "75.00",
      sitterFirstName: "Sarah",
      sitterLastName: "Johnson",
      sitterName: "Sarah Johnson",
      bookingUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings/test123`,
      paymentLink: "https://buy.stripe.com/test123",
      tipLink: "https://tip.snoutservices.com/test123",
      quantity: "3",
      duration: "30",
      reportContent: "Visit completed successfully. Pets were fed and walked.",
      bookingsList: "• 9:00 AM - Dog Walking\n• 2:00 PM - Drop-in\n• 5:00 PM - Pet Taxi",
      totalEarnings: "225.00",
    };

    // Replace variables in template
    const message = replaceTemplateVariables(template, sampleData);

    // Send test message (sendMessage will format the phone number internally)
    const sent = await sendMessage(phoneNumber, message);

    // Format for display in response
    const formattedPhoneForDisplay = formatPhoneForDisplay(phoneNumber);
    const formattedPhoneForAPI = formatPhoneForAPI(phoneNumber);

    if (sent) {
      return NextResponse.json({
        success: true,
        message: "Test message sent successfully",
        formattedPhone: formattedPhoneForDisplay,
        formattedPhoneForAPI,
        preview: message,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: "Failed to send test message. Please check your OpenPhone API credentials.",
        formattedPhone: formattedPhoneForDisplay,
        formattedPhoneForAPI,
        preview: message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[test-message] Failed to send test message:", error);
    return NextResponse.json(
      { 
        error: "Failed to send test message",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

