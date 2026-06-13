import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_TIMEOUT = 12000;

/**
 * POST /api/listings/rewrite
 * Generate an AI-powered listing rewrite based on return patterns.
 * Falls back to deterministic template-based rewrites if Ollama is unavailable.
 */
export async function POST(request: Request) {
  try {
    const { auditId, listingTitle, description, returnReasons } = await request.json();

    if (!listingTitle || !returnReasons || returnReasons.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: listingTitle, returnReasons" },
        { status: 400 }
      );
    }

    // Attempt Ollama rewrite
    let rewriteResult: RewriteResult | null = null;
    let source = "fallback";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

      const prompt = buildRewritePrompt(listingTitle, description || "", returnReasons);
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        rewriteResult = parseOllamaRewrite(data.response, listingTitle);
        source = "ollama";
      }
    } catch {
      // Ollama unavailable — use fallback
    }

    // Deterministic fallback
    if (!rewriteResult) {
      rewriteResult = computeFallbackRewrite(listingTitle, description || "", returnReasons);
      source = "fallback";
    }

    // Persist to database if auditId provided
    if (auditId) {
      await prisma.sellerListingAudit.update({
        where: { id: auditId },
        data: {
          detectedIssue: rewriteResult.detectedIssue,
          revisedTitle: rewriteResult.revisedTitle,
          revisedDesc: rewriteResult.revisedDesc,
          preventionTip: rewriteResult.preventionTip,
          rewriteStatus: "generated",
        },
      });
    }

    return NextResponse.json({
      ...rewriteResult,
      source,
    });
  } catch (error) {
    console.error("POST /api/listings/rewrite error:", error);
    return NextResponse.json({ error: "Rewrite generation failed" }, { status: 500 });
  }
}

type RewriteResult = {
  detectedIssue: string;
  revisedTitle: string;
  revisedDesc: string;
  preventionTip: string;
};

function buildRewritePrompt(title: string, description: string, reasons: string[]): string {
  return `You are a product listing optimizer. Given a product listing and its return reasons, generate an improved listing.

Product: ${title}
Description: ${description}
Return Reasons: ${reasons.join(", ")}

Respond in this exact JSON format:
{
  "detectedIssue": "brief description of the main problem",
  "revisedTitle": "improved title (max 200 chars)",
  "revisedDesc": "improved description (max 2000 chars)",
  "preventionTip": "tip to prevent these returns (max 500 chars)"
}`;
}

function parseOllamaRewrite(response: string, fallbackTitle: string): RewriteResult | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        detectedIssue: (parsed.detectedIssue || "").slice(0, 500),
        revisedTitle: (parsed.revisedTitle || fallbackTitle).slice(0, 200),
        revisedDesc: (parsed.revisedDesc || "").slice(0, 2000),
        preventionTip: (parsed.preventionTip || "").slice(0, 500),
      };
    }
  } catch {
    // Parse failed
  }
  return null;
}

function computeFallbackRewrite(title: string, description: string, reasons: string[]): RewriteResult {
  const reasonText = reasons.join(" ").toLowerCase();

  // Detect issue pattern
  let detectedIssue: string;
  let titleSuffix: string;
  let preventionTip: string;

  if (reasonText.includes("size") || reasonText.includes("tight") || reasonText.includes("small") || reasonText.includes("fit")) {
    detectedIssue = "Size/fit expectations mismatch — buyers receive different fit than expected";
    titleSuffix = " — check size guide before ordering";
    preventionTip = "Add a prominent size guide comparison. Mention if the item runs small, large, or narrow.";
  } else if (reasonText.includes("bright") || reasonText.includes("color") || reasonText.includes("different")) {
    detectedIssue = "Product appearance differs from listing photos/description";
    titleSuffix = " — see actual product photos";
    preventionTip = "Use natural lighting photos. Clearly state dimensions, brightness levels, or color accuracy.";
  } else if (reasonText.includes("quality") || reasonText.includes("cheap") || reasonText.includes("broken")) {
    detectedIssue = "Quality expectations not met — product perceived as lower quality than listed";
    titleSuffix = " — detailed specs inside";
    preventionTip = "List exact materials, certifications, and quality indicators. Set accurate expectations.";
  } else {
    detectedIssue = `Repeated returns (${reasons.length} reasons) suggest listing clarity issue`;
    titleSuffix = " — read full specs before buying";
    preventionTip = "Review the most common return reasons and address them directly in the listing description.";
  }

  const revisedTitle = (title + titleSuffix).slice(0, 200);
  const revisedDesc = description
    ? `${description}\n\n⚠️ Important: ${preventionTip}`
    : `${title}. ${preventionTip}`;

  return {
    detectedIssue,
    revisedTitle,
    revisedDesc: revisedDesc.slice(0, 2000),
    preventionTip,
  };
}
