import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed test users first (for E2E tests)
  await seedTestUsers();

  // Seed canonical tiers first
  await seedTiers();

  // Clear existing rates
  await prisma.rate.deleteMany();

  // Create standard rates
  const rates = [
    // Dog Walking - Base $20, +$12 for 60min, +$5 per pet, +$5 holiday
    { service: "Dog Walking", duration: 30, baseRate: 20.0 },
    { service: "Dog Walking", duration: 60, baseRate: 32.0 },

    // Drop-ins - Base $20, +$12 for 60min, +$5 per pet, +$5 holiday
    { service: "Drop-ins", duration: 30, baseRate: 20.0 },
    { service: "Drop-ins", duration: 60, baseRate: 32.0 },

    // House Sitting (per day) - Base $80, +$10 per pet, +$15 holiday
    { service: "Housesitting", duration: 1440, baseRate: 80.0 }, // 24 hours in minutes
    
    // 24/7 Care (per day) - Base $120, +$10 per pet, +$15 holiday
    { service: "24/7 Care", duration: 1440, baseRate: 120.0 }, // 24 hours in minutes

    // Pet Taxi (per trip) - Base $20, +$5 per pet, +$5 holiday
    { service: "Pet Taxi", duration: 60, baseRate: 20.0 }, // 1 hour trip
  ];

  for (const rate of rates) {
    await prisma.rate.create({
      data: rate,
    });
    console.log(
      `✅ Created rate: ${rate.service}${
        rate.duration ? ` (${rate.duration} min)` : ""
      } - $${rate.baseRate}`
    );
  }

  console.log("✨ Seed completed successfully");
}

async function seedTestUsers() {
  console.log("🌱 Seeding test users...");

  // Hash passwords
  const ownerPasswordHash = await bcrypt.hash("password", 10);
  const sitterPasswordHash = await bcrypt.hash("password", 10);

  // Create or update owner user
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {
      passwordHash: ownerPasswordHash,
      name: "Test Owner",
    },
    create: {
      email: "owner@example.com",
      name: "Test Owner",
      passwordHash: ownerPasswordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Created/updated owner user: ${owner.email}`);

  // Create or update sitter user
  const sitter = await prisma.user.upsert({
    where: { email: "sitter@example.com" },
    update: {
      passwordHash: sitterPasswordHash,
      name: "Test Sitter",
    },
    create: {
      email: "sitter@example.com",
      name: "Test Sitter",
      passwordHash: sitterPasswordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Created/updated sitter user: ${sitter.email}`);
}

async function seedTiers() {
  console.log("🌱 Seeding canonical sitter tiers...");

  const tiers = [
    {
      name: "Trainee",
      pointTarget: 0,
      minCompletionRate: null,
      minResponseRate: null,
      priorityLevel: 1,
      description: "New sitters. Unproven. Learning your standards.",
      canJoinPools: false,
      canAutoAssign: false,
      canOvernight: false,
      canSameDay: false,
      canHighValue: false,
      canRecurring: false,
      canLeadPool: false,
      canOverrideDecline: false,
      canTakeHouseSits: false,
      canTakeTwentyFourHourCare: false,
      commissionSplit: 65.0,
      badgeColor: "#F5F5F5",
      badgeStyle: "outline",
      progressionRequirements: JSON.stringify({
        bookings: "Complete X bookings with no issues",
        reliability: "No late arrivals or missed visits",
        training: "Complete training checklist",
      }),
      isDefault: true,
    },
    {
      name: "Certified",
      pointTarget: 10,
      minCompletionRate: 95.0,
      minResponseRate: 90.0,
      priorityLevel: 2,
      description: "Sitters who have proven basic reliability.",
      canJoinPools: true,
      canAutoAssign: false,
      canOvernight: false,
      canSameDay: false,
      canHighValue: false,
      canRecurring: true,
      canLeadPool: false,
      canOverrideDecline: false,
      canTakeHouseSits: false,
      canTakeTwentyFourHourCare: false,
      commissionSplit: 75.0,
      badgeColor: "#8B6F47",
      badgeStyle: "outline",
      progressionRequirements: JSON.stringify({
        onTimeRate: "Consistent on-time rate",
        internalScore: "Positive internal score (no client complaints)",
        volume: "Minimum volume over time",
      }),
      isDefault: false,
    },
    {
      name: "Trusted",
      pointTarget: 50,
      minCompletionRate: 98.0,
      minResponseRate: 95.0,
      priorityLevel: 3,
      description: "Sitters you trust to operate independently.",
      canJoinPools: true,
      canAutoAssign: true,
      canOvernight: true,
      canSameDay: true,
      canHighValue: true,
      canRecurring: true,
      canLeadPool: false,
      canOverrideDecline: false,
      canTakeHouseSits: true,
      canTakeTwentyFourHourCare: true,
      commissionSplit: 80.0,
      badgeColor: "#8B6F47",
      badgeStyle: "filled",
      progressionRequirements: JSON.stringify({
        completionRate: "High completion rate",
        issues: "Zero unresolved issues",
        longevity: "Longevity with Snout",
        feedback: "Optional client feedback weighting",
      }),
      isDefault: false,
    },
    {
      name: "Elite",
      pointTarget: 100,
      minCompletionRate: 99.0,
      minResponseRate: 98.0,
      priorityLevel: 4,
      description: "Top performers. Brand protectors.",
      canJoinPools: true,
      canAutoAssign: true,
      canOvernight: true,
      canSameDay: true,
      canHighValue: true,
      canRecurring: true,
      canLeadPool: true,
      canOverrideDecline: true,
      canTakeHouseSits: true,
      canTakeTwentyFourHourCare: true,
      commissionSplit: 85.0,
      badgeColor: "#8B6F47",
      badgeStyle: "accent",
      progressionRequirements: JSON.stringify({
        ownerApproval: "Owner approval required",
        reliability: "Long-term reliability",
        trust: "Business-level trust",
      }),
      isDefault: false,
    },
  ];

  for (const tierData of tiers) {
    const existing = await prisma.sitterTier.findUnique({
      where: { name: tierData.name },
    });

    if (existing) {
      await prisma.sitterTier.update({
        where: { name: tierData.name },
        data: tierData,
      });
      console.log(`✅ Updated tier: ${tierData.name}`);
    } else {
      await prisma.sitterTier.create({
        data: tierData,
      });
      console.log(`✅ Created tier: ${tierData.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

