import { CHARITY_PARTNERS, CUSTOMER_LOCATION, type Charity } from "@/config/constants";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { itemRepository } from "@/repositories/item.repository";
import { creditsService } from "@/services/credits/credits.service";
import { matchingService } from "@/services/matching/matching.service";

/**
 * "Give a second life" — lets an owner proactively keep an item in circulation
 * instead of binning it, the two greenest routes from our routing engine:
 *   • DONATE      → hand it to a charity partner (earns green credits + a
 *                   donation certificate).
 *   • PEER_TO_PEER→ pass it directly to a verified nearby buyer (neighbour),
 *                   using the same geo-matching engine as second-life resale.
 * Both award real green credits via the existing credits engine and take the
 * item out of inventory; nothing is hardcoded.
 */

const UNAVAILABLE = new Set(["SOLD", "DONATED", "RECYCLED"]);

export interface DonationCertificate {
  certificateId: string;
  itemName: string;
  category: string;
  charity: Charity;
  credits: number;
  co2SavedKg: number;
  costSaved: number;
  issuedAt: string;
  impact: string;
}

export interface NeighbourResult {
  matched: boolean;
  itemName: string;
  distanceKm?: number;
  credits?: number;
  co2SavedKg?: number;
}

export const giveService = {
  charities: () => CHARITY_PARTNERS,

  async donate(input: { itemId: string; charityId: string; userId?: string }): Promise<DonationCertificate> {
    const item = await itemRepository.findById(input.itemId);
    if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);
    if (UNAVAILABLE.has(item.status)) {
      throw new ConflictError("This item has already been given a second life.");
    }
    const charity = CHARITY_PARTNERS.find((c) => c.id === input.charityId) ?? CHARITY_PARTNERS[0];

    const award = await creditsService.award({
      action: "DONATE",
      category: item.category,
      originalPrice: item.originalPrice,
      userId: input.userId,
      itemId: item.id,
    });
    await itemRepository.updateStatus(item.id, "DONATED");

    return {
      certificateId: `DN-${item.id.slice(-6).toUpperCase()}`,
      itemName: item.name,
      category: item.category,
      charity,
      credits: award.credits,
      co2SavedKg: award.co2SavedKg,
      costSaved: award.costSaved,
      issuedAt: new Date().toISOString(),
      impact: charity.impact,
    };
  },

  async passToNeighbour(input: {
    itemId: string;
    userId?: string;
    origin?: { lat: number; lng: number };
  }): Promise<NeighbourResult> {
    const item = await itemRepository.findById(input.itemId);
    if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);
    if (UNAVAILABLE.has(item.status)) {
      throw new ConflictError("This item has already been given a second life.");
    }

    const matches = await matchingService.findNearby({
      category: item.category,
      origin: input.origin ?? CUSTOMER_LOCATION,
    });
    if (matches.length === 0) {
      return { matched: false, itemName: item.name };
    }

    const nearest = matches[0]; // closest = lowest logistics
    const award = await creditsService.award({
      action: "PEER_TO_PEER",
      category: item.category,
      originalPrice: item.originalPrice,
      userId: input.userId,
      itemId: item.id,
    });
    await itemRepository.updateStatus(item.id, "ROUTED");

    return {
      matched: true,
      itemName: item.name,
      distanceKm: nearest.distanceKm,
      credits: award.credits,
      co2SavedKg: award.co2SavedKg,
    };
  },
};
