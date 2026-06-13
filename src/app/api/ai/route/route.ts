import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/route
 * Run routing decision on a graded return case.
 * Uses deterministic priority-based routing logic.
 */
export async function POST(request: Request) {
  try {
    const { returnId } = await request.json();

    if (!returnId) {
      return NextResponse.json({ error: "Missing returnId" }, { status: 400 });
    }

    const returnCase = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        productItem: {
          include: { product: true },
        },
        healthCard: true,
        inspection: true,
      },
    });

    if (!returnCase) {
      return NextResponse.json({ error: "Return case not found" }, { status: 404 });
    }

    if (!returnCase.healthCard) {
      return NextResponse.json(
        { error: "Item must be inspected before routing. Run /api/ai/inspect first." },
        { status: 400 }
      );
    }

    const hc = returnCase.healthCard;
    const category = returnCase.productItem.product.category;
    const severeCount = returnCase.inspection?.severeTerms.length || 0;

    // Check for nearby NeedSignal match
    const needSignal = await prisma.peerMatch.findFirst({
      where: {
        productItemId: returnCase.productItem.id,
        compositeScore: { gt: 55 },
      },
      orderBy: { compositeScore: "desc" },
    });

    // Priority-based routing
    let route: string;
    let priority: number;
    let conditionMet: string;

    if (needSignal && hc.conditionScore > 74 && category !== "ELECTRONICS") {
      route = "PEER_EXCHANGE";
      priority = 1;
      conditionMet = `NeedSignal match (score ${needSignal.compositeScore}) + ConditionScore ${hc.conditionScore} > 74 + non-ELECTRONICS`;
    } else if (hc.grade === "A" || (hc.grade === "B" && hc.conditionScore > 78)) {
      route = "RESALE";
      priority = 2;
      conditionMet = hc.grade === "A"
        ? `Grade A (confidence ${hc.confidence})`
        : `Grade B with ConditionScore ${hc.conditionScore} > 78`;
    } else if (category === "ELECTRONICS" && hc.qualityScore > 48 && severeCount < 2) {
      route = "REFURBISH";
      priority = 3;
      conditionMet = `ELECTRONICS + QualityScore ${hc.qualityScore} > 48 + severeDefects ${severeCount} < 2`;
    } else if (hc.grade === "C") {
      route = "DONATE";
      priority = 4;
      conditionMet = "Grade C — no higher-priority route matched";
    } else {
      route = "LIQUIDATE";
      priority = 5;
      conditionMet = "Grade D — fallback route";
    }

    // Store routing decision
    const routingDecision = await prisma.routingDecision.create({
      data: {
        productItemId: returnCase.productItem.id,
        returnId: returnCase.id,
        route: route as "RESALE" | "REFURBISH" | "DONATE" | "LIQUIDATE" | "PEER_EXCHANGE",
        priority,
        conditionMet,
      },
    });

    // Update return status
    await prisma.return.update({
      where: { id: returnId },
      data: { status: "ROUTED" },
    });

    // Update product item status
    await prisma.productItem.update({
      where: { id: returnCase.productItem.id },
      data: { status: "ROUTED" },
    });

    // Award green credits
    const creditPoints = getCreditPoints(route);
    await prisma.greenCreditLedger.create({
      data: {
        userId: returnCase.userId,
        returnId: returnCase.id,
        action: "ROUTE_AWARD",
        points: creditPoints,
        reason: `Item routed to ${route}`,
        category: "route",
      },
    });

    // Update user credit balance
    await prisma.user.update({
      where: { id: returnCase.userId },
      data: { greenCredits: { increment: creditPoints } },
    });

    // Record product event
    await prisma.productEvent.create({
      data: {
        productId: returnCase.productItem.product.id,
        eventType: "routed",
        description: `Routed to ${route}: ${conditionMet}`,
        city: returnCase.region,
        carbonDelta: getCarbonSaved(route),
      },
    });

    return NextResponse.json({
      routingId: routingDecision.id,
      route,
      priority,
      conditionMet,
      greenCreditsAwarded: creditPoints,
      carbonSaved: getCarbonSaved(route),
    });
  } catch (error) {
    console.error("POST /api/ai/route error:", error);
    return NextResponse.json({ error: "Routing failed" }, { status: 500 });
  }
}

function getCreditPoints(route: string): number {
  const map: Record<string, number> = {
    PEER_EXCHANGE: 45,
    DONATE: 40,
    RESALE: 30,
    REFURBISH: 30,
    LIQUIDATE: 10,
  };
  return map[route] || 10;
}

function getCarbonSaved(route: string): number {
  const map: Record<string, number> = {
    PEER_EXCHANGE: 4.5,
    RESALE: 4.2,
    DONATE: 3.8,
    REFURBISH: 3.1,
    LIQUIDATE: 1.2,
  };
  return map[route] || 0;
}
