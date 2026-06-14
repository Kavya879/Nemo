import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_TIMEOUT = 5000;

/**
 * POST /api/ai/inspect
 * Two modes:
 * 1. With returnId — grades an existing database record
 * 2. Without returnId — direct grading from form data (used by customer flow)
 *
 * Always falls back to deterministic grading if AI service is unavailable.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { returnId, title, brand, category, reason, details, imageUrls, imageCount } = body;

    // Determine input source
    let inputTitle: string;
    let inputBrand: string | null;
    let inputCategory: string;
    let inputReason: string;
    let inputDetails: string;
    let inputImageUrls: string[];
    let inputImageCount: number;
    let productItemId: string | null = null;

    if (returnId) {
      // Mode 1: Database-backed grading
      const returnCase = await prisma.return.findUnique({
        where: { id: returnId },
        include: {
          productItem: { include: { product: true, images: true } },
        },
      });

      if (!returnCase) {
        return NextResponse.json({ error: "Return case not found" }, { status: 404 });
      }

      inputTitle = returnCase.productItem.product.title;
      inputBrand = returnCase.productItem.product.brand;
      inputCategory = returnCase.productItem.product.category;
      inputReason = returnCase.reason;
      inputDetails = returnCase.details || "";
      inputImageUrls = returnCase.productItem.images.map((img) => img.url);
      inputImageCount = returnCase.productItem.images.length;
      productItemId = returnCase.productItem.id;
    } else {
      // Mode 2: Direct grading from form (no DB record needed)
      if (!title || !reason) {
        return NextResponse.json({ error: "Missing title or reason" }, { status: 400 });
      }
      inputTitle = title;
      inputBrand = brand || null;
      inputCategory = category || "OTHER";
      inputReason = reason;
      inputDetails = details || "";
      inputImageUrls = imageUrls || [];
      inputImageCount = imageCount || imageUrls?.length || 0;
    }

    // ─── Attempt FastAPI AI service ──────────────────────────────────────────
    let aiResult: AIResult | null = null;
    let fallbackMode = false;
    const servicesUsed: string[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);

      const response = await fetch(`${AI_SERVICE_URL}/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inputTitle,
          brand: inputBrand,
          category: inputCategory,
          reason: inputReason,
          details: inputDetails,
          image_urls: inputImageUrls,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        aiResult = {
          conditionScore: data.condition_score,
          qualityScore: data.quality_score,
          historyScore: data.history_score,
          severeTerms: data.severe_terms || [],
          mildTerms: data.mild_terms || [],
          unusedTerms: data.unused_terms || [],
          laplacianVar: data.vision?.blur || null,
          brightnessMean: data.vision?.brightness || null,
          edgeDensity: data.vision?.edge_density || null,
          isClear: data.vision?.is_clear || false,
          yoloDefects: data.yolo_defects || 0,
          yoloLabels: [],
          reasoning: data.ai_summary || "",
          riskFlags: data.risk_flags || [],
        };
        servicesUsed.push(...(data.services_used || ["fastapi"]));
      }
    } catch {
      // AI service unavailable
      fallbackMode = true;
    }

    // ─── Deterministic fallback ──────────────────────────────────────────────
    if (!aiResult) {
      fallbackMode = true;
      aiResult = computeFallbackInspection(inputReason, inputDetails, inputImageCount);
      servicesUsed.push("local-fallback");
    }

    // ─── Compute grades ──────────────────────────────────────────────────────
    const conditionScore = aiResult.conditionScore;
    const qualityScore = aiResult.qualityScore;
    const historyScore = aiResult.historyScore;
    const confidence = Math.round((conditionScore + qualityScore + historyScore) / 3);
    const grade = confidence >= 86 ? "A" : confidence >= 70 ? "B" : confidence >= 52 ? "C" : "D";

    const routeReason = getRouteReason(grade, conditionScore);
    const nextAction = getNextAction(grade);
    const riskFlags = aiResult.riskFlags.length > 0 ? aiResult.riskFlags : ["No major quality risk detected."];
    const greenCredits = getGreenCredits(grade);

    // ─── Persist to DB if returnId provided ──────────────────────────────────
    let inspectionId: string | null = null;
    let healthCardId: string | null = null;

    if (returnId && productItemId) {
      const inspection = await prisma.aIInspection.create({
        data: {
          productItemId,
          returnId,
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
      inspectionId = inspection.id;

      const healthCard = await prisma.healthCard.create({
        data: {
          productItemId,
          returnId,
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
      healthCardId = healthCard.id;

      await prisma.return.update({ where: { id: returnId }, data: { status: "GRADED" } });
      await prisma.productItem.update({ where: { id: productItemId }, data: { condition: grade as "A" | "B" | "C" | "D", status: "GRADED" } });
    }

    // ─── Return result ───────────────────────────────────────────────────────
    return NextResponse.json({
      inspectionId,
      healthCard: {
        id: healthCardId,
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
      reasoning: aiResult.reasoning,
      fallbackMode,
      servicesUsed,
    });
  } catch (error) {
    console.error("POST /api/ai/inspect error:", error);
    return NextResponse.json({ error: "Inspection failed" }, { status: 500 });
  }
}

// ─── Types & Helpers ───────────────────────────────────────────────────────────

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
  if (imageCount < 2) riskFlags.push("Upload at least 2 images to improve grading confidence.");
  if (text.includes("missing")) riskFlags.push("Accessory completeness must be verified.");

  const reasoning = severeTerms.length > 0
    ? "Defect indicators detected. Condition score reduced accordingly. Manual inspection recommended."
    : unusedTerms.length > 0
    ? "Item appears unused based on text indicators. High condition confidence."
    : "Standard return with moderate condition signals. No critical defects in text analysis.";

  return {
    conditionScore, qualityScore, historyScore,
    severeTerms, mildTerms, unusedTerms,
    laplacianVar: null, brightnessMean: null, edgeDensity: null,
    isClear: imageCount >= 2, yoloDefects: 0, yoloLabels: [],
    reasoning, riskFlags,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRouteReason(grade: string, conditionScore: number): string {
  if (grade === "A" || (grade === "B" && conditionScore > 78))
    return "Item in excellent condition — suitable for direct resale.";
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
