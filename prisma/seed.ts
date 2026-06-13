import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ReLoop database...\n");

  // ─── Users ──────────────────────────────────────────────────────────────────

  const consumer1 = await prisma.user.create({
    data: {
      email: "priya@example.com",
      name: "Priya Sharma",
      role: "CONSUMER",
      region: "North Bengaluru",
      greenCredits: 75,
    },
  });

  const consumer2 = await prisma.user.create({
    data: {
      email: "rahul@example.com",
      name: "Rahul Verma",
      role: "CONSUMER",
      region: "Koramangala",
      greenCredits: 120,
    },
  });

  const consumer3 = await prisma.user.create({
    data: {
      email: "anita@example.com",
      name: "Anita Desai",
      role: "CONSUMER",
      region: "North Bengaluru",
      greenCredits: 0,
    },
  });

  const seller1 = await prisma.user.create({
    data: {
      email: "vikram@shoezone.com",
      name: "Vikram Patel",
      role: "SELLER",
      region: "HSR Layout",
      greenCredits: 0,
    },
  });

  const admin1 = await prisma.user.create({
    data: {
      email: "admin@reloop.local",
      name: "ReLoop Admin",
      role: "ADMIN",
      region: "Bengaluru",
      greenCredits: 0,
    },
  });

  console.log("✓ Users created");

  // ─── Products ───────────────────────────────────────────────────────────────

  const shoeProduct = await prisma.product.create({
    data: {
      title: "AeroStride Velocity Running Shoes",
      brand: "AeroStride",
      category: "FOOTWEAR",
      sku: "AERO-VEL-UK7-BLK",
      originalPrice: 4999,
      purchaseDate: new Date("2026-05-20"),
      ownerId: consumer1.id,
    },
  });

  const lampProduct = await prisma.product.create({
    data: {
      title: "FlexBeam Study Lamp",
      brand: "FlexBeam",
      category: "HOME",
      sku: "FB-LAMP-001",
      originalPrice: 1299,
      purchaseDate: new Date("2026-04-15"),
      ownerId: consumer2.id,
    },
  });

  const sneakerProduct = await prisma.product.create({
    data: {
      title: "CloudWalk Canvas Sneakers",
      brand: "CloudWalk",
      category: "FOOTWEAR",
      sku: "CW-CNV-UK8-WHT",
      originalPrice: 2499,
      purchaseDate: new Date("2026-06-01"),
      ownerId: consumer1.id,
    },
  });

  console.log("✓ Products created");

  // ─── Product Items ──────────────────────────────────────────────────────────

  const shoeItem = await prisma.productItem.create({
    data: {
      productId: shoeProduct.id,
      size: "UK7",
      color: "Black",
      status: "ROUTED",
      condition: "A",
      serialHash: "rl-a7f3c2e1",
      materialNotes: ["Synthetic mesh upper", "EVA foam midsole", "Rubber outsole"],
      ownerCount: 1,
      cityTrail: ["Bengaluru"],
      carbonSaved: 0,
    },
  });

  const lampItem = await prisma.productItem.create({
    data: {
      productId: lampProduct.id,
      size: null,
      color: "White",
      status: "ROUTED",
      condition: "C",
      serialHash: "rl-d2f8a4b7",
      materialNotes: ["ABS plastic body", "LED array", "Steel gooseneck"],
      ownerCount: 1,
      cityTrail: ["Bengaluru"],
      carbonSaved: 0,
    },
  });

  const sneakerItem = await prisma.productItem.create({
    data: {
      productId: sneakerProduct.id,
      size: "UK8",
      color: "White",
      status: "ROUTED",
      condition: "A",
      serialHash: "rl-c9e5f6a3",
      materialNotes: ["Cotton canvas upper", "Vulcanized rubber sole", "Organic cotton laces"],
      ownerCount: 1,
      cityTrail: ["Bengaluru"],
      carbonSaved: 0,
    },
  });

  console.log("✓ Product items created");

  // ─── Returns ────────────────────────────────────────────────────────────────

  // Return 1: Shoes - size too tight (should route to RESALE)
  const shoeReturn = await prisma.return.create({
    data: {
      productItemId: shoeItem.id,
      userId: consumer1.id,
      reason: "Size is too tight",
      details: "Unused pair. Box opened. I usually wear UK7 but this brand feels small.",
      region: "North Bengaluru",
      status: "ROUTED",
    },
  });

  // Return 2: Lamp - not bright enough (low value, should avoid liquidation → DONATE)
  const lampReturn = await prisma.return.create({
    data: {
      productItemId: lampItem.id,
      userId: consumer2.id,
      reason: "Not bright enough for room",
      details: "Works fine as a desk lamp but I expected it to light the whole room. Minor scratch on base.",
      region: "Indiranagar",
      status: "ROUTED",
    },
  });

  // Return 3: Sneakers - duplicate order (should route to PEER_EXCHANGE)
  const sneakerReturn = await prisma.return.create({
    data: {
      productItemId: sneakerItem.id,
      userId: consumer1.id,
      reason: "Duplicate order, unused",
      details: "Sealed in box. Wrong order placed twice. New condition.",
      region: "North Bengaluru",
      status: "ROUTED",
    },
  });

  console.log("✓ Returns created");

  // ─── Product Images ─────────────────────────────────────────────────────────

  await prisma.productImage.createMany({
    data: [
      {
        productItemId: shoeItem.id,
        returnId: shoeReturn.id,
        url: "/uploads/shoe-top-view.jpg",
        filename: "shoe-top-view.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2_400_000,
        qualityScore: 88,
        isClear: true,
      },
      {
        productItemId: shoeItem.id,
        returnId: shoeReturn.id,
        url: "/uploads/shoe-sole.jpg",
        filename: "shoe-sole.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1_800_000,
        qualityScore: 82,
        isClear: true,
      },
      {
        productItemId: lampItem.id,
        returnId: lampReturn.id,
        url: "/uploads/lamp-front.jpg",
        filename: "lamp-front.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 3_100_000,
        qualityScore: 62,
        isClear: false,
      },
      {
        productItemId: sneakerItem.id,
        returnId: sneakerReturn.id,
        url: "/uploads/sneaker-sealed.jpg",
        filename: "sneaker-sealed.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2_000_000,
        qualityScore: 90,
        isClear: true,
      },
      {
        productItemId: sneakerItem.id,
        returnId: sneakerReturn.id,
        url: "/uploads/sneaker-box.jpg",
        filename: "sneaker-box.jpg",
        mimeType: "image/png",
        sizeBytes: 2_500_000,
        qualityScore: 85,
        isClear: true,
      },
    ],
  });

  console.log("✓ Product images created");

  // ─── AI Inspections ─────────────────────────────────────────────────────────

  await prisma.aIInspection.create({
    data: {
      productItemId: shoeItem.id,
      returnId: shoeReturn.id,
      severeTerms: [],
      mildTerms: [],
      unusedTerms: ["unused"],
      laplacianVar: 142.5,
      brightnessMean: 128.3,
      edgeDensity: 0.34,
      isClear: true,
      yoloDefects: 0,
      yoloLabels: [],
      reasoning: "Item appears unused with original packaging. Return reason is size preference, not quality issue. No defects detected visually or through text analysis.",
      reasoningSource: "ollama",
      servicesUsed: ["fastapi", "ollama", "opencv", "yolo"],
      fallbackMode: false,
    },
  });

  await prisma.aIInspection.create({
    data: {
      productItemId: lampItem.id,
      returnId: lampReturn.id,
      severeTerms: [],
      mildTerms: ["minor", "scratch"],
      unusedTerms: [],
      laplacianVar: 68.2,
      brightnessMean: 95.1,
      edgeDensity: 0.22,
      isClear: false,
      yoloDefects: 1,
      yoloLabels: ["surface_wear"],
      reasoning: "Item is functional with minor cosmetic damage. Image clarity is below threshold. One surface defect detected. Suitable for donation given low resale confidence.",
      reasoningSource: "ollama",
      servicesUsed: ["fastapi", "ollama", "opencv", "yolo"],
      fallbackMode: false,
    },
  });

  await prisma.aIInspection.create({
    data: {
      productItemId: sneakerItem.id,
      returnId: sneakerReturn.id,
      severeTerms: [],
      mildTerms: [],
      unusedTerms: ["unused", "new", "sealed"],
      laplacianVar: 155.8,
      brightnessMean: 135.0,
      edgeDensity: 0.38,
      isClear: true,
      yoloDefects: 0,
      yoloLabels: [],
      reasoning: "Brand new, sealed item. Duplicate order confirmed by multiple unused indicators. Excellent condition for peer exchange given nearby demand.",
      reasoningSource: "ollama",
      servicesUsed: ["fastapi", "ollama", "opencv", "yolo"],
      fallbackMode: false,
    },
  });

  console.log("✓ AI inspections created");

  // ─── Health Cards ───────────────────────────────────────────────────────────

  await prisma.healthCard.create({
    data: {
      productItemId: shoeItem.id,
      returnId: shoeReturn.id,
      conditionScore: 92,
      qualityScore: 88,
      historyScore: 85,
      confidence: 88,
      grade: "A",
      routeReason: "Item is in excellent condition. Size-related return with no quality issues detected.",
      nextAction: "Seal for pickup; ReLoop will relist after identity-safe inspection.",
      riskFlags: ["Size runs small for UK7 — recommend UK8 for this brand."],
      greenCredits: 30,
    },
  });

  await prisma.healthCard.create({
    data: {
      productItemId: lampItem.id,
      returnId: lampReturn.id,
      conditionScore: 58,
      qualityScore: 54,
      historyScore: 55,
      confidence: 56,
      grade: "C",
      routeReason: "Item is functional but has cosmetic damage and low image quality. Donation is the highest-value route.",
      nextAction: "Route to verified donation partner on the next reverse-logistics run.",
      riskFlags: ["Minor scratch detected", "Image clarity below threshold"],
      greenCredits: 40,
    },
  });

  await prisma.healthCard.create({
    data: {
      productItemId: sneakerItem.id,
      returnId: sneakerReturn.id,
      conditionScore: 96,
      qualityScore: 90,
      historyScore: 88,
      confidence: 91,
      grade: "A",
      routeReason: "Nearby anonymous demand is stronger than marketplace resale demand for this category and size.",
      nextAction: "Use managed pickup and dropoff; no customer-to-customer contact needed.",
      riskFlags: ["No major quality risk detected."],
      greenCredits: 45,
    },
  });

  console.log("✓ Health cards created");

  // ─── Routing Decisions ──────────────────────────────────────────────────────

  await prisma.routingDecision.create({
    data: {
      productItemId: shoeItem.id,
      returnId: shoeReturn.id,
      route: "RESALE",
      priority: 2,
      conditionMet: "Grade A with confidence 88 — qualifies for RESALE at priority 2",
    },
  });

  await prisma.routingDecision.create({
    data: {
      productItemId: lampItem.id,
      returnId: lampReturn.id,
      route: "DONATE",
      priority: 4,
      conditionMet: "Grade C, no higher-priority route (PEER_EXCHANGE, RESALE, REFURBISH) applies — DONATE at priority 4",
    },
  });

  await prisma.routingDecision.create({
    data: {
      productItemId: sneakerItem.id,
      returnId: sneakerReturn.id,
      route: "PEER_EXCHANGE",
      priority: 1,
      conditionMet: "Nearby NeedSignal match + ConditionScore 96 > 74 + category FOOTWEAR (not ELECTRONICS) — PEER_EXCHANGE at priority 1",
    },
  });

  console.log("✓ Routing decisions created");

  // ─── Resale Listing (for shoes) ────────────────────────────────────────────

  await prisma.resaleListing.create({
    data: {
      productItemId: shoeItem.id,
      sellerId: seller1.id,
      title: "AeroStride Velocity Running Shoes — Unused, UK7",
      description: "Brand new running shoes, returned due to size preference. Zero wear, box opened only for inspection.",
      price: 3499,
      originalPrice: 4999,
      priceConfidence: 82,
      grade: "A",
      status: "LISTED",
    },
  });

  console.log("✓ Resale listing created");

  // ─── Peer Matches (nearby users who need the sneakers) ─────────────────────

  await prisma.peerMatch.create({
    data: {
      productItemId: sneakerItem.id,
      receiverId: consumer3.id,
      pool: "North Bengaluru footwear pool",
      region: "North Bengaluru",
      category: "FOOTWEAR",
      size: "UK8",
      urgency: 8,
      distanceKm: 3.4,
      demandLevel: "High",
      distanceScore: 66.0,
      urgencyScore: 80.0,
      sizeScore: 100.0,
      demandScore: 85.0,
      compositeScore: 82.0,
      matched: true,
      matchedAt: new Date("2026-06-11T17:00:00Z"),
    },
  });

  await prisma.peerMatch.create({
    data: {
      productItemId: sneakerItem.id,
      receiverId: consumer2.id,
      pool: "Koramangala footwear pool",
      region: "Koramangala",
      category: "FOOTWEAR",
      size: "UK8",
      urgency: 5,
      distanceKm: 6.2,
      demandLevel: "Medium",
      distanceScore: 38.0,
      urgencyScore: 50.0,
      sizeScore: 100.0,
      demandScore: 60.0,
      compositeScore: 60.4,
      matched: false,
      matchedAt: null,
    },
  });

  console.log("✓ Peer matches created");

  // ─── Seller Listing Audits (repeated size-related returns) ─────────────────

  await prisma.sellerListingAudit.create({
    data: {
      sellerId: seller1.id,
      listingTitle: "AeroStride Velocity Running Shoes",
      originalTitle: "AeroStride Velocity Running Shoes",
      originalDesc: "Lightweight running shoes for daily training. Available in UK sizes 6-11.",
      returnReasons: ["Size too tight", "Size too small", "Doesn't fit as expected", "Runs narrow"],
      returnCount: 28,
      detectedIssue: "Size runs small for UK7 buyers — 68% of size returns are UK7 orders",
      revisedTitle: "AeroStride Velocity Running Shoes — choose one size up for a relaxed fit",
      revisedDesc: "Lightweight daily running shoes with a narrow performance fit. If you usually wear UK7, choose UK8 in this brand. Wide-foot customers should size up or choose the wide-fit variant.",
      preventionTip: "Add a pre-check: \"If you wear UK7, choose UK8 for this brand.\"",
      rewriteStatus: "generated",
    },
  });

  await prisma.sellerListingAudit.create({
    data: {
      sellerId: seller1.id,
      listingTitle: "TrailMaster Hiking Boots",
      originalTitle: "TrailMaster Hiking Boots",
      originalDesc: "Durable hiking boots for outdoor adventures. Waterproof membrane.",
      returnReasons: ["Too narrow", "Heel slips", "Size too small for thick socks"],
      returnCount: 15,
      detectedIssue: "Boot width and sock allowance not communicated — buyers expect casual fit",
      revisedTitle: "TrailMaster Hiking Boots — Performance fit, size up for thick socks",
      revisedDesc: "Waterproof hiking boots with a snug performance fit. Size up half a size if you plan to wear thick hiking socks. Not suitable for wide feet without the wide-fit variant.",
      preventionTip: "Ask buyers: \"Will you wear thick socks? If yes, order half a size up.\"",
      rewriteStatus: "generated",
    },
  });

  console.log("✓ Seller listing audits created");

  // ─── Size Profiles ──────────────────────────────────────────────────────────

  await prisma.sizeProfile.create({
    data: {
      userId: consumer1.id,
      category: "FOOTWEAR",
      usualSize: "UK7",
      preferredFit: "regular",
      footWidth: "regular",
      notes: "Tends to need UK8 in narrow-fit brands like AeroStride",
    },
  });

  await prisma.sizeProfile.create({
    data: {
      userId: consumer3.id,
      category: "FOOTWEAR",
      usualSize: "UK8",
      preferredFit: "relaxed",
      footWidth: "wide",
    },
  });

  console.log("✓ Size profiles created");

  // ─── Brand Fit Rules ────────────────────────────────────────────────────────

  await prisma.brandFitRule.create({
    data: {
      brand: "AeroStride",
      category: "FOOTWEAR",
      sizeAdjustment: 1,
      fitType: "narrow",
      confidence: 87,
      sampleSize: 284,
      recommendation: "If you wear UK7, choose UK8 for this brand. Runs narrow.",
      notes: "Based on 284 return cases. 68% of UK7 returns cite size as reason.",
    },
  });

  await prisma.brandFitRule.create({
    data: {
      brand: "CloudWalk",
      category: "FOOTWEAR",
      sizeAdjustment: 0,
      fitType: "regular",
      confidence: 72,
      sampleSize: 156,
      recommendation: "True to size. Order your usual UK size.",
      notes: "Standard canvas fit with minimal size-related returns.",
    },
  });

  await prisma.brandFitRule.create({
    data: {
      brand: "TrailMaster",
      category: "FOOTWEAR",
      sizeAdjustment: 1,
      fitType: "narrow",
      confidence: 78,
      sampleSize: 92,
      recommendation: "Size up half a size for thick socks. Runs snug in the toe box.",
      notes: "Performance hiking fit — not suitable for wide feet without wide variant.",
    },
  });

  console.log("✓ Brand fit rules created");

  // ─── Green Credit Ledger ────────────────────────────────────────────────────

  await prisma.greenCreditLedger.createMany({
    data: [
      {
        userId: consumer1.id,
        returnId: shoeReturn.id,
        action: "ROUTE_AWARD",
        points: 30,
        reason: "Item routed to RESALE",
        category: "route",
      },
      {
        userId: consumer1.id,
        returnId: shoeReturn.id,
        action: "BONUS_QUALITY",
        points: 5,
        reason: "3+ images with QualityScore ≥ 50",
        category: "bonus_quality",
      },
      {
        userId: consumer2.id,
        returnId: lampReturn.id,
        action: "ROUTE_AWARD",
        points: 40,
        reason: "Item routed to DONATE",
        category: "route",
      },
      {
        userId: consumer1.id,
        returnId: sneakerReturn.id,
        action: "ROUTE_AWARD",
        points: 45,
        reason: "Item routed to PEER_EXCHANGE",
        category: "route",
      },
      {
        userId: consumer1.id,
        returnId: sneakerReturn.id,
        action: "BONUS_LOCAL",
        points: 20,
        reason: "Peer exchange within 5km distance",
        category: "bonus_local",
      },
      {
        userId: consumer1.id,
        returnId: sneakerReturn.id,
        action: "BONUS_SPEED",
        points: 10,
        reason: "Submitted within 7 days of purchase",
        category: "bonus_speed",
      },
    ],
  });

  console.log("✓ Green credit ledger entries created");

  // ─── Product Events ─────────────────────────────────────────────────────────

  await prisma.productEvent.createMany({
    data: [
      {
        productId: shoeProduct.id,
        eventType: "created",
        description: "Product purchased by consumer",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: shoeProduct.id,
        eventType: "returned",
        description: "Returned due to size preference (too tight)",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: shoeProduct.id,
        eventType: "graded",
        description: "AI grading complete: Grade A, confidence 88%",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: shoeProduct.id,
        eventType: "routed",
        description: "Routed to RESALE based on excellent condition",
        city: "Bengaluru",
        carbonDelta: 4.2,
      },
      {
        productId: lampProduct.id,
        eventType: "created",
        description: "Product purchased by consumer",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: lampProduct.id,
        eventType: "returned",
        description: "Returned — brightness expectations mismatch",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: lampProduct.id,
        eventType: "routed",
        description: "Routed to DONATE — functional but low resale confidence",
        city: "Bengaluru",
        carbonDelta: 3.8,
      },
      {
        productId: sneakerProduct.id,
        eventType: "created",
        description: "Product purchased by consumer",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: sneakerProduct.id,
        eventType: "returned",
        description: "Returned — duplicate order, item is sealed and unused",
        city: "Bengaluru",
        carbonDelta: 0,
      },
      {
        productId: sneakerProduct.id,
        eventType: "routed",
        description: "Routed to PEER_EXCHANGE — matched with nearby demand pool",
        city: "Bengaluru",
        carbonDelta: 4.5,
      },
    ],
  });

  console.log("✓ Product events created");

  // ─── Summary ────────────────────────────────────────────────────────────────

  console.log("\n🎉 Seed complete! Summary:");
  console.log(`   Users: 5 (3 consumers, 1 seller, 1 admin)`);
  console.log(`   Products: 3 (shoes, lamp, sneakers)`);
  console.log(`   Returns: 3 (RESALE, DONATE, PEER_EXCHANGE)`);
  console.log(`   Health Cards: 3`);
  console.log(`   Peer Matches: 2`);
  console.log(`   Brand Fit Rules: 3`);
  console.log(`   Credit Entries: 6`);
  console.log(`   Product Events: 10`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
