import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

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

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

