import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

/**
 * POST /api/pricing/suggest
 * Estimate resale price for an item based on grade, category, age, and original price.
 * Falls back to deterministic formula if Ollama is unavailable.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, brand, category, grade, originalPrice, purchaseDate } = body;

    if (!title || !category || !grade) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, grade" },
        { status: 400 }
      );
    }

    const gradeMultipliers: Record<string, number> = { A: 0.70, B: 0.50, C: 0.30, D: 0.15 };
    const categoryMultipliers: Record<string, number> = {
      ELECTRONICS: 1.15, FOOTWEAR: 1.05, APPAREL: 0.90, HOME: 1.00, BOOKS: 0.85, TOYS: 0.95, OTHER: 1.00,
    };

    let basePrice: number | null = null;
    let confidence = 82;
    let source = "formula";

    if (originalPrice && originalPrice > 0) {
      basePrice = originalPrice * (gradeMultipliers[grade] || 0.50);
      confidence = 82;
    } else {
      // Try Ollama for price estimation
      const ollamaPrice = await tryOllamaEstimate(title, brand, category);
      if (ollamaPrice) {
        basePrice = ollamaPrice * (gradeMultipliers[grade] || 0.50);
        confidence = 60;
        source = "ollama";
      } else {
        // Deterministic fallback based on category averages
        basePrice = getFallbackBasePrice(category) * (gradeMultipliers[grade] || 0.50);
        confidence = 45;
        source = "fallback";
      }
    }

    // Apply category demand multiplier
    const categoryMultiplier = categoryMultipliers[category] || 1.00;
    let estimatedPrice = basePrice * categoryMultiplier;

    // Apply age decay: 2% per month, floor 0.60
    if (purchaseDate) {
      const months = getMonthsElapsed(new Date(purchaseDate));
      const ageMultiplier = Math.max(0.60, 1.0 - 0.02 * months);
      estimatedPrice *= ageMultiplier;
    }

    // Enforce minimum price floor (15% of base)
    const priceFloor = basePrice * 0.15;
    estimatedPrice = Math.max(estimatedPrice, priceFloor);

    // Round to 2 decimal places
    estimatedPrice = Math.round(estimatedPrice * 100) / 100;

    // Price range: ±15%
    const priceLow = Math.round(estimatedPrice * 0.85 * 100) / 100;
    const priceHigh = Math.round(estimatedPrice * 1.15 * 100) / 100;

    return NextResponse.json({
      estimatedPrice,
      priceRange: { low: priceLow, high: priceHigh },
      confidence,
      source,
      factors: {
        gradeMultiplier: gradeMultipliers[grade],
        categoryMultiplier,
        ageDecayApplied: !!purchaseDate,
        priceFloor,
      },
    });
  } catch (error) {
    console.error("POST /api/pricing/suggest error:", error);
    return NextResponse.json({ error: "Pricing estimation failed" }, { status: 500 });
  }
}

async function tryOllamaEstimate(title: string, brand: string | null, category: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `Estimate the retail price in INR for: ${title}${brand ? ` by ${brand}` : ""} (category: ${category}). Reply with only a number.`,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const match = data.response?.match(/[\d,]+\.?\d*/);
      if (match) {
        return parseFloat(match[0].replace(/,/g, ""));
      }
    }
  } catch {
    // Ollama unavailable
  }
  return null;
}

function getFallbackBasePrice(category: string): number {
  const averages: Record<string, number> = {
    ELECTRONICS: 5000,
    FOOTWEAR: 3000,
    APPAREL: 2000,
    HOME: 1500,
    BOOKS: 500,
    TOYS: 1200,
    OTHER: 2000,
  };
  return averages[category] || 2000;
}

function getMonthsElapsed(purchaseDate: Date): number {
  const now = new Date();
  return (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
    (now.getMonth() - purchaseDate.getMonth());
}
