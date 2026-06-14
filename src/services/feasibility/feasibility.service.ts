import type { RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { haversineKm } from "@/lib/geo";
import { pricingService } from "@/services/pricing/pricing.service";
import { inr } from "@/services/routing/types";
import type { Grade, GeoPoint } from "@/types";

/**
 * Feasibility Analysis Engine.
 *
 * Given a graded item, it builds the full reverse-logistics cost model and the
 * recovery economics, then decides whether returning the item to the seller is
 * economically viable. Every figure is computed from config (RoutingConfig) —
 * nothing is hardcoded, nothing is a simple two-number comparison: the decision
 * combines an absolute net-recovery floor AND a recovery-to-cost ratio.
 */

/** Per-grade repackaging effort multiplier (worse condition ⇒ more rework). */
const REPACKAGING_GRADE_MULTIPLIER: Record<Grade, number> = {
  A: 1,
  B: 1.2,
  C: 1.5,
  D: 2,
};

export interface FeasibilityCostModel {
  pickupBaseCost: number;
  transportCostPerKm: number;
  warehouseHandlingCost: number;
  inspectionCost: number;
  repackagingBaseCost: number;
  storageCostPerDay: number;
  estimatedStorageDays: number;
  minNetRecoveryValue: number;
  feasibilityRatio: number;
}

export interface FeasibilityInputs {
  grade: Grade;
  originalValue: number;
  /** Intrinsic value after grading (depreciation), ₹. */
  estimatedCurrentValue: number;
  /** Expected resale value if sold, ₹. */
  expectedResaleValue: number;
  /** Distance customer → return warehouse, km. */
  distanceKm: number;
}

export interface FeasibilityResult {
  originalValue: number;
  estimatedCurrentValue: number;
  pickupCost: number;
  transportationCost: number;
  warehouseHandlingCost: number;
  inspectionCost: number;
  repackagingCost: number;
  storageCost: number;
  totalProcessingCost: number;
  expectedResaleValue: number;
  netRecoveryValue: number;
  recoveryRatio: number;
  distanceKm: number;
  decision: "FEASIBLE" | "NOT_FEASIBLE";
  reasoning: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure feasibility core — fully deterministic and unit-testable. No I/O.
 */
export function computeFeasibility(
  inputs: FeasibilityInputs,
  costs: FeasibilityCostModel,
): FeasibilityResult {
  const pickupCost = round2(costs.pickupBaseCost);
  const transportationCost = round2(inputs.distanceKm * costs.transportCostPerKm);
  const warehouseHandlingCost = round2(costs.warehouseHandlingCost);
  const inspectionCost = round2(costs.inspectionCost);
  const repackagingCost = round2(
    costs.repackagingBaseCost * REPACKAGING_GRADE_MULTIPLIER[inputs.grade],
  );
  const storageCost = round2(costs.storageCostPerDay * costs.estimatedStorageDays);

  const totalProcessingCost = round2(
    pickupCost +
      transportationCost +
      warehouseHandlingCost +
      inspectionCost +
      repackagingCost +
      storageCost,
  );

  const netRecoveryValue = round2(inputs.expectedResaleValue - totalProcessingCost);
  const recoveryRatio =
    totalProcessingCost > 0
      ? round2(inputs.expectedResaleValue / totalProcessingCost)
      : Infinity;

  // Production decision: BOTH an absolute floor and a margin ratio must hold.
  const meetsFloor = netRecoveryValue >= costs.minNetRecoveryValue;
  const meetsRatio = recoveryRatio >= costs.feasibilityRatio;
  const feasible = meetsFloor && meetsRatio;

  const reasoning = feasible
    ? `Returning is economically viable: expected resale ${inr(
        inputs.expectedResaleValue,
      )} against ${inr(totalProcessingCost)} of reverse-logistics cost leaves ${inr(
        netRecoveryValue,
      )} net recovery (ratio ${recoveryRatio.toFixed(2)} ≥ ${costs.feasibilityRatio}). Approve the return.`
    : `Returning is NOT viable: ${inr(
        totalProcessingCost,
      )} of pickup, ${Math.round(inputs.distanceKm)}km transport, handling, inspection, repackaging and storage cost leaves only ${inr(
        netRecoveryValue,
      )} net recovery (ratio ${recoveryRatio.toFixed(
        2,
      )} < ${costs.feasibilityRatio}). Route to the Second Life opportunity window instead.`;

  return {
    originalValue: round2(inputs.originalValue),
    estimatedCurrentValue: round2(inputs.estimatedCurrentValue),
    pickupCost,
    transportationCost,
    warehouseHandlingCost,
    inspectionCost,
    repackagingCost,
    storageCost,
    totalProcessingCost,
    expectedResaleValue: round2(inputs.expectedResaleValue),
    netRecoveryValue,
    recoveryRatio,
    distanceKm: round2(inputs.distanceKm),
    decision: feasible ? "FEASIBLE" : "NOT_FEASIBLE",
    reasoning,
  };
}

function depreciationFor(config: RoutingConfig, grade: Grade): number {
  const map = (config.depreciationByGrade as Record<string, number> | null) ?? {
    A: 0.85,
    B: 0.65,
    C: 0.45,
    D: 0.2,
  };
  return map[grade] ?? 0.4;
}

export interface AnalyzeRequest {
  grade: Grade;
  originalPrice: number;
  category: string;
  /** Customer location — transport distance is measured from here to the warehouse. */
  customerLocation: GeoPoint;
  /** Nearby demand count (feeds the resale pricing premium). */
  demandCount: number;
}

export function createFeasibilityService() {
  return {
    async analyze(req: AnalyzeRequest): Promise<FeasibilityResult> {
      const config = await configRepository.getRules();

      const estimatedCurrentValue =
        req.originalPrice * depreciationFor(config, req.grade);

      const pricing = await pricingService.price({
        grade: req.grade,
        originalPrice: req.originalPrice,
        category: req.category,
        demandCount: req.demandCount,
      });

      const distanceKm = haversineKm(req.customerLocation, {
        lat: config.warehouseLat,
        lng: config.warehouseLng,
      });

      return computeFeasibility(
        {
          grade: req.grade,
          originalValue: req.originalPrice,
          estimatedCurrentValue,
          expectedResaleValue: pricing.price,
          distanceKm,
        },
        {
          pickupBaseCost: config.pickupBaseCost,
          transportCostPerKm: config.transportCostPerKm,
          warehouseHandlingCost: config.warehouseHandlingCost,
          inspectionCost: config.inspectionCost,
          repackagingBaseCost: config.repackagingBaseCost,
          storageCostPerDay: config.storageCostPerDay,
          estimatedStorageDays: config.estimatedStorageDays,
          minNetRecoveryValue: config.minNetRecoveryValue,
          feasibilityRatio: config.feasibilityRatio,
        },
      );
    },
  };
}

export const feasibilityService = createFeasibilityService();
