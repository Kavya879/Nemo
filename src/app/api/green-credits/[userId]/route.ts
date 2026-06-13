import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/green-credits/[userId]
 * Get green credit balance and ledger for a user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, greenCredits: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ledger = await prisma.greenCreditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Group by category for summary
    const summary: Record<string, number> = {};
    for (const entry of ledger) {
      summary[entry.category] = (summary[entry.category] || 0) + entry.points;
    }

    return NextResponse.json({
      userId: user.id,
      name: user.name,
      totalCredits: user.greenCredits,
      summary,
      ledger: ledger.map((entry) => ({
        id: entry.id,
        action: entry.action,
        points: entry.points,
        reason: entry.reason,
        category: entry.category,
        returnId: entry.returnId,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/green-credits/[userId] error:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
