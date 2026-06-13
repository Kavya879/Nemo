import type { RoutingConfig } from "@prisma/client";
import { configRepository } from "@/repositories/config.repository";
import { ValidationError } from "@/lib/errors";
import type { Grade } from "@/types";
import { inr } from "@/services/routing/types";

/**
 * Pricing service — suggests a resale price from grade + original price +
 * demand, using the price bands defined in config (e.g. Grade A = 80–90% of
 * original). Pure and testable; the service wrapper just loads config.
 */

export interface PriceBand {
  min: number;
  max: number;
}
export type PriceBands = Record<Grade, PriceBand>;

export interface PriceInput {
  grade: Grade;
  originalPrice: number;
  category: string;
  /** Nearby demand count — high demand nudges toward the top of the band. */
  demandCount: number;
}

export interface PriceResult {
  price: number;
  /** Fraction of original price, 0..1. */
  pricePct: number;
  reasoning: string;
}

/** Pure pricing core. */
export function computePrice(
  input: PriceInput,
  bands: PriceBands,
  demandMultiplier: number,
  demandThreshold = 1,
): PriceResult {
  const band = bands[input.grade];
  if (!band) {
    throw new ValidationError(`No price band configured for grade ${input.grade}.`);
  }

  // Start at the midpoint of the band.
  const mid = (band.min + band.max) / 2;
  const highDemand = input.demandCount >= demandThreshold;
  // High demand applies a scarcity premium, capped at the band max.
  let pct = highDemand ? mid * demandMultiplier : mid;
  pct = Math.min(Math.max(pct, band.min), band.max);

  const price = Math.round(input.originalPrice * pct);

  const reasoning = highDemand
    ? `Grade ${input.grade} sits in the ${Math.round(band.min * 100)}–${Math.round(
        band.max * 100,
      )}% band; ${input.demandCount} nearby buyer(s) add a demand premium → ${Math.round(
        pct * 100,
      )}% of ${inr(input.originalPrice)} = ${inr(price)}.`
    : `Grade ${input.grade} sits in the ${Math.round(band.min * 100)}–${Math.round(
        band.max * 100,
      )}% band; priced at the ${Math.round(pct * 100)}% midpoint of ${inr(
        input.originalPrice,
      )} = ${inr(price)}.`;

  return { price, pricePct: Number(pct.toFixed(3)), reasoning };
}

function parseBands(config: RoutingConfig): PriceBands {
  return config.priceBands as unknown as PriceBands;
}

export function createPricingService() {
  return {
    async price(input: PriceInput): Promise<PriceResult> {
      const config = await configRepository.getRules();
      return computePrice(
        input,
        parseBands(config),
        config.demandPriceMultiplier,
        config.peerToPeerMinBuyers,
      );
    },
  };
}

export const pricingService = createPricingService();
