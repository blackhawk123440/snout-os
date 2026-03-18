/**
 * Transactional email templates for Snout Pet Care.
 * Each function returns { subject, html } for use with sendEmail.
 */

export function bookingConfirmationEmail(params: {
  clientName: string;
  service: string;
  date: string;
  time: string;
  paymentLink?: string;
}): { subject: string; html: string } {
  return {
    subject: `Booking Confirmed: ${params.service} on ${params.date}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #432f21;">Your booking is confirmed!</h2>
        <p>Hi ${params.clientName},</p>
        <p>Your <strong>${params.service}</strong> is scheduled for <strong>${params.date}</strong> at <strong>${params.time}</strong>.</p>
        ${params.paymentLink ? `<p><a href="${params.paymentLink}" style="background: #432f21; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Pay Now</a></p>` : ''}
        <p style="color: #8c7769; font-size: 14px;">— Snout Pet Care</p>
      </div>
    `,
  };
}

export function paymentReceiptEmail(params: {
  clientName: string;
  amount: number;
  service: string;
  date: string;
  receiptUrl?: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Receipt: $${params.amount.toFixed(2)} for ${params.service}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #432f21;">Payment Received</h2>
        <p>Hi ${params.clientName},</p>
        <p>We received your payment of <strong>$${params.amount.toFixed(2)}</strong> for <strong>${params.service}</strong> on ${params.date}.</p>
        ${params.receiptUrl ? `<p><a href="${params.receiptUrl}">View receipt</a></p>` : ''}
        <p style="color: #8c7769; font-size: 14px;">— Snout Pet Care</p>
      </div>
    `,
  };
}

export function visitReportEmail(params: {
  clientName: string;
  petName: string;
  sitterName: string;
  reportUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Visit Report: ${params.petName}'s update from ${params.sitterName}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #432f21;">Visit Report</h2>
        <p>Hi ${params.clientName},</p>
        <p>${params.sitterName} just completed a visit with ${params.petName}! View the full report with photos:</p>
        <p><a href="${params.reportUrl}" style="background: #432f21; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">View Report</a></p>
        <p style="color: #8c7769; font-size: 14px;">— Snout Pet Care</p>
      </div>
    `,
  };
}
