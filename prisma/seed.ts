import {
  PrismaClient,
  Prisma,
  type Grade,
  type ReturnStatus,
  type Disposition,
} from "@prisma/client";

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
    warehouseProximityKm: 50,
    secondLifeWindowDays: 7,
    depreciationByGrade,
    // Return-in-Transit early-sale rules (configurable, not hardcoded in the UI).
    returnTransitArrivalDays: 7,
    returnTransitDiscountTiers: [
      { minDays: 0, pct: 0 },
      { minDays: 4, pct: 0.05 },
      { minDays: 6, pct: 0.1 },
    ] as Prisma.InputJsonValue,
  };

  // Circular Commerce Decision Engine — live-tunable route bands & confidence.
  const decisionEngine = {
    conditionScoreByGrade: { A: 92, B: 80, C: 67, D: 30 } as Prisma.InputJsonValue,
    routeScoreBands: [
      { minScore: 90, route: "RESELL_AS_IS" },
      { minScore: 75, route: "REFURBISH" },
      { minScore: 60, route: "PEER_TO_PEER" },
      { minScore: 40, route: "DONATE" },
      { minScore: 0, route: "RECYCLE" },
    ] as Prisma.InputJsonValue,
    confidenceBandThresholds: { high: 0.8, medium: 0.6 } as Prisma.InputJsonValue,
  };

  const base = {
    matchRadiusKm: 5,
    // Pre-grade product-verification thresholds. Tuned so legitimate returns
    // clear the CLIP/offline gate and reach GRADED (where the Circular Decision
    // Engine takes over), while clear mismatches/high-fraud still escalate.
    // All three are live-tunable in Admin → Config Control.
    verificationMatchThreshold: 0.4,
    fraudRiskThreshold: 0.85,
    minQualityConfidence: 0.3,
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
    ...decisionEngine,
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

// Real, VERIFIED product photos — each URL was downloaded and visually checked
// to actually depict the product (Unsplash direct CDN + one DummyJSON image for
// the blender). Per-SKU images below; category images are the fallback.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&q=70&auto=format&fit=crop`;

const PHOTO = {
  headphones: u("1505740420928-5e560c06d30e"),
  earbuds: u("1606220588913-b3aacb4d2f46"),
  monitor: u("1527443224154-c4a3942d3acf"),
  tablet: u("1544244015-0df4b3ffc6b0"),
  powerbank: u("1609091839311-d5365f9ff1c5"),
  jacket: u("1551028719-00167b16eac5"),
  tshirt: u("1521572163474-6864f9cf17ab"),
  jeans: u("1542272604-787c3835535d"),
  sneakers: u("1542291026-7eec264c27ff"),
  boots: u("1608256246200-53e635b5b65f"),
  coffeemaker: u("1570222094114-d054a817e56b"),
  kettle: u("1594213114663-d94db9b17125"),
  desklamp: u("1507473885765-e6ed057f782c"),
  blocks: u("1587654780291-39c9404d746b"),
  book: u("1544947950-fa07a98d237f"),
  journal: u("1531346878377-a5be20888e57"),
  giftbox: u("1607344645866-009c320b63e0"),
  blender: "https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/1.webp",
};

const CATEGORY_IMAGE: Record<string, string> = {
  Footwear: PHOTO.sneakers,
  Electronics: PHOTO.headphones,
  Apparel: PHOTO.tshirt,
  Home: PHOTO.desklamp,
  Kitchenware: PHOTO.blender,
  Books: PHOTO.book,
  Toys: PHOTO.blocks,
  Furniture: PHOTO.desklamp,
  Beauty: PHOTO.giftbox,
  Sports: PHOTO.sneakers,
  Others: PHOTO.giftbox,
};

// Per-SKU verified photos (each matches the specific product).
const IMAGE_BY_ID: Record<string, string> = {
  "demo-item-sneakers": PHOTO.sneakers,
  "demo-item-headphones": PHOTO.headphones,
  "demo-item-blender": PHOTO.blender,
  "demo-item-tshirt": PHOTO.tshirt,
  "demo-item-monitor": PHOTO.monitor,
  "demo-item-jacket": PHOTO.jacket,
  "demo-item-tablet": PHOTO.tablet,
  "demo-item-lamp": PHOTO.desklamp,
  "demo-item-earbuds": PHOTO.earbuds,
  "demo-item-blocks": PHOTO.blocks,
  "mkt-item-jeans": PHOTO.jeans,
  "mkt-item-coffee": PHOTO.coffeemaker,
  "mkt-item-powerbank": PHOTO.powerbank,
  "mkt-item-book": PHOTO.book,
  "mkt-item-boots": PHOTO.boots,
  "mkt-item-kettle": PHOTO.kettle,
  // Brand-new catalog products
  "new-airbuds-pro": PHOTO.earbuds,
  "new-pixelview-monitor": PHOTO.monitor,
  "new-trailguard-jacket": PHOTO.jacket,
  "new-cotton-tee": PHOTO.tshirt,
  "new-whirlmix-blender": PHOTO.blender,
  "new-glowlite-lamp": PHOTO.desklamp,
  "new-nimbus-runners": PHOTO.sneakers,
  "new-buildblocks-deluxe": PHOTO.blocks,
  "new-paperleaf-journal": PHOTO.journal,
  "new-misc-giftset": PHOTO.giftbox,
};
const imageFor = (id: string, category: string): string =>
  IMAGE_BY_ID[id] ?? CATEGORY_IMAGE[category] ?? PHOTO.giftbox;
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

// Structured specs powering the Compatibility Checker + Ownership insights.
// Real per-SKU attributes; items without an entry fall back to category baselines.
const SPECS_BY_ID: Record<string, Record<string, unknown>> = {
  "demo-item-monitor": {
    dimensions: '27-inch, 62×37×5 cm',
    requirements: "HDMI or USB-C video output",
    compatibleWith: ["laptop", "PC", "HDMI", "USB-C"],
    expectedLifespanMonths: 48,
    maintenanceCostPct: 0.02,
  },
  "mkt-item-powerbank": {
    capacity: "20000mAh",
    requirements: "USB-C or micro-USB device",
    compatibleWith: ["phone", "USB-C", "tablet", "earbuds"],
    expectedLifespanMonths: 30,
    maintenanceCostPct: 0,
  },
  "demo-item-headphones": {
    requirements: "Bluetooth 5.0",
    compatibleWith: ["phone", "Bluetooth", "laptop", "tablet"],
    expectedLifespanMonths: 24,
    maintenanceCostPct: 0,
  },
  "demo-item-earbuds": {
    requirements: "Bluetooth phone or tablet",
    compatibleWith: ["phone", "Bluetooth", "tablet"],
    expectedLifespanMonths: 20,
    maintenanceCostPct: 0,
  },
  "demo-item-tablet": {
    dimensions: "10-inch",
    requirements: "Wi-Fi network",
    compatibleWith: ["Wi-Fi", "USB-C charger"],
    expectedLifespanMonths: 36,
    maintenanceCostPct: 0.02,
  },
  "demo-item-blender": {
    requirements: "220V power outlet",
    capacity: "1.5L",
    powerW: 600,
    expectedLifespanMonths: 36,
    maintenanceCostPct: 0.04,
  },
  "mkt-item-kettle": {
    requirements: "220V power outlet",
    capacity: "1.7L",
    powerW: 1500,
    expectedLifespanMonths: 36,
    maintenanceCostPct: 0.04,
  },
  "mkt-item-coffee": {
    requirements: "220V power outlet + paper filters",
    capacity: "1.2L",
    powerW: 900,
    expectedLifespanMonths: 42,
    maintenanceCostPct: 0.05,
  },
  "demo-item-sneakers": { sizeSystem: "UK 6–11", expectedLifespanMonths: 18, maintenanceCostPct: 0.02 },
  "mkt-item-boots": { sizeSystem: "UK 6–12", expectedLifespanMonths: 36, maintenanceCostPct: 0.03 },
  "demo-item-tshirt": { sizeSystem: "S/M/L/XL", expectedLifespanMonths: 24, maintenanceCostPct: 0.01 },
  "mkt-item-jeans": { sizeSystem: "28–38 waist", expectedLifespanMonths: 36, maintenanceCostPct: 0.01 },
  "demo-item-blocks": { ageRange: "6+", compatibleWith: ["standard building blocks"], expectedLifespanMonths: 72 },
  "mkt-item-book": { format: "Hardcover", expectedLifespanMonths: 120, maintenanceCostPct: 0 },
};

// ── BRAND-NEW catalog (standard Amazon-style inventory with stock) ──────────
// Distinct from the resold Item→Listing flow. Multiple units, decremented at
// checkout. Includes an "Others" category example.
interface BrandNewEntry {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  price: number;
  stock: number;
}

const BRAND_NEW: BrandNewEntry[] = [
  {
    id: "new-airbuds-pro",
    name: "AcoustaPro Air Buds (2024)",
    category: "Electronics",
    brand: "AcoustaPro",
    description: "Active noise-cancelling wireless earbuds with 30-hour battery and USB-C fast charge. Brand new, sealed.",
    price: 5999,
    stock: 25,
  },
  {
    id: "new-pixelview-monitor",
    name: "PixelView 27\" 4K Monitor",
    category: "Electronics",
    brand: "PixelView",
    description: "27-inch 4K UHD IPS display, 144Hz, HDR10. Factory sealed with full manufacturer warranty.",
    price: 22999,
    stock: 8,
  },
  {
    id: "new-trailguard-jacket",
    name: "TrailGuard All-Weather Jacket",
    category: "Apparel",
    brand: "TrailGuard",
    description: "Waterproof, breathable 3-layer shell jacket. New season stock, all sizes available.",
    price: 7499,
    stock: 40,
  },
  {
    id: "new-cotton-tee",
    name: "CottonComfort Organic Crew Tee",
    category: "Apparel",
    brand: "CottonComfort",
    description: "100% organic combed cotton crew-neck t-shirt. Pre-shrunk, ethically made.",
    price: 1299,
    stock: 3,
  },
  {
    id: "new-whirlmix-blender",
    name: "WhirlMix Pro 1200W Blender",
    category: "Home",
    brand: "WhirlMix",
    description: "1200W high-speed blender with 6 stainless blades and 2L BPA-free jar. Brand new.",
    price: 4499,
    stock: 15,
  },
  {
    id: "new-glowlite-lamp",
    name: "GlowLite LED Desk Lamp",
    category: "Home",
    brand: "GlowLite",
    description: "Dimmable LED desk lamp with wireless charging base and 5 colour temperatures.",
    price: 1899,
    stock: 0,
  },
  {
    id: "new-nimbus-runners",
    name: "Nimbus Cloud Runners",
    category: "Footwear",
    brand: "Nimbus",
    description: "Lightweight cushioned running shoes with breathable knit upper. New 2024 colourways.",
    price: 4999,
    stock: 22,
  },
  {
    id: "new-buildblocks-deluxe",
    name: "BuildBlocks Deluxe 1000-Piece Set",
    category: "Toys",
    brand: "BuildBlocks",
    description: "1000-piece creative building set, compatible with all standard blocks. Brand new in box.",
    price: 3499,
    stock: 12,
  },
  {
    id: "new-paperleaf-journal",
    name: "PaperLeaf Hardcover Journal",
    category: "Books",
    brand: "PaperLeaf",
    description: "A5 dotted hardcover journal, 200gsm paper, lay-flat binding. Brand new.",
    price: 899,
    stock: 60,
  },
  {
    id: "new-misc-giftset",
    name: "Artisan Self-Care Gift Set",
    category: "Others",
    brand: "Artisan",
    description: "Curated self-care gift box with candle, soap and bath salts. New, gift-wrapped.",
    price: 1599,
    stock: 7,
  },
];

async function seedProducts() {
  for (const p of BRAND_NEW) {
    const imageUrl = imageFor(p.id, p.category);
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        category: p.category,
        brand: p.brand,
        description: p.description,
        price: p.price,
        stock: p.stock,
        imageUrl,
        active: true,
      },
      create: {
        id: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        description: p.description,
        price: p.price,
        stock: p.stock,
        imageUrl,
        active: true,
      },
    });
  }
  console.info(`✔ ${BRAND_NEW.length} brand-new products seeded`);
}

