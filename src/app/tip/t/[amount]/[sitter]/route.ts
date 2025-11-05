import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Alias mapping function - returns both sitter ID (for Stripe) and keeps alias for lookup
async function getSitterInfoFromAlias(alias: string): Promise<{ sitterId: string; sitterAlias: string }> {
  // If it's already a Stripe account ID, use it directly
  if (alias.startsWith('acct_')) {
    return { sitterId: alias, sitterAlias: alias };
  }

  // Try to find sitter by alias format (e.g., "john-smith" or "firstname-lastname")
  const nameParts = alias.split('-');
  if (nameParts.length >= 2) {
    try {
      // SQLite doesn't support case-insensitive mode, so fetch all and filter
      const allSitters = await prisma.sitter.findMany({
        select: { firstName: true, lastName: true, stripeAccountId: true },
      });
      
      const sitter = allSitters.find(s => 
        s.firstName.toLowerCase() === nameParts[0].toLowerCase() &&
        s.lastName.toLowerCase() === nameParts.slice(1).join('-').toLowerCase()
      );
      
      // Use stripeAccountId if found, otherwise keep original alias
      return { 
        sitterId: sitter?.stripeAccountId || alias,
        sitterAlias: alias // Keep original alias for name lookup
      };
    } catch (e) {
      return { sitterId: alias, sitterAlias: alias };
    }
  }
  
  return { sitterId: alias, sitterAlias: alias };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ amount: string; sitter?: string }> }
) {
  try {
    const { amount: rawAmount, sitter: alias } = await params;
    
    const raw = String(rawAmount || '').replace(',', '.').trim();
    let amt = parseFloat(raw);
    if (!isFinite(amt) || amt <= 0) amt = 0;
    
    const sitterAlias = String(alias || '').trim();
    const { sitterId, sitterAlias: aliasForLookup } = await getSitterInfoFromAlias(sitterAlias);
    
    // Pass both the Stripe account ID (for transfers) and the original alias (for name lookup)
    const queryParams = new URLSearchParams({
      service: amt.toFixed(2),
      sitter_id: sitterId,
      sitter_alias: aliasForLookup, // Pass alias separately for name lookup
    }).toString();
    
    return NextResponse.redirect(new URL(`/tip/payment?${queryParams}`, request.url));
  } catch (error) {
    return NextResponse.redirect(new URL('/tip/payment', request.url));
  }
}

