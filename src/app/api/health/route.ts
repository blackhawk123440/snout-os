import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Health check endpoint
 * Returns status of critical services
 */
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      openphone: "unknown",
    },
  } as {
    status: string;
    timestamp: string;
    services: {
      database: string;
      openphone: string;
    };
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "ok";
  } catch (error) {
    health.services.database = "error";
    health.status = "degraded";
  }

  // Check OpenPhone API key
  if (process.env.OPENPHONE_API_KEY) {
    health.services.openphone = "configured";
  } else {
    health.services.openphone = "not_configured";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}


