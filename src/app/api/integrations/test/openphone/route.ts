import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check if OpenPhone credentials are configured
    const apiKey = process.env.OPENPHONE_API_KEY;
    const numberId = process.env.OPENPHONE_NUMBER_ID;

    if (!apiKey || !numberId) {
      return NextResponse.json({
        working: false,
        status: "not_configured",
        message: "OpenPhone credentials are not configured. Please add OPENPHONE_API_KEY and OPENPHONE_NUMBER_ID to your environment variables.",
      });
    }

    // Test OpenPhone connection by trying to list phone numbers or get account info
    let apiResponse: Response | null = null;
    let testPassed = false;
    
    try {
      // First try listing phone numbers (this is the most reliable endpoint)
      // OpenPhone uses API key directly (not Bearer token)
      apiResponse = await fetch(`https://api.openphone.com/v1/phone-numbers`, {
        method: 'GET',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      // If listing works, use that response
      if (apiResponse.ok) {
        testPassed = true;
      } else if (apiResponse.status === 404 || apiResponse.status === 403) {
        // If listing doesn't work, try getting specific number
        console.log(`Trying specific number endpoint for ${numberId}`);
        apiResponse = await fetch(`https://api.openphone.com/v1/phone-numbers/${numberId}`, {
          method: 'GET',
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json',
          },
        });
        if (apiResponse.ok) {
          testPassed = true;
        }
      }

      if (testPassed && apiResponse && apiResponse.ok) {
        const data = await apiResponse.json();
        
        // Handle both single object and array responses
        let phoneNumber = "N/A";
        if (Array.isArray(data)) {
          // Response is an array of phone numbers
          if (data.length > 0) {
            const firstNumber = data[0];
            phoneNumber = firstNumber.phoneNumber || firstNumber.number || firstNumber.phone_number || firstNumber.id || "N/A";
          }
        } else if (data && typeof data === 'object') {
          // Response is a single object
          phoneNumber = data.phoneNumber || data.number || data.phone_number || data.id || "N/A";
        }
        
        return NextResponse.json({
          working: true,
          status: "working",
          message: "OpenPhone is connected and working correctly! ✅",
          details: {
            apiKeyConfigured: !!apiKey,
            numberIdConfigured: !!numberId,
            phoneNumber: phoneNumber,
          },
        });
      } else {
        // Handle error response
        if (!apiResponse) {
          return NextResponse.json({
            working: false,
            status: "error",
            message: "Failed to connect to OpenPhone API. Network error occurred.",
            details: {
              apiKeyConfigured: !!apiKey,
              numberIdConfigured: !!numberId,
            },
          });
        }
        
        // Read error message from response
        let errorMessage = `HTTP ${apiResponse.status}`;
        let errorDetails: any = {};
        
        // Read response body once
        const contentType = apiResponse.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        try {
          if (isJson) {
            // Try to read JSON error response
            const errorData = await apiResponse.json();
            errorMessage = errorData.message || errorData.error || errorData.error_message || errorData.error?.message || `HTTP ${apiResponse.status}`;
            errorDetails = errorData;
          } else {
            // Try to read as text
            const text = await apiResponse.text();
            errorMessage = text || `HTTP ${apiResponse.status}`;
          }
        } catch (e: any) {
          // If reading fails, just use status code
          console.error("Error reading OpenPhone response:", e);
          errorMessage = `HTTP ${apiResponse.status}`;
        }
        
        // Provide helpful error messages based on status code
        let helpfulMessage = errorMessage;
        if (apiResponse.status === 401) {
          helpfulMessage = "Invalid or expired API key. Please:\n1. Go to OpenPhone Dashboard → Settings → API\n2. Generate a new API key\n3. Make sure you copy the complete key (it should be longer than shown)\n4. Update OPENPHONE_API_KEY in your .env.local file\n5. Restart the server";
        } else if (apiResponse.status === 403) {
          helpfulMessage = "API key doesn't have permission. Check your OpenPhone account permissions.";
        } else if (apiResponse.status === 404) {
          helpfulMessage = "Phone number not found. Check your OPENPHONE_NUMBER_ID.";
        } else if (apiResponse.status === 429) {
          helpfulMessage = "Rate limit exceeded. Please wait before trying again.";
        } else {
          helpfulMessage = `${errorMessage} (HTTP ${apiResponse.status})`;
        }
        
        console.error("OpenPhone API test failed:", {
          status: apiResponse.status,
          errorMessage,
          helpfulMessage,
          errorDetails,
        });
        
        return NextResponse.json({
          working: false,
          status: "error",
          message: `OpenPhone API error: ${helpfulMessage}`,
          details: {
            apiKeyConfigured: !!apiKey,
            numberIdConfigured: !!numberId,
            statusCode: apiResponse.status,
            errorDetails: errorDetails,
          },
        });
      }
    } catch (fetchError: any) {
      console.error("OpenPhone test error:", fetchError);
      return NextResponse.json({
        working: false,
        status: "error",
        message: `Failed to connect to OpenPhone API: ${fetchError.message || "Network error"}. Please check your API key and number ID.`,
        details: {
          apiKeyConfigured: !!apiKey,
          numberIdConfigured: !!numberId,
          error: fetchError.message,
          stack: process.env.NODE_ENV === 'development' ? fetchError.stack : undefined,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      working: false,
      status: "error",
      message: `Failed to test OpenPhone: ${error.message || "Unknown error"}`,
    }, { status: 500 });
  }
}
















