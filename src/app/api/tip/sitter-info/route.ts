import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sitterId = searchParams.get('sitter_id');

    if (!sitterId || sitterId === 'unknown') {
      return NextResponse.json({ name: null });
    }

    // Try to find sitter by Stripe account ID
    if (sitterId.startsWith('acct_')) {
      const sitter = await prisma.sitter.findFirst({
        where: { stripeAccountId: sitterId },
        select: { firstName: true, lastName: true },
      });
      if (sitter) {
        return NextResponse.json({ name: `${sitter.firstName} ${sitter.lastName}` });
      }
    }

    // Try to find sitter by alias (firstname-lastname format)
    // SQLite doesn't support mode: 'insensitive', so we'll fetch all and filter in memory
    if (sitterId.includes('-')) {
      const nameParts = sitterId.split('-');
      if (nameParts.length >= 2) {
        // Get all sitters and filter by case-insensitive match
        const allSitters = await prisma.sitter.findMany({
          select: { firstName: true, lastName: true },
        });
        
        const sitter = allSitters.find(s => 
          s.firstName.toLowerCase() === nameParts[0].toLowerCase() &&
          s.lastName.toLowerCase() === nameParts.slice(1).join('-').toLowerCase()
        );
        
        if (sitter) {
          return NextResponse.json({ name: `${sitter.firstName} ${sitter.lastName}` });
        }
      }
    }

    // Try to find by database ID
    const sitter = await prisma.sitter.findUnique({
      where: { id: sitterId },
      select: { firstName: true, lastName: true },
    });
    if (sitter) {
      return NextResponse.json({ name: `${sitter.firstName} ${sitter.lastName}` });
    }

    return NextResponse.json({ name: null });
  } catch (error) {
    console.error("Failed to fetch sitter info:", error);
    return NextResponse.json({ name: null });
  }
}

