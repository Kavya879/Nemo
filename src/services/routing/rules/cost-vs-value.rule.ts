import { inr, type Rule } from "../types";

/**
 * Cost-vs-value rule → RESELL_AS_IS.
 *
 * For good-condition items (A/B) where the expected resale value exceeds the
 * cost of re-listing, the simplest profitable path is to list it as-is. The
 * bigger the margin, the higher the score.
 */
export const costVsValueRule: Rule = (ctx) => {
  const sellable = ctx.grade === "A" || ctx.grade === "B";
  if (!sellable) return null;
  if (ctx.resaleValue <= ctx.relistingCost) return null;

  const margin = ctx.resaleValue - ctx.relistingCost;
  const marginRatio = ctx.resaleValue > 0 ? margin / ctx.resaleValue : 0;
  const score = 0.6 + Math.min(Math.max(marginRatio, 0), 0.3);

  const reasoning = `Resale value (${inr(ctx.resaleValue)}) exceeds re-listing cost (${inr(
    ctx.relistingCost,
  )}) by ${inr(margin)}, and the item is Grade ${ctx.grade} — list it directly for resale.`;

  return { path: "RESELL_AS_IS", score, reasoning };
};
