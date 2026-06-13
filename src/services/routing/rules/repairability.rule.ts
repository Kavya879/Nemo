import { type Rule } from "../types";

/**
 * Repairability rule → REFURBISH.
 *
 * Items with some wear/damage (B/C/D) that are sufficiently repairable are
 * worth restoring: refurbishment recovers resale value. The more repairable,
 * the stronger the candidate.
 */
export const repairabilityRule: Rule = (ctx, rules) => {
  const refurbishable =
    ctx.grade === "B" || ctx.grade === "C" || ctx.grade === "D";
  if (!refurbishable) return null;
  if (ctx.repairability < rules.repairabilityThreshold) return null;

  const score = 0.5 + ctx.repairability * 0.35;

  const reasoning = `Grade ${ctx.grade} but highly repairable (repairability ${ctx.repairability.toFixed(
    2,
  )} ≥ threshold ${rules.repairabilityThreshold.toFixed(
    2,
  )}) — refurbishing restores resale value.`;

  return { path: "REFURBISH", score, reasoning };
};
