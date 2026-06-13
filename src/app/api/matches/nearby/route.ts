import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/matches/nearby
 * Find nearby need matches for a product item.
 * Uses deterministic composite scoring: distance(0.30) + urgency(0.25) + size(0.25) + demand(0.20)
 */
export async function POST(request: Request) {
  try {
    const { productItemId, category, size, region } = await request.json();

    if (!productItemId || !category || !region) {
      return NextResponse.json(
        { error: "Missing required fields: productItemId, category, region" },
        { status: 400 }
      );
    }

    // Check if product item exists
    const productItem = await prisma.productItem.findUnique({
      where: { id: productItemId },
    });

    if (!productItem) {
      return NextResponse.json({ error: "Product item not found" }, { status: 404 });
    }

    // Find existing peer matches for this item
    const existingMatches = await prisma.peerMatch.findMany({
      where: { productItemId },
      orderBy: { compositeScore: "desc" },
    });

    if (existingMatches.length > 0) {
      return NextResponse.json({
        matches: existingMatches.map(formatMatch),
        source: "database",
        threshold: 55,
        recommendPeerExchange: existingMatches.some((m) => m.compositeScore > 55),
      });
    }

    // No existing matches — compute from NeedSignal-style data
    // In production this would query real NeedSignals; for demo we use fallback pools
    const fallbackMatches = computeFallbackMatches(productItemId, category, size, region);

    return NextResponse.json({
      matches: fallbackMatches,
      source: "computed-fallback",
      threshold: 55,
      recommendPeerExchange: fallbackMatches.some((m) => m.scores.composite > 55),
    });
  } catch (error) {
    console.error("POST /api/matches/nearby error:", error);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}

function formatMatch(match: {
  id: string;
  pool: string;
  region: string;
  category: string;
  size: string | null;
  urgency: number;
  distanceKm: number;
  demandLevel: string;
  distanceScore: number;
  urgencyScore: number;
  sizeScore: number;
  demandScore: number;
  compositeScore: number;
  matched: boolean;
}) {
  return {
    id: match.id,
    pool: match.pool,
    region: match.region,
    category: match.category,
    size: match.size,
    urgency: match.urgency,
    distanceKm: match.distanceKm,
    demandLevel: match.demandLevel,
    scores: {
      distance: match.distanceScore,
      urgency: match.urgencyScore,
      size: match.sizeScore,
      demand: match.demandScore,
      composite: match.compositeScore,
    },
    matched: match.matched,
    aboveThreshold: match.compositeScore > 55,
  };
}

// Deterministic fallback matching for demo
function computeFallbackMatches(
  _productItemId: string,
  category: string,
  size: string | null,
  _region: string // Used for production filtering; kept for API consistency
) {
  const pools = [
    { pool: "North Bengaluru footwear pool", region: "North Bengaluru", category: "FOOTWEAR", size: "UK8", urgency: 8, distanceKm: 3.4, demandLevel: "High" },
    { pool: "Koramangala apparel pool", region: "Koramangala", category: "APPAREL", size: "M", urgency: 6, distanceKm: 4.8, demandLevel: "Medium" },
    { pool: "City library reuse pool", region: "Whitefield", category: "BOOKS", size: null, urgency: 9, distanceKm: 6.1, demandLevel: "High" },
    { pool: "Community home essentials", region: "Indiranagar", category: "HOME", size: null, urgency: 7, distanceKm: 2.1, demandLevel: "Medium" },
    { pool: "E-waste recovery program", region: "HSR Layout", category: "ELECTRONICS", size: null, urgency: 4, distanceKm: 8.2, demandLevel: "Low" },
  ];

  // Filter by category match
  const categoryMatches = pools.filter((p) => p.category === category);

  if (categoryMatches.length === 0) {
    return [];
  }

  return categoryMatches.map((pool) => {
    const distanceScore = Math.max(0, 100 - pool.distanceKm * 10);
    const urgencyScore = pool.urgency * 10;
    const sizeScore = !pool.size ? 60 : (pool.size === size?.toUpperCase() ? 100 : 20);
    const demandScore = pool.demandLevel === "High" ? 85 : pool.demandLevel === "Medium" ? 60 : 35;

    const compositeScore = Math.round(
      distanceScore * 0.30 +
      urgencyScore * 0.25 +
      sizeScore * 0.25 +
      demandScore * 0.20
    );

    return {
      pool: pool.pool,
      region: pool.region,
      category: pool.category,
      size: pool.size,
      urgency: pool.urgency,
      distanceKm: pool.distanceKm,
      demandLevel: pool.demandLevel,
      scores: {
        distance: Math.round(distanceScore),
        urgency: urgencyScore,
        size: sizeScore,
        demand: demandScore,
        composite: compositeScore,
      },
      matched: false,
      aboveThreshold: compositeScore > 55,
    };
  });
}
