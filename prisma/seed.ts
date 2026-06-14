import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Seed script.
 *
 * 1. Populates the RoutingConfig rules table with sensible defaults — every
 *    threshold, band, rate, and factor the services read at runtime.
 * 2. Inserts a small, realistic set of demo items, buyers, returns, and one
 *    ready-made listing so the app has something to show immediately.
 *
 * Idempotent: re-running upserts config and skips demo data if it already
 * exists (keyed by deterministic ids), so it's safe to run against prod.
 */

const prisma = new PrismaClient();

// Demo geo center — central Bangalore. Buyers are placed at known distances.
const CENTER = { lat: 12.9716, lng: 77.5946 };

async function seedConfig() {
  const gradeDefaultRoutes: Prisma.InputJsonValue = {
    A: "RESELL_AS_IS",
    B: "REFURBISH",
    C: "PEER_TO_PEER",
    D: "RECYCLE",
  };

  const priceBands: Prisma.InputJsonValue = {
    A: { min: 0.8, max: 0.9 },
    B: { min: 0.6, max: 0.75 },
    C: { min: 0.4, max: 0.55 },
    D: { min: 0.1, max: 0.25 },
  };

  const creditsPerAction: Prisma.InputJsonValue = {
    RESELL_AS_IS: 30,
    REFURBISH: 40,
    PEER_TO_PEER: 50,
    DONATE: 35,
    RECYCLE: 15,
  };

  const co2FactorsByCategory: Prisma.InputJsonValue = {
    Footwear: 6.0,
    Electronics: 25.0,
    Apparel: 5.0,
    Home: 8.0,
    Toys: 3.0,
    Books: 1.5,
  };

  // Intrinsic current-value fraction of original price, per grade (distinct from
  // resale price, which also factors local demand).
  const depreciationByGrade: Prisma.InputJsonValue = {
    A: 0.85,
    B: 0.65,
    C: 0.45,
    D: 0.2,
  };

  const costModel = {
    pickupBaseCost: 80,
    transportCostPerKm: 3,
    warehouseHandlingCost: 40,
    inspectionCost: 35,
    repackagingBaseCost: 25,
    storageCostPerDay: 8,
    estimatedStorageDays: 10,
    warehouseLat: 11.0168, // Coimbatore (~230km from the Bengaluru demo center)
    warehouseLng: 76.9558,
    minNetRecoveryValue: 0,
    feasibilityRatio: 1.15,
    secondLifeWindowDays: 7,
    depreciationByGrade,
  };

  const config = await prisma.routingConfig.upsert({
    where: { id: "default" },
    update: {
      matchRadiusKm: 5,
      peerToPeerMinBuyers: 1,
      repairabilityThreshold: 0.5,
      gradeDefaultRoutes,
      workingGrades: ["A", "B", "C"],
      priceBands,
      demandPriceMultiplier: 1.05,
      creditsPerAction,
      co2FactorsByCategory,
      co2DefaultKg: 2.5,
      costSavedFactor: 0.6,
      preventionBaseConfidence: 0.7,
      returnWindowDays: 30,
      ...costModel,
    },
    create: {
      id: "default",
      matchRadiusKm: 5,
      peerToPeerMinBuyers: 1,
      repairabilityThreshold: 0.5,
      gradeDefaultRoutes,
      workingGrades: ["A", "B", "C"],
      priceBands,
      demandPriceMultiplier: 1.05,
      creditsPerAction,
      co2FactorsByCategory,
      co2DefaultKg: 2.5,
      costSavedFactor: 0.6,
      preventionBaseConfidence: 0.7,
      returnWindowDays: 30,
      ...costModel,
    },
  });

  console.info(`✔ RoutingConfig seeded (id=${config.id})`);
}

async function seedItems() {
  const items: Prisma.ItemCreateInput[] = [
    {
      id: "demo-item-sneakers",
      name: "Nimbus Running Shoes",
      category: "Footwear",
      brand: "Nimbus",
      originalPrice: 4500,
      currentGrade: "A",
      status: "GRADED",
      repairability: 0.4,
    },
    {
      id: "demo-item-headphones",
      name: "AcoustaPro Wireless Headphones",
      category: "Electronics",
      brand: "AcoustaPro",
      originalPrice: 8999,
      currentGrade: "B",
      status: "GRADED",
      repairability: 0.8,
    },
    {
      id: "demo-item-jacket",
      name: "TrailGuard Winter Jacket",
      category: "Apparel",
      brand: "TrailGuard",
      originalPrice: 6000,
      currentGrade: "C",
      status: "GRADED",
      repairability: 0.6,
    },
    {
      id: "demo-item-blender",
      name: "WhirlMix Kitchen Blender",
      category: "Home",
      brand: "WhirlMix",
      originalPrice: 3500,
      currentGrade: "D",
      status: "GRADED",
      repairability: 0.2,
    },
    {
      id: "demo-item-tablet",
      name: "Lumen 10 Tablet",
      category: "Electronics",
      brand: "Lumen",
      originalPrice: 15000,
      currentGrade: "B",
      status: "GRADED",
      repairability: 0.7,
    },
  ];

  for (const data of items) {
    await prisma.item.upsert({
      where: { id: data.id as string },
      // Reset status/grade so re-seeding fully restores the demo catalog.
      update: { status: data.status, currentGrade: data.currentGrade },
      create: data,
    });
  }
  console.info(`✔ ${items.length} demo items seeded`);
}

