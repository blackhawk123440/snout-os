import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL ? "SET" : "NOT SET",
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
    errors: [] as string[],
    checks: {} as any,
  };

  // Check 1: Can we connect to database?
  try {
    await prisma.$connect();
    results.checks.databaseConnection = "✅ Connected";
  } catch (error: any) {
    results.checks.databaseConnection = "❌ Failed";
    results.errors.push(`Database connection: ${error.message}`);
  }

  // Check 2: Can we query User table?
  try {
    const userCount = await (prisma as any).user.count();
    results.checks.userTableAccess = `✅ Found ${userCount} users`;
  } catch (error: any) {
    results.checks.userTableAccess = "❌ Failed";
    results.errors.push(`User table access: ${error.message}`);
  }

  // Check 3: Can we find the specific user?
  try {
    const user = await (prisma as any).user.findUnique({
      where: { email: "leah2maria@gmail.com" },
      select: { 
        id: true, 
        email: true, 
        passwordHash: true,
        // role and orgId may not be in Web's Prisma client - check if they exist
        name: true,
      },
    });
    
    if (user) {
      results.checks.userFound = "✅ User exists";
      results.checks.userDetails = {
        email: user.email,
        name: user.name || "N/A",
        hasPassword: !!user.passwordHash,
        passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
        passwordHashStart: user.passwordHash ? user.passwordHash.substring(0, 20) : null,
      };
    } else {
      results.checks.userFound = "❌ User not found";
      results.errors.push("User leah2maria@gmail.com not found in database");
    }
  } catch (error: any) {
    results.checks.userFound = "❌ Query failed";
    results.errors.push(`User query: ${error.message}`);
  }

  // Check 4: List all users (for debugging)
  try {
    const allUsers = await (prisma as any).user.findMany({
      select: { email: true, name: true },
      take: 5,
    });
    results.checks.allUsers = allUsers;
  } catch (error: any) {
    results.checks.allUsers = `Error: ${error.message}`;
  }

  // Check 5: Test Prisma client structure
  try {
    const userModel = (prisma as any).user;
    results.checks.prismaUserModel = userModel ? "✅ Exists" : "❌ Missing";
  } catch (error: any) {
    results.checks.prismaUserModel = `Error: ${error.message}`;
  }

  return NextResponse.json(results, { 
    status: results.errors.length > 0 ? 500 : 200 
  });
}
