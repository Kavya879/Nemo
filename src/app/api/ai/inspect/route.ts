import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_TIMEOUT = 5000;

/**
 * POST /api/ai/inspect
 * Run AI inspection on a return case. Falls back to deterministic text-based grading
 * if the AI service is unavailable.
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
          include: {
            product: true,
            images: true,
          },
        },
      },
    });

    if (!returnCase) {
      return NextResponse.json({ error: "Return case not found" }, { status: 404 });
    }

    // Attempt AI service call
    let aiResult: AIResult | null = null;
    let fallbackMode = false;
    const servicesUsed: string[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);

      const response = await fetch(`${AI_SERVICE_URL}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: returnCase.productItem.product.title,
          brand: returnCase.productItem.product.brand,
          category: returnCase.productItem.product.category,
          reason: returnCase.reason,
          details: returnCase.details,
          image_urls: returnCase.productItem.images.map((img) => img.url),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        aiResult = await response.json();
        servicesUsed.push("fastapi", "opencv");
      }
    } catch {
      // AI service unavailable — use fallback
      fallbackMode = true;
    }

    // Deterministic fallback grading
    if (!aiResult) {
      fallbackMode = true;
      aiResult = computeFallbackInspection(
        returnCase.reason,
        returnCase.details || "",
        returnCase.productItem.images.length
      );
      servicesUsed.push("client-side-fallback");
    }

    // Store inspection in database
    const inspection = await prisma.aIInspection.create({
      data: {
        productItemId: returnCase.productItem.id,
        returnId: returnCase.id,
        severeTerms: aiResult.severeTerms,
        mildTerms: aiResult.mildTerms,
        unusedTerms: aiResult.unusedTerms,
        laplacianVar: aiResult.laplacianVar,
        brightnessMean: aiResult.brightnessMean,
        edgeDensity: aiResult.edgeDensity,
        isClear: aiResult.isClear,
        yoloDefects: aiResult.yoloDefects,
        yoloLabels: aiResult.yoloLabels,
        reasoning: aiResult.reasoning,
        reasoningSource: fallbackMode ? "fallback" : "ollama",
        servicesUsed,
        fallbackMode,
      },
    });

    // Create health card
    const conditionScore = aiResult.conditionScore;
    const qualityScore = aiResult.qualityScore;
    const historyScore = aiResult.historyScore;
    const confidence = Math.round((conditionScore + qualityScore + historyScore) / 3);
    const grade = confidence >= 86 ? "A" : confidence >= 70 ? "B" : confidence >= 52 ? "C" : "D";

    const routeReason = getRouteReason(grade, conditionScore);
    const nextAction = getNextAction(grade);
    const riskFlags = aiResult.riskFlags || [];
    const greenCredits = getGreenCredits(grade);

    const healthCard = await prisma.healthCard.create({
      data: {
        productItemId: returnCase.productItem.id,
        returnId: returnCase.id,
        conditionScore,
        qualityScore,
        historyScore,
        confidence,
        grade: grade as "A" | "B" | "C" | "D",
        routeReason,
        nextAction,
        riskFlags,
        greenCredits,
      },
    });

    // Update return status
    await prisma.return.update({
      where: { id: returnId },
      data: { status: "GRADED" },
    });

    // Update product item condition
    await prisma.productItem.update({
      where: { id: returnCase.productItem.id },
      data: { condition: grade as "A" | "B" | "C" | "D", status: "GRADED" },
    });

    return NextResponse.json({
      inspectionId: inspection.id,
      healthCard: {
        id: healthCard.id,
        conditionScore,
        qualityScore,
        historyScore,
        confidence,
        grade,
        routeReason,
        nextAction,
        riskFlags,
        greenCredits,
      },
      fallbackMode,
      servicesUsed,
    });
  } catch (error) {
    console.error("POST /api/ai/inspect error:", error);
    return NextResponse.json({ error: "Inspection failed" }, { status: 500 });
  }
}

// ─── Fallback grading logic ────────────────────────────────────────────────────

type AIResult = {
  conditionScore: number;
  qualityScore: number;
  historyScore: number;
  severeTerms: string[];
  mildTerms: string[];
  unusedTerms: string[];
  laplacianVar: number | null;
  brightnessMean: number | null;
  edgeDensity: number | null;
  isClear: boolean;
  yoloDefects: number;
  yoloLabels: string[];
  reasoning: string;
  riskFlags: string[];
};

function computeFallbackInspection(reason: string, details: string, imageCount: number): AIResult {
  const text = `${reason} ${details}`.toLowerCase();

  const severeList = ["broken", "cracked", "dead", "missing", "fake", "torn"];
  const mildList = ["opened", "scratch", "loose", "box", "minor"];
  const unusedList = ["unused", "new", "sealed", "wrong", "duplicate", "gift"];

  const severeTerms = severeList.filter((t) => text.includes(t));
  const mildTerms = mildList.filter((t) => text.includes(t));
  const unusedTerms = unusedList.filter((t) => text.includes(t));

  const imageSignal = Math.min(imageCount * 5, 15);
  const conditionScore = clamp(88 + imageSignal + unusedTerms.length * 4 - severeTerms.length * 22 - mildTerms.length * 7, 12, 98);
  const qualityScore = clamp(82 + imageSignal - severeTerms.length * 16, 18, 96);
  const historyScore = clamp(78 + unusedTerms.length * 5 - severeTerms.length * 10 - mildTerms.length * 3, 20, 94);

  const riskFlags: string[] = [];
  if (severeTerms.length > 0) riskFlags.push("Manual inspection required before resale.");
  if (imageCount < 2) riskFlags.push("Ask for at least two images to improve confidence.");
  if (text.includes("missing")) riskFlags.push("Accessory completeness must be verified.");
  if (riskFlags.length === 0) riskFlags.push("No major quality risk detected.");

  const reasoning = severeTerms.length > 0
    ? "Defect indicators detected in text. Condition score reduced accordingly."
    : unusedTerms.length > 0
    ? "Item appears unused based on text indicators. High condition expected."
    : "Standard return with moderate condition signals.";

  return {
    conditionScore,
    qualityScore,
    historyScore,
    severeTerms,
    mildTerms,
    unusedTerms,
    laplacianVar: null,
    brightnessMean: null,
    edgeDensity: null,
    isClear: imageCount >= 2,
    yoloDefects: 0,
    yoloLabels: [],
    reasoning,
    riskFlags,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRouteReason(grade: string, conditionScore: number): string {
  if (grade === "A" || (grade === "B" && conditionScore > 78)) {
    return "Item in excellent condition — suitable for direct resale.";
  }
  if (grade === "C") return "Functional but cosmetic issues present — community donation recommended.";
  return "Significant quality issues — liquidation or parts recovery.";
}

function getNextAction(grade: string): string {
  if (grade === "A") return "Seal for pickup. ReLoop will relist after identity-safe inspection.";
  if (grade === "B") return "Minor preparation needed before marketplace listing.";
  if (grade === "C") return "Route to verified donation partner on next logistics run.";
  return "Bundle for liquidation or parts recovery with sustainability tracking.";
}

function getGreenCredits(grade: string): number {
  if (grade === "A" || grade === "B") return 30;
  if (grade === "C") return 40;
  return 10;
}
