import { NextRequest, NextResponse } from "next/server";
import { formatPhoneForAPI } from "@/lib/phone-format";

/**
 * Get OpenPhone conversation URL for a phone number
 * This endpoint searches for the contact/conversation in OpenPhone and returns the direct conversation URL
 * Format: https://my.openphone.com/inbox/[workspace-id]/c/[contact-id]
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phone");

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENPHONE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenPhone API key not configured" },
        { status: 500 }
      );
    }

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneForAPI(phoneNumber);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Get workspace ID from environment (OpenPhone number ID)
    // This is typically the workspace/phone number ID that identifies your inbox
    const workspaceId = process.env.OPENPHONE_NUMBER_ID;
    
    try {
      // Method 1: Search for contacts by phone number
      // This is the most reliable way to get the contact ID
      const contactsResponse = await fetch(
        `https://api.openphone.com/v1/contacts?phoneNumber=${encodeURIComponent(formattedPhone)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        
        if (contactsData.data && contactsData.data.length > 0) {
          const contact = contactsData.data[0];
          const contactId = contact.id;
          
          // If we have both contactId and workspaceId, construct the direct conversation URL
          if (contactId && workspaceId) {
            const conversationUrl = `https://my.openphone.com/inbox/${workspaceId}/c/${contactId}`;
            return NextResponse.json({ 
              url: conversationUrl,
              contactId,
              workspaceId 
            });
          }
        }
      }

      // Method 2: Search conversations by phone number
      // Sometimes conversations exist before contacts are created
      const conversationsResponse = await fetch(
        `https://api.openphone.com/v1/conversations?phoneNumber=${encodeURIComponent(formattedPhone)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        
        if (conversationsData.data && conversationsData.data.length > 0) {
          const conversation = conversationsData.data[0];
          
          // Extract contact ID from conversation
          // The conversation might have contactId or the id itself might be the contact ID
          let contactId = conversation.contactId || conversation.id;
          
          if (contactId && workspaceId) {
            const conversationUrl = `https://my.openphone.com/inbox/${workspaceId}/c/${contactId}`;
            return NextResponse.json({ 
              url: conversationUrl,
              contactId,
              workspaceId 
            });
          }
        }
      }

      // Method 3: Get recent messages and extract contact ID
      // Sometimes we can find the contact ID from message history
      const messagesResponse = await fetch(
        `https://api.openphone.com/v1/messages?phoneNumber=${encodeURIComponent(formattedPhone)}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        
        if (messagesData.data && messagesData.data.length > 0) {
          const message = messagesData.data[0];
          // Try to extract contact ID from message
          const contactId = message.contactId || message.contact?.id || message.contactId;
          
          if (contactId && workspaceId) {
            const conversationUrl = `https://my.openphone.com/inbox/${workspaceId}/c/${contactId}`;
            return NextResponse.json({ 
              url: conversationUrl,
              contactId,
              workspaceId 
            });
          }
        }
      }

      // Fallback: If we have workspace ID, use search URL within that inbox
      // This should find the conversation even if API doesn't return contact ID
      if (workspaceId) {
        // Try search URL format that should find the conversation in the inbox
        const searchUrl = `https://my.openphone.com/inbox/${workspaceId}/search?query=${encodeURIComponent(formattedPhone)}`;
        
        return NextResponse.json({
          url: searchUrl,
          fallback: true,
          note: "Contact not found via API, using inbox search"
        });
      }

      // Final fallback: return general search URL
      const phoneDigits = formattedPhone.replace(/^\+/, '');
      return NextResponse.json({
        url: `https://my.openphone.com/search?q=${encodeURIComponent(phoneDigits)}`,
        fallback: true,
        note: "Using general search as fallback"
      });

    } catch (apiError) {
      // If API fails, return search URL as fallback
      const phoneDigits = formattedPhone.replace(/^\+/, '');
      return NextResponse.json({
        url: `https://my.openphone.com/search?q=${encodeURIComponent(phoneDigits)}`,
        fallback: true,
        error: apiError instanceof Error ? apiError.message : 'Unknown error'
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get OpenPhone contact URL", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
