import { NextResponse } from "next/server";

/**
 * OpenPhone integration health check
 * Returns OpenPhone connection status and configuration
 */
export async function GET() {
  try {
    const apiKey = process.env.OPENPHONE_API_KEY;
    const numberId = process.env.OPENPHONE_NUMBER_ID;
    const webhookSecret = process.env.OPENPHONE_WEBHOOK_SECRET;

    const health = {
      ok: true,
      configured: {
        apiKey: !!apiKey,
        numberId: !!numberId,
        webhookSecret: !!webhookSecret,
      },
      phoneNumbers: numberId ? [numberId] : [],
      webhooks: webhookSecret ? ["configured"] : [],
      message: "OpenPhone integration is configured",
    };

    if (!apiKey || !numberId) {
      health.ok = false;
      health.message = "OpenPhone API key or number ID not configured";
    }

    // Optionally test API connection
    if (apiKey && numberId) {
      try {
        const response = await fetch(
          `https://api.openphone.com/v1/phone-numbers/${numberId}`,
          {
            headers: {
              Authorization: apiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          health.phoneNumbers = [data.phoneNumber || numberId];
        } else {
          health.ok = false;
          health.message = `OpenPhone API returned ${response.status}`;
        }
      } catch (error) {
        health.ok = false;
        health.message = `Failed to connect to OpenPhone API: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    }

    const statusCode = health.ok ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}


