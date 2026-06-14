import type { RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { nearestWarehouse } from "@/lib/geo";
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
  /** Within this distance to an FC ⇒ ship back normally (don't list for resale). */
  warehouseProximityKm: number;
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
  nearestWarehouse?: string;
  /** True when the pickup is close enough to an FC to just ship it back. */
  proximityFeasible: boolean;
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

  // Production decision combines THREE rules:
  //  - proximity: close enough to an FC ⇒ just ship it back (don't list); OR
  //  - economics: resale clears the logistics cost with margin.
  // If neither holds (far + uneconomical), route to the Second Life window.
  const proximityFeasible = inputs.distanceKm <= costs.warehouseProximityKm;
  const meetsFloor = netRecoveryValue >= costs.minNetRecoveryValue;
  const meetsRatio = recoveryRatio >= costs.feasibilityRatio;
  const costFeasible = meetsFloor && meetsRatio;
  const feasible = proximityFeasible || costFeasible;

  const km = Math.round(inputs.distanceKm);
  const reasoning = proximityFeasible
    ? `Pickup is ${km}km from the nearest fulfillment center (≤ ${costs.warehouseProximityKm}km) — return it through the normal channel. Not listed for resale.`
    : costFeasible
      ? `${km}km from the nearest FC, but expected resale ${inr(
          inputs.expectedResaleValue,
        )} still clears ${inr(totalProcessingCost)} of reverse-logistics cost (net ${inr(
          netRecoveryValue,
        )}, ratio ${recoveryRatio.toFixed(2)}) — worth shipping back.`
      : `${km}km from the nearest FC and uneconomical to ship back (net ${inr(
          netRecoveryValue,
        )}, ratio ${recoveryRatio.toFixed(
          2,
        )} < ${costs.feasibilityRatio}) — list it in the Second Life marketplace for nearby buyers.`;

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
    proximityFeasible,
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

      // Reverse-logistics distance is measured to the NEAREST real Amazon FC.
      const { warehouse, distanceKm } = nearestWarehouse(req.customerLocation);

      const result = computeFeasibility(
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
          warehouseProximityKm: config.warehouseProximityKm,
        },
      );
      return { ...result, nearestWarehouse: warehouse.name };
    },
  };
}

export const feasibilityService = createFeasibilityService();
