import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/passport/[passportId]
 * Get product passport (lifecycle) by product item ID or serial hash.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ passportId: string }> }
) {
  try {
    const { passportId } = await params;

    // Try finding by product item ID first, then by serial hash
    let productItem = await prisma.productItem.findUnique({
      where: { id: passportId },
      include: {
        product: true,
        images: { take: 3 },
        healthCards: { orderBy: { createdAt: "desc" } },
        routingDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!productItem) {
      productItem = await prisma.productItem.findUnique({
        where: { serialHash: passportId },
        include: {
          product: true,
          images: { take: 3 },
          healthCards: { orderBy: { createdAt: "desc" } },
          routingDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
    }

    if (!productItem) {
      return NextResponse.json({ error: "Product passport not found" }, { status: 404 });
    }

    // Get lifecycle events
    const events = await prisma.productEvent.findMany({
      where: { productId: productItem.product.id },
      orderBy: { createdAt: "asc" },
    });

    // Calculate total carbon saved
    const totalCarbonSaved = events.reduce((sum, e) => sum + e.carbonDelta, 0);

    // Build grade history from health cards
    const gradeHistory = productItem.healthCards.map((hc) => ({
      date: hc.createdAt.toISOString().split("T")[0],
      grade: hc.grade,
      conditionScore: hc.conditionScore,
      confidence: hc.confidence,
    }));

    return NextResponse.json({
      id: productItem.id,
      serialHash: productItem.serialHash,
      product: {
        id: productItem.product.id,
        title: productItem.product.title,
        brand: productItem.product.brand,
        category: productItem.product.category,
        originalPrice: productItem.product.originalPrice,
      },
      item: {
        size: productItem.size,
        color: productItem.color,
        condition: productItem.condition,
        status: productItem.status,
      },
      materialNotes: productItem.materialNotes,
      ownerCount: productItem.ownerCount,
      cityTrail: productItem.cityTrail,
      carbonSaved: Math.round(totalCarbonSaved * 10) / 10,
      gradeHistory,
      currentRoute: productItem.routingDecisions[0]?.route || null,
      events: events.map((e) => ({
        type: e.eventType,
        description: e.description,
        city: e.city,
        carbonDelta: e.carbonDelta,
        date: e.createdAt,
      })),
      images: productItem.images.map((img) => ({
        url: img.url,
        qualityScore: img.qualityScore,
      })),
    });
  } catch (error) {
    console.error("GET /api/passport/[passportId] error:", error);
    return NextResponse.json({ error: "Failed to fetch passport" }, { status: 500 });
  }
}
