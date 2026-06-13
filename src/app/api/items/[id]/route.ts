import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/items/[id]
 * Get full details for a single return case.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const returnCase = await prisma.return.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, region: true } },
        productItem: {
          include: {
            product: true,
            images: true,
          },
        },
        inspection: true,
        healthCard: true,
        routingDecision: true,
        creditEntries: true,
      },
    });

    if (!returnCase) {
      return NextResponse.json({ error: "Return case not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: returnCase.id,
      status: returnCase.status,
      reason: returnCase.reason,
      details: returnCase.details,
      region: returnCase.region,
      createdAt: returnCase.createdAt,
      user: returnCase.user,
      product: {
        id: returnCase.productItem.product.id,
        title: returnCase.productItem.product.title,
        brand: returnCase.productItem.product.brand,
        category: returnCase.productItem.product.category,
        originalPrice: returnCase.productItem.product.originalPrice,
      },
      item: {
        id: returnCase.productItem.id,
        size: returnCase.productItem.size,
        color: returnCase.productItem.color,
        condition: returnCase.productItem.condition,
        serialHash: returnCase.productItem.serialHash,
        status: returnCase.productItem.status,
      },
      images: returnCase.productItem.images.map((img) => ({
        id: img.id,
        url: img.url,
        qualityScore: img.qualityScore,
        isClear: img.isClear,
      })),
      inspection: returnCase.inspection,
      healthCard: returnCase.healthCard,
      routing: returnCase.routingDecision,
      credits: returnCase.creditEntries,
    });
  } catch (error) {
    console.error("GET /api/items/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}
