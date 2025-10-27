// Tip Link Builder Integration
// Generates personalized tip links using tip.snoutservices.com

/**
 * Generates a personalized tip link with the booking amount pre-filled
 * The link builder at tip.snoutservices.com/link.html reads URL parameters
 * and calculates tip percentages (10%, 15%, 20%, 25%) plus custom option
 */
export function generateTipLink({
  amount,
  sitterAlias,
}: {
  amount: number;
  sitterAlias?: string;
}): string {
  const baseUrl = "https://tip.snoutservices.com/link.html";
  
  // Format amount to 2 decimal places (e.g., 120.50)
  const formattedAmount = amount.toFixed(2);
  
  // Build URL with query parameters
  const params = new URLSearchParams();
  params.set("amount", formattedAmount);
  
  // Include sitter alias if provided (for Stripe Connect tracking)
  if (sitterAlias) {
    params.set("sitter", sitterAlias);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Example usage:
 * 
 * For a $120.50 booking with sitter "jane":
 * generateTipLink({ amount: 120.50, sitterAlias: "jane" })
 * Returns: "https://tip.snoutservices.com/link.html?amount=120.50&sitter=jane"
 * 
 * For a $45.00 booking without sitter assigned:
 * generateTipLink({ amount: 45.00 })
 * Returns: "https://tip.snoutservices.com/link.html?amount=45.00"
 */

