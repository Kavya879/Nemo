import { configRepository } from "@/repositories/config.repository";
import { returnRepository } from "@/repositories/return.repository";

/**
 * Prevention service — "the best return is no return".
 *
 * Given a product category + an optional shopper profile, it mines historical
 * return reasons and returns personalized pre-purchase guidance with a
 * confidence score. The dominant return reason drives the message; the profile
 * personalizes it. Confidence + base settings come from config.
 */

export interface ShopperProfile {
  /** Free-form attributes, e.g. { footProfile: "wide", preferredSize: "8" }. */
  [key: string]: string | undefined;
}

export interface PreventionInput {
  category: string;
  profile?: ShopperProfile;
}

export interface PreventionResult {
  message: string;
  confidence: number;
  topReason: string | null;
  sampleSize: number;
}

/** Classifies a free-text return reason into a coarse bucket. */
function classify(reason: string): "sizing" | "color" | "defective" | "other" {
  const r = reason.toLowerCase();
  if (r.includes("size") || r.includes("fit") || r.includes("small") || r.includes("large"))
    return "sizing";
  if (r.includes("color") || r.includes("colour") || r.includes("picture")) return "color";
  if (r.includes("defect") || r.includes("broken") || r.includes("damaged")) return "defective";
  return "other";
}

/** Pure guidance core — trivially unit-testable. */
export function buildGuidance(
  reasons: string[],
  profile: ShopperProfile | undefined,
  baseConfidence: number,
): PreventionResult {
  if (reasons.length === 0) {
    return {
      message:
        "We don't have enough return history yet, but double-check size and specs before ordering — it helps avoid a return.",
      confidence: Number((baseConfidence * 0.5).toFixed(2)),
      topReason: null,
      sampleSize: 0,
    };
  }

  // Tally and find the dominant reason.
  const counts = new Map<string, number>();
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
  let topReason = reasons[0];
  let topCount = 0;
  for (const [reason, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topReason = reason;
    }
  }

  const ratio = topCount / reasons.length;
  const confidence = Math.min(0.99, Number((baseConfidence + ratio * 0.25).toFixed(2)));
  const bucket = classify(topReason);

  const size = profile?.preferredSize;
  const trait = profile?.footProfile ?? profile?.fitProfile ?? profile?.bodyProfile;

  let message: string;
  switch (bucket) {
    case "sizing":
      message =
        trait && size
          ? `Most returns here are about fit. Customers with your ${trait} profile usually prefer size ${size} in this brand — consider sizing accordingly.`
          : `Most returns in this category are sizing-related (${Math.round(
              ratio * 100,
            )}% of cases). Check the size chart carefully before ordering.`;
      break;
    case "color":
      message = `A common reason for returns here is color/appearance differing from the photos. Review all images and recent buyer photos before purchasing.`;
      break;
    case "defective":
      message = `Some returns here cite defects on arrival. This item is Amazon Nemo-inspected — but inspect on delivery and report issues within the return window.`;
      break;
    default:
      message = `Most returns here cite "${topReason}". Review the product details against your needs before ordering to avoid a return.`;
  }

  return { message, confidence, topReason, sampleSize: reasons.length };
}

export function createPreventionService() {
  return {
    async guide(input: PreventionInput): Promise<PreventionResult> {
      const config = await configRepository.getRules();
      const returns = await returnRepository.listForCategory(input.category);
      const reasons = returns.map((r) => r.reason);
      return buildGuidance(reasons, input.profile, config.preventionBaseConfidence);
    },
  };
}

export const preventionService = createPreventionService();
