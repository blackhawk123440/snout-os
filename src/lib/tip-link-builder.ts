export function buildTipLink(amount: number, description: string): string {
  const baseUrl = "https://buy.stripe.com/test_tip";
  const params = new URLSearchParams({
    amount: (amount * 100).toString(), // Convert to cents
    description,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

export function buildPaymentLink(
  amount: number,
  description: string,
  customerEmail?: string
): string {
  const baseUrl = "https://buy.stripe.com/test_payment";
  const params = new URLSearchParams({
    amount: (amount * 100).toString(), // Convert to cents
    description,
    ...(customerEmail && { customer_email: customerEmail }),
  });
  
  return `${baseUrl}?${params.toString()}`;
}