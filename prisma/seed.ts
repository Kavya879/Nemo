import { PrismaClient, Prisma, type Grade } from "@prisma/client";

/**
 * Seed script.
 *
 * 1. Populates the RoutingConfig rules table (every threshold/band/rate/factor).
 * 2. Inserts a rich, catalog-driven demo dataset so every flow is testable:
 *    - OWNED items (the Demo Owner's orders) in varied states:
 *        delivered+returnable · delivered+expired(resellable) · placed(cancellable)
 *    - MARKETPLACE inventory (anonymous second-life listings buyers can shop)
 *    - buyers across categories + distances (for nearby-buyer matching)
 *    - historical returns per category (for the prevention service)
 *
 * Idempotent: upserts by deterministic id and fully resets status on re-run.
 */

const prisma = new PrismaClient();

// Demo geo center — central Bengaluru. Buyers are placed at known distances.
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

  const base = {
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
  };

  const config = await prisma.routingConfig.upsert({
    where: { id: "default" },
    update: base,
    create: { id: "default", ...base },
  });
  console.info(`✔ RoutingConfig seeded (id=${config.id})`);
}

// ── Catalog ─────────────────────────────────────────────────────────────────

type OrderState =
  | { kind: "returnable"; daysAgo: number } // delivered, within 30-day window
  | { kind: "expired" } // delivered >30 days ago → resellable, not returnable
  | { kind: "placed" } // not delivered yet → cancellable
  | { kind: "none" }; // marketplace inventory (no owner order)

interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  brand: string;
  originalPrice: number;
  grade: Grade;
  repairability: number;
  order: OrderState;
  listed?: boolean; // create an ACTIVE marketplace listing
  returns?: string[]; // historical return reasons (prevention)
}

const PRICE_PCT: Record<Grade, number> = { A: 0.85, B: 0.675, C: 0.475, D: 0.175 };
const CATEGORY_ICON: Record<string, string> = {
  Footwear: "👟",
  Electronics: "🎧",
  Apparel: "🧥",
  Home: "🍳",
  Books: "📚",
  Toys: "🧸",
};

