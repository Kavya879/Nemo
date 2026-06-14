import type { Grade } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Intelligence repository — pure aggregation queries over EXISTING data that feed
 * the return-prevention signal layer. No business logic: it returns raw counts
 * and outcomes; the signals/ensemble interpret them.
 */

type Scope = { itemId?: string; category?: string; brand?: string; userId?: string };

function whereFor(scope: Scope) {
  const item: Record<string, unknown> = {};
  if (scope.category) item.category = scope.category;
  if (scope.brand) item.brand = scope.brand;
  const where: Record<string, unknown> = {};
  if (scope.itemId) where.itemId = scope.itemId;
  if (scope.userId) where.userId = scope.userId;
  if (Object.keys(item).length) where.item = item;
  return where;
}

export interface GradeOutcomes {
  count: number;
  grades: Grade[];
  /** Number of grade results that recorded at least one flaw. */
  withFlaws: number;
}

export interface VerificationOutcomes {
  count: number;
  avgFraudRisk: number | null;
  avgProductMatch: number | null;
  /** Number of verifications that recorded at least one deviation. */
  withDeviations: number;
}

export const intelligenceRepository = {
  /** Orders placed within a scope (item / category / brand / user). */
  countOrders(scope: Scope): Promise<number> {
    return prisma.order.count({ where: whereFor(scope) });
  },

  /** Return cases opened within a scope. */
  countReturnCases(scope: Scope): Promise<number> {
    return prisma.returnCase.count({ where: whereFor(scope) });
  },

  /** Grade outcomes for the item or brand (quality + defect signals). */
  async gradeOutcomes(scope: Pick<Scope, "itemId" | "brand" | "category">): Promise<GradeOutcomes> {
    const rows = await prisma.gradeResult.findMany({
      where: whereFor(scope),
      select: { grade: true, flaws: true },
    });
    const withFlaws = rows.filter((r) => Array.isArray(r.flaws) && (r.flaws as unknown[]).length > 0).length;
    return { count: rows.length, grades: rows.map((r) => r.grade), withFlaws };
  },

  /** Verification outcomes for the item or brand (authenticity + counterfeit signals). */
  async verificationOutcomes(
    scope: Pick<Scope, "itemId" | "brand" | "category">,
  ): Promise<VerificationOutcomes> {
    const rows = await prisma.verificationResult.findMany({
      where: whereFor(scope),
      select: { fraudRiskScore: true, productMatchConfidence: true, deviations: true },
    });
    if (rows.length === 0) {
      return { count: 0, avgFraudRisk: null, avgProductMatch: null, withDeviations: 0 };
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const withDeviations = rows.filter(
      (r) => Array.isArray(r.deviations) && (r.deviations as unknown[]).length > 0,
    ).length;
    return {
      count: rows.length,
      avgFraudRisk: mean(rows.map((r) => r.fraudRiskScore)),
      avgProductMatch: mean(rows.map((r) => r.productMatchConfidence)),
      withDeviations,
    };
  },
};
