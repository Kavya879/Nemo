import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/items/[id]/health-card
 * Get the health card for a return case.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const healthCard = await prisma.healthCard.findUnique({
      where: { returnId: id },
      include: {
        productItem: {
          include: { product: true },
        },
      },
    });

    if (!healthCard) {
      return NextResponse.json(
        { error: "Health card not found for this return case" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: healthCard.id,
      returnId: id,
      product: {
        title: healthCard.productItem.product.title,
        brand: healthCard.productItem.product.brand,
        category: healthCard.productItem.product.category,
      },
      conditionScore: healthCard.conditionScore,
      qualityScore: healthCard.qualityScore,
      historyScore: healthCard.historyScore,
      confidence: healthCard.confidence,
      grade: healthCard.grade,
      routeReason: healthCard.routeReason,
      nextAction: healthCard.nextAction,
      riskFlags: healthCard.riskFlags,
      greenCredits: healthCard.greenCredits,
      createdAt: healthCard.createdAt,
    });
  } catch (error) {
    console.error("GET /api/items/[id]/health-card error:", error);
    return NextResponse.json({ error: "Failed to fetch health card" }, { status: 500 });
  }
}
