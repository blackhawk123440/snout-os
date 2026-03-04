import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRedisConnection } from "@/lib/health-checks";
import { getRuntimeEnvName, isRedisRequiredEnv } from "@/lib/runtime-env";

function getVersion(): string {
  return (
    process.env.NEXT_PUBLIC_GIT_SHA ||
    process.env.GIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    "unknown"
  );
}

function getBuildTime(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    process.env.BUILD_TIME ||
    null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET() {
  const version = getVersion();
  let dbStatus: "ok" | "error" = "ok";
  let redisStatus: "ok" | "degraded" | "error" = "ok";
  const envName = getRuntimeEnvName();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  const redisRequired = isRedisRequiredEnv();
  try {
    const redis = await checkRedisConnection();
    redisStatus = redis.connected ? "ok" : redisRequired ? "error" : "degraded";
  } catch {
    redisStatus = redisRequired ? "error" : "degraded";
  }

  const status =
    dbStatus === "error"
      ? "error"
      : redisStatus === "error"
        ? "degraded"
        : "ok";

  const commitSha =
    typeof version === "string" && version !== "unknown"
      ? String(version).slice(0, 7)
      : version;
  const buildTime = getBuildTime();
  return NextResponse.json({
    status,
    db: dbStatus,
    redis: redisStatus,
    version,
    commitSha,
    buildTime: buildTime ?? new Date().toISOString(),
    envName,
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
