import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with error handling
let prismaClient: PrismaClient;

try {
  prismaClient = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }
} catch (error) {
  console.error("Failed to initialize Prisma Client:", error);
  // Create a minimal client that will fail gracefully
  prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "file:./dev.db",
      },
    },
  });
}

export const prisma = prismaClient;

// Initialize automation engine early
if (typeof window === "undefined") {
  try {
    // Import and initialize automation engine
    import("./automation-init").then(() => {
      // Engine will auto-initialize
    }).catch((error) => {
      // Silently fail if automation engine can't be initialized
      // This allows the app to work even if automation features aren't fully set up
      if (process.env.NODE_ENV === "development") {
        console.warn("Could not initialize automation engine:", error);
      }
    });
  } catch (error) {
    // Silently fail
  }
}