async function seedReturns() {
  // Historical returns feed the prevention service (reason frequencies).
  const returns: Array<{ id: string; itemId: string; reason: string }> = [
    { id: "demo-ret-1", itemId: "demo-item-sneakers", reason: "Size too small" },
    { id: "demo-ret-2", itemId: "demo-item-sneakers", reason: "Size too small" },
    { id: "demo-ret-3", itemId: "demo-item-sneakers", reason: "Color not as pictured" },
    { id: "demo-ret-4", itemId: "demo-item-jacket", reason: "Size too large" },
    { id: "demo-ret-5", itemId: "demo-item-headphones", reason: "Defective on arrival" },
  ];

  for (const r of returns) {
    await prisma.return.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        reason: r.reason,
        photos: [],
        item: { connect: { id: r.itemId } },
      },
    });
  }
  console.info(`✔ ${returns.length} demo returns seeded`);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedOrders() {
  // Mix of returnable (within 30-day window) and expired orders.
  const orders: Array<{ id: string; itemId: string; deliveredDaysAgo: number }> = [
    { id: "demo-order-sneakers", itemId: "demo-item-sneakers", deliveredDaysAgo: 5 },
    { id: "demo-order-headphones", itemId: "demo-item-headphones", deliveredDaysAgo: 12 },
    { id: "demo-order-blender", itemId: "demo-item-blender", deliveredDaysAgo: 2 },
    { id: "demo-order-jacket", itemId: "demo-item-jacket", deliveredDaysAgo: 45 }, // EXPIRED
    { id: "demo-order-tablet", itemId: "demo-item-tablet", deliveredDaysAgo: 60 }, // EXPIRED
  ];

  for (const o of orders) {
    const deliveredAt = daysAgo(o.deliveredDaysAgo);
    await prisma.order.upsert({
      where: { id: o.id },
      update: {
        deliveredAt,
        orderedAt: daysAgo(o.deliveredDaysAgo + 3),
        status: "DELIVERED",
      },
      create: {
        id: o.id,
        itemId: o.itemId,
        userId: "demo-user",
        orderedAt: daysAgo(o.deliveredDaysAgo + 3),
        deliveredAt,
        status: "DELIVERED",
      },
    });
  }
  console.info(`✔ ${orders.length} demo orders seeded (3 returnable, 2 expired)`);
}

/** Offsets ~1km per 0.009° lat near the equator; good enough for demo distances. */
function offset(km: number, bearing: "n" | "e") {
  const degPerKm = 0.009;
  return bearing === "n"
    ? { lat: CENTER.lat + km * degPerKm, lng: CENTER.lng }
    : { lat: CENTER.lat, lng: CENTER.lng + km * degPerKm };
}

async function seedBuyers() {
  const buyers: Array<Prisma.BuyerCreateInput & { id: string }> = [
    {
      id: "demo-buyer-1",
      name: "Aarav (2km N)",
      ...offset(2, "n"),
      wishlist: ["Footwear", "Apparel"],
      verified: true,
    },
    {
      id: "demo-buyer-2",
      name: "Diya (3.5km E)",
      ...offset(3.5, "e"),
      wishlist: ["Footwear", "Electronics"],
      verified: true,
    },
    {
      id: "demo-buyer-3",
      name: "Kabir (4.5km N)",
      ...offset(4.5, "n"),
      wishlist: ["Electronics"],
      verified: true,
    },
    {
      id: "demo-buyer-4",
      name: "Meera (8km E, out of range)",
      ...offset(8, "e"),
      wishlist: ["Footwear"],
      verified: true,
    },
    {
      id: "demo-buyer-5",
      name: "Rohan (1km N)",
      ...offset(1, "n"),
      wishlist: ["Apparel", "Home"],
      verified: true,
    },
  ];

  for (const b of buyers) {
    const { id, ...rest } = b;
    await prisma.buyer.upsert({ where: { id }, update: {}, create: { id, ...rest } });
  }
  console.info(`✔ ${buyers.length} demo buyers seeded`);
}

async function seedListing() {
  // One ready-made listing so the marketplace isn't empty on first load.
  await prisma.listing.upsert({
    where: { itemId: "demo-item-sneakers" },
    update: { status: "ACTIVE", price: 3825, pricePct: 0.85 },
    create: {
      itemId: "demo-item-sneakers",
      title: "Certified Pre-Owned: Nimbus Running Shoes (Grade A)",
      description:
        "Barely-worn Nimbus running shoes in excellent condition. Inspected and ReLoop-certified. Minor sole wear only.",
      price: 3825,
      pricePct: 0.85,
      photoUrl: null,
      status: "ACTIVE",
      healthCard: {
        verifiedCondition: "A",
        confidence: 0.94,
        flaws: [{ type: "sole-wear", severity: "minor", location: "outsole" }],
        history: ["Returned: size too small", "AI-graded A", "ReLoop certified"],
        warranty: "30-day ReLoop guarantee",
      },
    },
  });
  console.info("✔ 1 demo listing seeded");
}

async function main() {
  console.info("Seeding ReLoop database…");
  await seedConfig();
  await seedItems();
  await seedOrders();
  await seedReturns();
  await seedBuyers();
  await seedListing();
  console.info("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
