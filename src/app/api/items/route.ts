import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/items
 * List all returns with optional filters: status, category, route, grade
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const route = searchParams.get("route");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const returns = await prisma.return.findMany({
      where,
      include: {
        productItem: {
          include: {
            product: true,
            images: { take: 1 },
          },
        },
        healthCard: true,
        routingDecision: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Post-filter by category/route from related models
    let filtered = returns;
    if (category) {
      filtered = filtered.filter((r) => r.productItem.product.category === category);
    }
    if (route) {
      filtered = filtered.filter((r) => r.routingDecision?.route === route);
    }

    const total = await prisma.return.count({ where });

    return NextResponse.json({
      items: filtered.map((r) => ({
        id: r.id,
        title: r.productItem.product.title,
        brand: r.productItem.product.brand,
        category: r.productItem.product.category,
        size: r.productItem.size,
        region: r.region,
        reason: r.reason,
        status: r.status,
        route: r.routingDecision?.route || null,
        grade: r.healthCard?.grade || null,
        conditionScore: r.healthCard?.conditionScore || null,
        confidence: r.healthCard?.confidence || null,
        greenCredits: r.healthCard?.greenCredits || 0,
        imageUrl: r.productItem.images[0]?.url || null,
        createdAt: r.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("GET /api/items error:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