async function seedItems() {
  for (const e of CATALOG) {
    const imageUrl = imageFor(e.id, e.category);
    const specs = (SPECS_BY_ID[e.id] ?? {}) as Prisma.InputJsonValue;
    const data = {
      name: e.name,
      category: e.category,
      brand: e.brand,
      originalPrice: e.originalPrice,
      imageUrl,
      currentGrade: e.grade,
      status: "GRADED" as const,
      repairability: e.repairability,
      specs,
    };
    await prisma.item.upsert({
      where: { id: e.id },
      update: { currentGrade: e.grade, status: "GRADED", repairability: e.repairability, imageUrl, specs },
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
      history: [`AI-graded ${e.grade}`, "Inspected & verified by Amazon Nemo"],
    };
    const icon = CATEGORY_ICON[e.category] ?? "📦";
    await prisma.listing.upsert({
      where: { itemId: e.id },
      update: { status: "ACTIVE", price, pricePct: pct },
      create: {
        itemId: e.id,
        title: `Certified Pre-Owned: ${e.name} (Grade ${e.grade}) ${icon}`,
        description: `${e.brand} ${e.name} — Amazon Nemo-certified Grade ${e.grade}. Inspected and verified with a Product Health Card.`,
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
  await prisma.review.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.returnEvent.deleteMany();
  await prisma.returnCase.deleteMany();
  await prisma.greenCredit.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.return.deleteMany();
  await prisma.gradeResult.deleteMany();
  await prisma.routingDecision.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.item.deleteMany();
  console.info("✔ Cleared previous demo data");
}

// ── Return-case fleet (populates the Admin Command Center "at scale") ─────────

const DEP: Record<Grade, number> = { A: 0.85, B: 0.65, C: 0.45, D: 0.2 };
const REPACK_MULT: Record<Grade, number> = { A: 1, B: 1.2, C: 1.5, D: 2 };
const CONF: Record<Grade, number> = { A: 0.95, B: 0.9, C: 0.82, D: 0.74 };
const WAREHOUSE_DISTANCE_KM = 228.2;

function feasibilityFor(originalPrice: number, grade: Grade, demand: number) {
  const pickupCost = 80;
  const transportationCost = Math.round(WAREHOUSE_DISTANCE_KM * 3);
  const warehouseHandlingCost = 40;
  const inspectionCost = 35;
  const repackagingCost = Math.round(25 * REPACK_MULT[grade]);
  const storageCost = 80;
  const totalProcessingCost =
    pickupCost + transportationCost + warehouseHandlingCost + inspectionCost + repackagingCost + storageCost;
  const expectedResaleValue = Math.round(originalPrice * PRICE_PCT[grade] * (demand >= 1 ? 1.05 : 1));
  const estimatedCurrentValue = Math.round(originalPrice * DEP[grade]);
  const netRecoveryValue = expectedResaleValue - totalProcessingCost;
  const recoveryRatio = Number((expectedResaleValue / totalProcessingCost).toFixed(2));
  const feasible = netRecoveryValue >= 0 && recoveryRatio >= 1.15;
  return {
    originalValue: originalPrice,
    estimatedCurrentValue,
    pickupCost,
    transportationCost,
    warehouseHandlingCost,
    inspectionCost,
    repackagingCost,
    storageCost,
    totalProcessingCost,
    expectedResaleValue,
    netRecoveryValue,
    recoveryRatio,
    distanceKm: WAREHOUSE_DISTANCE_KM,
    nearestWarehouse: "Amazon FC CJB (Coimbatore)",
    proximityFeasible: false,
    decision: feasible ? "FEASIBLE" : "NOT_FEASIBLE",
    reasoning: feasible
      ? `Expected resale ₹${expectedResaleValue} vs ₹${totalProcessingCost} processing cost → ₹${netRecoveryValue} net (ratio ${recoveryRatio}). Return is viable.`
      : `Only ₹${netRecoveryValue} net recovery at ratio ${recoveryRatio} (< 1.15). Route to Second Life instead.`,
  };
}

const CHAINS: Record<string, ReturnStatus[]> = {
  return: ["INITIATED", "GRADED", "FEASIBILITY_ANALYZED", "RETURN_APPROVED", "RETURN_PICKUP_SCHEDULED", "RETURNED_TO_SELLER"],
  match: ["INITIATED", "GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED", "BUYER_RESERVED", "SL_PICKUP_SCHEDULED", "DELIVERY_VERIFICATION", "TRANSFER_APPROVED", "REFUND_INITIATED", "COMPLETED"],
  liquidate: ["INITIATED", "GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED", "WINDOW_EXPIRED", "LIQUIDATION_PICKUP", "LIQUIDATED"],
  donate: ["INITIATED", "GRADED", "FEASIBILITY_ANALYZED", "SECOND_LIFE_LISTED", "WINDOW_EXPIRED", "DONATION_PENDING"],
};

const STATUS_MSG: Partial<Record<ReturnStatus, string>> = {
  INITIATED: "Return request initiated by customer.",
  GRADED: "AI grading complete.",
  FEASIBILITY_ANALYZED: "Feasibility Analysis Engine ran.",
  RETURN_APPROVED: "Return approved — economically viable.",
  RETURN_PICKUP_SCHEDULED: "Pickup scheduled with delivery partner.",
  RETURNED_TO_SELLER: "Item returned to seller / refurbishment center.",
  SECOND_LIFE_LISTED: "Auto-listed in the Second Life marketplace.",
  BUYER_RESERVED: "Interested buyer found nearby — reserved (identity protected).",
  SL_PICKUP_SCHEDULED: "Pickup scheduled for verification.",
  DELIVERY_VERIFICATION: "Delivery partner verifying the item.",
  TRANSFER_APPROVED: "Delivery partner approved the transfer.",
  REFUND_INITIATED: "Refund initiated to the original customer.",
  COMPLETED: "Second-life transaction completed.",
  WINDOW_EXPIRED: "Second Life window expired with no buyer.",
  LIQUIDATION_PICKUP: "Pickup scheduled for disposition.",
  LIQUIDATED: "Entered disposition flow.",
  DONATION_PENDING: "Classified for donation — awaiting user choice.",
};

interface CaseSpec {
  item: string;
  chain: keyof typeof CHAINS;
  status: ReturnStatus;
  reason: string;
  buyer?: { id: string; name: string; distanceKm: number };
  disposition?: Disposition;
}

const CASES: CaseSpec[] = [
  { item: "demo-item-headphones", chain: "return", status: "RETURNED_TO_SELLER", reason: "Defective on arrival" },
  { item: "demo-item-tablet", chain: "return", status: "RETURN_PICKUP_SCHEDULED", reason: "Changed my mind" },
  { item: "demo-item-monitor", chain: "return", status: "RETURNED_TO_SELLER", reason: "Dead pixels" },
  { item: "demo-item-jacket", chain: "return", status: "RETURNED_TO_SELLER", reason: "Size too large" },
  { item: "demo-item-sneakers", chain: "return", status: "RETURN_PICKUP_SCHEDULED", reason: "Size too small" },
  { item: "mkt-item-boots", chain: "return", status: "RETURNED_TO_SELLER", reason: "Uncomfortable fit" },
  { item: "demo-item-tshirt", chain: "match", status: "BUYER_RESERVED", reason: "Size too large", buyer: { id: "demo-buyer-1", name: "Aarav", distanceKm: 1.0 } },
  { item: "mkt-item-book", chain: "match", status: "COMPLETED", reason: "Duplicate gift", buyer: { id: "demo-buyer-3", name: "Kabir", distanceKm: 3.0 } },
  { item: "mkt-item-powerbank", chain: "match", status: "DELIVERY_VERIFICATION", reason: "Slow charging", buyer: { id: "demo-buyer-2", name: "Diya", distanceKm: 2.0 } },
  { item: "demo-item-blender", chain: "liquidate", status: "LIQUIDATED", reason: "Stopped working", disposition: "RECYCLED" },
  { item: "demo-item-lamp", chain: "donate", status: "DONATION_PENDING", reason: "No longer needed", disposition: "DONATED" },
  // ↓ IMPORTANT: These two GRADED/FEASIBILITY cases are seeded LAST (idx 11, 12)
  // so they're the NEWEST by createdAt. The Return Workflow page auto-resumes
  // the newest non-terminal case → the user sees the Circular Decision Engine
  // panel immediately on page load (demo discoverability).
  { item: "mkt-item-coffee", chain: "return", status: "FEASIBILITY_ANALYZED", reason: "Not as described" },
  { item: "mkt-item-jeans", chain: "return", status: "GRADED", reason: "Wrong size" },
];

async function seedReturnCases() {
  const items = await prisma.item.findMany();
  const byId = new Map(items.map((i) => [i.id, i]));
  let n = 0;

  for (let idx = 0; idx < CASES.length; idx++) {
    const spec = CASES[idx];
    const item = byId.get(spec.item);
    if (!item) continue;
    const grade = (item.currentGrade ?? "B") as Grade;
    const confidence = Number((CONF[grade] - (idx % 5) * 0.01).toFixed(2));
    const demand = spec.buyer ? 1 : 0;
    const analyzed = spec.status !== "INITIATED" && spec.status !== "GRADED";
    const feasibility = analyzed ? feasibilityFor(item.originalPrice, grade, demand) : null;
    const decision = feasibility ? (feasibility.decision as "FEASIBLE" | "NOT_FEASIBLE") : null;
    const tookMs = 800 + Math.floor(Math.random() * 1100);
    const baseTime = Date.now() - (CASES.length - 1 - idx) * 9 * 60_000; // last in array = newest

    const gr = await prisma.gradeResult.create({
      data: {
        itemId: item.id,
        grade,
        confidence,
        flaws:
          grade === "A"
            ? []
            : [{ type: grade === "D" ? "wear" : "cosmetic-wear", severity: grade === "D" ? "severe" : grade === "C" ? "moderate" : "minor", location: "general" }],
        summary: `AI assessment: Grade ${grade}.`,
        gradedBy: "bedrock",
        tookMs,
      },
    });

    const rc = await prisma.returnCase.create({
      data: {
        userId: "demo-user",
        itemId: item.id,
        reason: spec.reason,
        status: spec.status,
        decision,
        grade,
        gradeConfidence: confidence,
        gradeResultId: gr.id,
        feasibility: feasibility as unknown as Prisma.InputJsonValue,
        reservedBuyerId: spec.buyer?.id ?? null,
        reservedBuyerName: spec.buyer?.name ?? null,
        reservedDistanceKm: spec.buyer?.distanceKm ?? null,
        disposition: spec.disposition ?? null,
        refundAmount: spec.status === "COMPLETED" || spec.status === "REFUND_INITIATED" ? item.originalPrice : null,
        refundInitiatedAt: spec.status === "COMPLETED" ? new Date(baseTime) : null,
        createdAt: new Date(baseTime),
      },
    });

    // Build the event chain up to the current status.
    const chain = CHAINS[spec.chain];
    const upto = chain.slice(0, chain.indexOf(spec.status) + 1);
    for (let e = 0; e < upto.length; e++) {
      await prisma.returnEvent.create({
        data: {
          returnCaseId: rc.id,
          status: upto[e],
          message: STATUS_MSG[upto[e]] ?? upto[e],
          createdAt: new Date(baseTime + e * 1000),
        },
      });
    }

    // Completed second-life sales + donations earn impact credits.
    if (spec.status === "COMPLETED" || (spec.status === "LIQUIDATED" && spec.disposition === "DONATED")) {
      await prisma.greenCredit.create({
        data: {
          userId: "demo-user",
          itemId: item.id,
          action: "PEER_TO_PEER",
          credits: 50,
          co2SavedKg: 6,
          costSaved: Math.round(item.originalPrice * 0.6),
        },
      });
    }
    n++;
  }
  console.info(`✔ ${n} return cases seeded (varied grades, paths & matches)`);
}

/**
 * Return-in-Transit deals — items in the early return pipeline, offered to
 * nearby buyers at a dynamically-growing discount. Seeded at different ages so
 * the discount tiers (0%, 5%, 10%) are visible on the homepage. The items are
 * unlisted (no active second-life Listing), so they don't double-appear.
 */
async function seedTransitDeals() {
  const deals: Array<{ itemId: string; reason: string; status: ReturnStatus; daysAgo: number }> = [
    { itemId: "demo-item-monitor", reason: "Dead pixels", status: "RETURN_PICKUP_SCHEDULED", daysAgo: 1 },
    { itemId: "demo-item-earbuds", reason: "Changed my mind", status: "GRADED", daysAgo: 5 },
    { itemId: "demo-item-blocks", reason: "Duplicate gift", status: "RETURN_APPROVED", daysAgo: 7 },
  ];
  let n = 0;
  for (const d of deals) {
    const item = await prisma.item.findUnique({ where: { id: d.itemId } });
    if (!item) continue;
    const created = daysAgo(d.daysAgo);
    const rc = await prisma.returnCase.create({
      data: {
        userId: "demo-user",
        itemId: item.id,
        reason: d.reason,
        status: d.status,
        grade: item.currentGrade,
        gradeConfidence: item.currentGrade ? 0.88 : null,
        createdAt: created,
      },
    });
    await prisma.returnEvent.create({
      data: {
        returnCaseId: rc.id,
        status: "INITIATED",
        message: "Return initiated — item entered the pipeline and is offered as an in-transit deal.",
        createdAt: created,
      },
    });
    n++;
  }
  console.info(`✔ ${n} return-in-transit deals seeded`);
}

// ── Reviews + browsing (return-prevention intelligence inputs) ────────────────
// Reviews are seeded WITHOUT a cached sentiment (no model in the seed); the
// review-sentiment signal falls back to the star rating, and the POST
// /api/reviews path scores sentiment via the open-source model on write.
const REVIEW_POOL = {
  positive: [
    { rating: 5, title: "Exactly as described", body: "Great quality, works perfectly. Very happy with this purchase." },
    { rating: 5, title: "Excellent value", body: "Looks brand new and performs flawlessly. Would buy again." },
    { rating: 4, title: "Solid buy", body: "Good condition and reliable. Minor wear but nothing that bothers me." },
  ],
  mixed: [
    { rating: 3, title: "Okay overall", body: "Does the job but the condition was a little more worn than I expected." },
    { rating: 3, title: "Decent", body: "Functional and fairly priced, though setup took longer than I'd like." },
  ],
  sizing: [
    { rating: 2, title: "Runs small", body: "Sizing was off — smaller than my usual size, had to think about returning it." },
    { rating: 2, title: "Fit mismatch", body: "The fit did not match the description. Disappointing for the price." },
  ],
  defect: [
    { rating: 1, title: "Arrived with issues", body: "Noticed a defect out of the box. Not what I expected from the listing." },
    { rating: 2, title: "Quality concern", body: "Works, but there's visible damage that wasn't obvious in the photos." },
  ],
};
const REVIEW_AUTHORS = ["Asha", "Ravi", "Meera", "Karan", "Divya", "Sahil", "Neha", "Arjun"];

async function seedReviews() {
  let count = 0;
  for (let idx = 0; idx < CATALOG.length; idx++) {
    const e = CATALOG[idx];
    const rows: Array<{ rating: number; title: string; body: string }> = [];
    // Base reviews correlate with the item's verified grade.
    if (e.grade === "A") rows.push(REVIEW_POOL.positive[0], REVIEW_POOL.positive[1], REVIEW_POOL.positive[2]);
    else if (e.grade === "B") rows.push(REVIEW_POOL.positive[2], REVIEW_POOL.positive[0], REVIEW_POOL.mixed[0]);
    else if (e.grade === "C") rows.push(REVIEW_POOL.mixed[0], REVIEW_POOL.mixed[1]);
    else rows.push(REVIEW_POOL.defect[1], REVIEW_POOL.mixed[1]);
    // Return reasons inject matching complaints (so signals are realistic).
    const reasons = (e.returns ?? []).join(" ").toLowerCase();
    if (reasons.includes("size")) rows.push(REVIEW_POOL.sizing[idx % 2]);
    if (reasons.includes("defect")) rows.push(REVIEW_POOL.defect[idx % 2]);

    await prisma.review.createMany({
      data: rows.map((r, i) => ({
        itemId: e.id,
        userId: `buyer-${REVIEW_AUTHORS[(idx + i) % REVIEW_AUTHORS.length].toLowerCase()}`,
        authorName: REVIEW_AUTHORS[(idx + i) % REVIEW_AUTHORS.length],
        rating: r.rating,
        title: r.title,
        body: r.body,
      })),
    });
    count += rows.length;
  }
  console.info(`✔ ${count} product reviews seeded (sentiment scored on API writes)`);
}

async function seedBrowsing() {
  // A little browsing history + wishlist for the Demo Owner, so cohort/advisor
  // signals have real events to read.
  const viewed = CATALOG.slice(0, 6);
  for (const e of viewed) {
    await prisma.productView.create({ data: { userId: "demo-user", itemId: e.id } });
  }
  for (const e of CATALOG.slice(0, 3)) {
    await prisma.wishlistItem.upsert({
      where: { userId_itemId: { userId: "demo-user", itemId: e.id } },
      update: {},
      create: { userId: "demo-user", itemId: e.id },
    });
  }
  console.info(`✔ browsing history + wishlist seeded`);
}

async function main() {
  console.info("Seeding Amazon Nemo database…");
  await reset();
  await seedConfig();
  await seedProducts();
  await seedItems();
  await seedOrders();
  await seedListings();
  await seedReturns();
  await seedBuyers();
  await seedReturnCases();
  await seedTransitDeals();
  await seedReviews();
  await seedBrowsing();
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