const CATALOG: CatalogEntry[] = [
  // ── Owned by Demo Owner — RETURNABLE (within window) ──
  {
    id: "demo-item-sneakers",
    name: "Nimbus Running Shoes",
    category: "Footwear",
    brand: "Nimbus",
    originalPrice: 4500,
    grade: "A",
    repairability: 0.4,
    order: { kind: "returnable", daysAgo: 5 },
    listed: true,
    returns: ["Size too small", "Size too small", "Color not as pictured"],
  },
  {
    id: "demo-item-headphones",
    name: "AcoustaPro Wireless Headphones",
    category: "Electronics",
    brand: "AcoustaPro",
    originalPrice: 8999,
    grade: "B",
    repairability: 0.8,
    order: { kind: "returnable", daysAgo: 12 },
    listed: true,
    returns: ["Defective on arrival"],
  },
  {
    id: "demo-item-blender",
    name: "WhirlMix Kitchen Blender",
    category: "Home",
    brand: "WhirlMix",
    originalPrice: 3500,
    grade: "D",
    repairability: 0.2,
    order: { kind: "returnable", daysAgo: 2 },
  },
  {
    id: "demo-item-tshirt",
    name: "CottonComfort Crew T-Shirt",
    category: "Apparel",
    brand: "CottonComfort",
    originalPrice: 1200,
    grade: "B",
    repairability: 0.2,
    order: { kind: "returnable", daysAgo: 3 },
    returns: ["Size too large", "Fabric thinner than expected"],
  },
  {
    id: "demo-item-monitor",
    name: "PixelView 27\" Monitor",
    category: "Electronics",
    brand: "PixelView",
    originalPrice: 18000,
    grade: "C",
    repairability: 0.6,
    order: { kind: "returnable", daysAgo: 8 },
  },

  // ── Owned — EXPIRED window → resellable (#18) ──
  {
    id: "demo-item-jacket",
    name: "TrailGuard Winter Jacket",
    category: "Apparel",
    brand: "TrailGuard",
    originalPrice: 6000,
    grade: "C",
    repairability: 0.6,
    order: { kind: "expired" },
    returns: ["Size too large"],
  },
  {
    id: "demo-item-tablet",
    name: "Lumen 10 Tablet",
    category: "Electronics",
    brand: "Lumen",
    originalPrice: 15000,
    grade: "B",
    repairability: 0.7,
    order: { kind: "expired" },
  },
  {
    id: "demo-item-lamp",
    name: "GlowLite Desk Lamp",
    category: "Home",
    brand: "GlowLite",
    originalPrice: 900,
    grade: "C",
    repairability: 0.3,
    order: { kind: "expired" },
  },

  // ── Owned — PLACED (not delivered) → cancellable (#22) ──
  {
    id: "demo-item-earbuds",
    name: "SoundWave Mini Earbuds",
    category: "Electronics",
    brand: "SoundWave",
    originalPrice: 2500,
    grade: "A",
    repairability: 0.2,
    order: { kind: "placed" },
  },
  {
    id: "demo-item-blocks",
    name: "BuildBlocks 500-Piece Set",
    category: "Toys",
    brand: "BuildBlocks",
    originalPrice: 2000,
    grade: "A",
    repairability: 0.5,
    order: { kind: "placed" },
  },

  // ── MARKETPLACE inventory (anonymous second-life listings) ──
  {
    id: "mkt-item-jeans",
    name: "DenimCo Slim-Fit Jeans",
    category: "Apparel",
    brand: "DenimCo",
    originalPrice: 3500,
    grade: "A",
    repairability: 0.3,
    order: { kind: "none" },
    listed: true,
  },
  {
    id: "mkt-item-coffee",
    name: "BrewMaster Drip Coffee Maker",
    category: "Home",
    brand: "BrewMaster",
    originalPrice: 5500,
    grade: "B",
    repairability: 0.7,
    order: { kind: "none" },
    listed: true,
  },
  {
    id: "mkt-item-powerbank",
    name: "ChargeMax 20000mAh Power Bank",
    category: "Electronics",
    brand: "ChargeMax",
    originalPrice: 1800,
    grade: "C",
    repairability: 0.4,
    order: { kind: "none" },
    listed: true,
  },
  {
    id: "mkt-item-book",
    name: "The Circular Economy (Hardcover)",
    category: "Books",
    brand: "GreenPress",
    originalPrice: 800,
    grade: "B",
    repairability: 0.1,
    order: { kind: "none" },
    listed: true,
  },
  {
    id: "mkt-item-boots",
    name: "Summit Leather Hiking Boots",
    category: "Footwear",
    brand: "Summit",
    originalPrice: 7000,
    grade: "B",
    repairability: 0.6,
    order: { kind: "none" },
    listed: true,
  },
  {
    id: "mkt-item-kettle",
    name: "HeatWell Electric Kettle",
    category: "Home",
    brand: "HeatWell",
    originalPrice: 2200,
    grade: "A",
    repairability: 0.5,
    order: { kind: "none" },
    listed: true,
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedItems() {
  for (const e of CATALOG) {
    const data = {
      name: e.name,
      category: e.category,
      brand: e.brand,
      originalPrice: e.originalPrice,
      currentGrade: e.grade,
      status: "GRADED" as const,
      repairability: e.repairability,
    };
    await prisma.item.upsert({
      where: { id: e.id },
      update: { currentGrade: e.grade, status: "GRADED", repairability: e.repairability },
      create: { id: e.id, ...data },
    });
  }
  console.info(`✔ ${CATALOG.length} demo items seeded`);
}

async function seedOrders() {
  let count = 0;
  for (const e of CATALOG) {
    if (e.order.kind === "none") continue;
    const orderId = `order-${e.id}`;
    const orderedAt =
      e.order.kind === "returnable"
        ? daysAgo(e.order.daysAgo + 3)
        : e.order.kind === "expired"
          ? daysAgo(48)
          : daysAgo(1); // placed
    const deliveredAt =
      e.order.kind === "returnable"
        ? daysAgo(e.order.daysAgo)
        : e.order.kind === "expired"
          ? daysAgo(45)
          : null; // placed → not delivered
    const status = e.order.kind === "placed" ? "PLACED" : "DELIVERED";

    await prisma.order.upsert({
      where: { id: orderId },
      update: { orderedAt, deliveredAt, status },
      create: {
        id: orderId,
        itemId: e.id,
        userId: "demo-user",
        orderedAt,
        deliveredAt,
        status,
      },
    });
    count++;
  }
  console.info(`✔ ${count} demo orders seeded (returnable / expired / placed mix)`);
}

async function seedListings() {
  let count = 0;
  for (const e of CATALOG) {
    if (!e.listed) continue;
    const pct = PRICE_PCT[e.grade];
    const price = Math.round(e.originalPrice * pct);
    const flaws =
      e.grade === "A"
        ? []
        : [
            {
              type: e.grade === "D" ? "wear" : "cosmetic-wear",
              severity: e.grade === "D" ? "severe" : e.grade === "C" ? "moderate" : "minor",
              location: "general",
            },
          ];
    const healthCard: Prisma.InputJsonValue = {
      verifiedCondition: e.grade,
      confidence: 0.9,
      flaws,
      history: [`AI-graded ${e.grade}`, "ReLoop certified"],
      warranty: e.grade === "D" ? "Sold as-is — no warranty" : "30-day ReLoop guarantee",
    };
    const icon = CATEGORY_ICON[e.category] ?? "📦";
    await prisma.listing.upsert({
      where: { itemId: e.id },
      update: { status: "ACTIVE", price, pricePct: pct },
      create: {
        itemId: e.id,
        title: `Certified Pre-Owned: ${e.name} (Grade ${e.grade}) ${icon}`,
        description: `${e.brand} ${e.name} — ReLoop-certified Grade ${e.grade}. Inspected and verified with a Product Health Card.`,
        price,
        pricePct: pct,
        photoUrl: null,
        status: "ACTIVE",
        healthCard,
      },
    });
    count++;
  }
  console.info(`✔ ${count} marketplace listings seeded`);
}

async function seedReturns() {
  let count = 0;
  for (const e of CATALOG) {
    if (!e.returns) continue;
    let i = 0;
    for (const reason of e.returns) {
      const id = `ret-${e.id}-${i++}`;
      await prisma.return.upsert({
        where: { id },
        update: {},
        create: { id, reason, photos: [], item: { connect: { id: e.id } } },
      });
      count++;
    }
  }
  console.info(`✔ ${count} historical returns seeded (prevention data)`);
}

/** Offsets ~1km per 0.009° lat near the equator; good enough for demo distances. */
function offset(km: number, bearing: "n" | "e") {
  const degPerKm = 0.009;
  return bearing === "n"
    ? { lat: CENTER.lat + km * degPerKm, lng: CENTER.lng }
    : { lat: CENTER.lat, lng: CENTER.lng + km * degPerKm };
}

async function seedBuyers() {
  const buyers: Array<{ id: string; name: string } & ReturnType<typeof offset> & { wishlist: string[] }> = [
    { id: "demo-buyer-1", name: "Aarav (1km N)", ...offset(1, "n"), wishlist: ["Footwear", "Apparel"] },
    { id: "demo-buyer-2", name: "Diya (2km E)", ...offset(2, "e"), wishlist: ["Footwear", "Electronics"] },
    { id: "demo-buyer-3", name: "Kabir (3km N)", ...offset(3, "n"), wishlist: ["Electronics", "Books"] },
    { id: "demo-buyer-4", name: "Meera (4km E)", ...offset(4, "e"), wishlist: ["Home", "Apparel"] },
    { id: "demo-buyer-5", name: "Rohan (1.5km N)", ...offset(1.5, "n"), wishlist: ["Home", "Toys"] },
    { id: "demo-buyer-6", name: "Ananya (4.5km E)", ...offset(4.5, "e"), wishlist: ["Apparel", "Books"] },
    { id: "demo-buyer-7", name: "Vivaan (2.5km N)", ...offset(2.5, "n"), wishlist: ["Electronics", "Home"] },
    { id: "demo-buyer-8", name: "Saanvi (8km E, out of range)", ...offset(8, "e"), wishlist: ["Footwear", "Electronics", "Home"] },
  ];
  for (const b of buyers) {
    const { id, ...rest } = b;
    await prisma.buyer.upsert({ where: { id }, update: { ...rest, verified: true }, create: { id, verified: true, ...rest } });
  }
  console.info(`✔ ${buyers.length} demo buyers seeded`);
}

/**
 * Wipes all demo data for a clean, deterministic dataset (children first to
 * respect foreign keys). RoutingConfig is preserved (it's upserted). This makes
 * the seed authoritative — no leftover test rows accumulate.
 */
async function reset() {
  await prisma.returnEvent.deleteMany();
  await prisma.returnCase.deleteMany();
  await prisma.greenCredit.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.return.deleteMany();
  await prisma.gradeResult.deleteMany();
  await prisma.routingDecision.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.item.deleteMany();
  console.info("✔ Cleared previous demo data");
}

async function main() {
  console.info("Seeding ReLoop database…");
  await reset();
  await seedConfig();
  await seedItems();
  await seedOrders();
  await seedListings();
  await seedReturns();
  await seedBuyers();
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
