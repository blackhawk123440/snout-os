interface OpenPhoneMessage {
  to: string[];
  text: string;
}

interface OpenPhoneResponse {
  id: string;
  status: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const apiKey = process.env.OPENPHONE_API_KEY;
    const numberId = process.env.OPENPHONE_NUMBER_ID;
    
    if (!apiKey || !numberId) {
      console.error("OpenPhone API credentials not configured");
      return false;
    }

    const payload: OpenPhoneMessage = {
      to: [to],
      text: message
    };

    const response = await fetch(`https://api.openphone.com/v1/phone-numbers/${numberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenPhone API error:", errorData);
      return false;
    }

    const data: OpenPhoneResponse = await response.json();
    console.log("SMS sent successfully:", data.id);
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add +1 if it's a 10-digit US number
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Add + if it's an 11-digit number starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return as-is if already formatted
  return phone;
}