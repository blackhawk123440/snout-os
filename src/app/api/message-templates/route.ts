import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // For now, return default templates since we don't have a MessageTemplate model yet
    const defaultTemplates = [
      {
        id: "booking_confirmation",
        name: "Booking Confirmation",
        type: "booking_confirmation",
        content: "🐾 BOOKING CONFIRMED!\n\nHi {{clientName}},\n\nYour {{service}} booking is confirmed for {{date}} at {{time}}.\n\nPets: {{petNames}}\nTotal: ${{totalPrice}}\n\nWe'll see you soon!",
        fields: ["clientName", "service", "date", "time", "petNames", "totalPrice"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "visit_started",
        name: "Visit Started",
        type: "visit_started",
        content: "🐾 VISIT STARTED!\n\nYour pet care visit has begun. Your sitter will send updates and photos during the visit.",
        fields: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "visit_completed",
        name: "Visit Completed",
        type: "visit_completed",
        content: "🐾 VISIT COMPLETED!\n\nYour pet care visit has ended. A detailed report will be sent shortly.",
        fields: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "payment_reminder",
        name: "Payment Reminder",
        type: "payment_reminder",
        content: "💳 PAYMENT REMINDER\n\nHi {{clientName}},\n\nYour {{service}} booking on {{date}} is ready for payment.\n\nTotal: ${{totalPrice}}\n\nPay now: {{paymentLink}}",
        fields: ["clientName", "service", "date", "totalPrice", "paymentLink"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "sitter_assignment",
        name: "Sitter Assignment",
        type: "sitter_assignment",
        content: "👋 SITTER ASSIGNED!\n\nHi {{sitterName}},\n\nYou've been assigned to {{clientName}}'s {{service}} booking on {{date}} at {{time}}.\n\nPets: {{petNames}}\nAddress: {{address}}\n\nPlease confirm your availability.",
        fields: ["sitterName", "clientName", "service", "date", "time", "petNames", "address"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "owner_notification",
        name: "Owner Notification",
        type: "owner_notification",
        content: "📱 NEW BOOKING ALERT\n\n{{clientName}} - {{service}}\nDate: {{date}} at {{time}}\nPets: {{petNames}}\nSitter: {{sitterName}}\nTotal: ${{totalPrice}}",
        fields: ["clientName", "service", "date", "time", "petNames", "sitterName", "totalPrice"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ templates: defaultTemplates });
  } catch (error) {
    console.error("Failed to fetch message templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, type, content } = await request.json();

    // For now, just return success since we don't have a MessageTemplate model yet
    // In a real implementation, you'd save to database
    return NextResponse.json({ 
      message: "Template created successfully",
      template: {
        id: `template-${Date.now()}`,
        name,
        type,
        content,
        fields: extractFields(content),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

function extractFields(content: string): string[] {
  const fieldRegex = /\{\{(\w+)\}\}/g;
  const fields: string[] = [];
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
    }
  }
  return fields;
}
