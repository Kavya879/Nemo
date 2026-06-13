import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/fit/recommend
 * Get fit recommendation for a brand + category + size combo.
 * Uses BrandFitRule data. Always returns deterministic results.
 */
export async function POST(request: Request) {
  try {
    const { brand, category, currentSize, userId } = await request.json();

    if (!brand || !category) {
      return NextResponse.json(
        { error: "Missing required fields: brand, category" },
        { status: 400 }
      );
    }

    // Look up brand fit rule
    const fitRule = await prisma.brandFitRule.findUnique({
      where: {
        brand_category: { brand, category },
      },
    });

    // Look up user size profile if userId provided
    let userProfile = null;
    if (userId) {
      userProfile = await prisma.sizeProfile.findUnique({
        where: {
          userId_category: { userId, category },
        },
      });
    }

    if (!fitRule) {
      // No data for this brand — return generic recommendation
      return NextResponse.json({
        brand,
        category,
        currentSize: currentSize || null,
        recommendation: "No fit data available for this brand. Order your usual size.",
        sizeAdjustment: 0,
        fitType: "unknown",
        confidence: 0,
        sampleSize: 0,
        userProfile: userProfile
          ? { usualSize: userProfile.usualSize, preferredFit: userProfile.preferredFit }
          : null,
        source: "no-data",
      });
    }

    // Build personalized recommendation
    let recommendation = fitRule.recommendation;
    if (userProfile && currentSize) {
      if (fitRule.sizeAdjustment !== 0 && currentSize === userProfile.usualSize) {
        const direction = fitRule.sizeAdjustment > 0 ? "up" : "down";
        recommendation = `Based on your profile (${userProfile.usualSize}, ${userProfile.preferredFit || "regular"} fit): Size ${direction} by ${Math.abs(fitRule.sizeAdjustment)} for ${brand}. ${fitRule.recommendation}`;
      }
    }

    return NextResponse.json({
      brand,
      category,
      currentSize: currentSize || null,
      recommendation,
      sizeAdjustment: fitRule.sizeAdjustment,
      fitType: fitRule.fitType,
      confidence: fitRule.confidence,
      sampleSize: fitRule.sampleSize,
      notes: fitRule.notes,
      userProfile: userProfile
        ? { usualSize: userProfile.usualSize, preferredFit: userProfile.preferredFit, footWidth: userProfile.footWidth }
        : null,
      source: "brand-fit-rule",
    });
  } catch (error) {
    console.error("POST /api/fit/recommend error:", error);
    return NextResponse.json({ error: "Fit recommendation failed" }, { status: 500 });
  }
}
