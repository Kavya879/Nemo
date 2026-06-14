import type { Listing, Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { listingRepository } from "@/repositories/listing.repository";
import { itemRepository } from "@/repositories/item.repository";
import { NotFoundError } from "@/lib/errors";
import {
  ListingDraftSchema,
  type DetectedFlaw,
  type Grade,
  type ListingDraft,
  type ProductHealthCard,
} from "@/types";
import { createBedrockCopyGenerator } from "./bedrock-copy-generator";
import { createTemplateCopyGenerator } from "./template-copy-generator";
import type { ListingCopyGenerator } from "./listing-copy.interface";

/**
 * Listing service — the auto-listing generator.
 *
 * Takes a graded item + price, produces a title + description (via a swappable
 * AI copy generator, falling back to a deterministic template), selects the
 * best photo, and assembles the Product Health Card. Everything except the copy
 * is deterministic. Persists the Listing via the repository.
 */

export interface ListingInput {
  itemId: string;
  grade: Grade;
  confidence: number;
  flaws: DetectedFlaw[];
  price: number;
  pricePct: number;
  /** Best photo url/ref, if available. */
  photoUrl?: string | null;
  /** Optional extra history lines (e.g. return reason). */
  history?: string[];
}

export interface ListingDeps {
  primaryCopy: ListingCopyGenerator;
  fallbackCopy: ListingCopyGenerator;
}

function defaultDeps(): ListingDeps {
  const template = createTemplateCopyGenerator();
  const primary =
    env.GRADER_PROVIDER === "local" ? template : createBedrockCopyGenerator();
  return { primaryCopy: primary, fallbackCopy: template };
}

export function createListingService(deps: ListingDeps = defaultDeps()) {
  function buildHealthCard(input: ListingInput): ProductHealthCard {
    // History records only real provenance events. The AI grade line uses the
    // EXACT confidence the grader produced — no rounding-up, no embellishment.
    const history = [
      ...(input.history ?? []),
      `AI-graded ${input.grade} at ${Math.round(input.confidence * 100)}% confidence`,
    ];
    return {
      verifiedCondition: input.grade,
      confidence: input.confidence,
      flaws: input.flaws,
      history,
    };
  }

  return {
    /** Builds (but does not persist) a complete, validated listing draft. */
    async buildDraft(input: ListingInput): Promise<ListingDraft> {
      const item = await itemRepository.findById(input.itemId);
      if (!item) throw new NotFoundError(`Item ${input.itemId} not found.`);

      const flawText = input.flaws
        .map((f) => `${f.severity} ${f.type} (${f.location})`)
        .join(", ");

      let copy;
      try {
        copy = await deps.primaryCopy.generate({
          name: item.name,
          category: item.category,
          brand: item.brand,
          grade: input.grade,
          flaws: flawText,
        });
      } catch {
        copy = await deps.fallbackCopy.generate({
          name: item.name,
          category: item.category,
          brand: item.brand,
          grade: input.grade,
          flaws: flawText,
        });
      }

      const draft: ListingDraft = {
        itemId: input.itemId,
        title: copy.title,
        description: copy.description,
        price: input.price,
        pricePct: input.pricePct,
        photoUrl: input.photoUrl ?? null,
        healthCard: buildHealthCard(input),
      };
      return ListingDraftSchema.parse(draft);
    },

    /** Builds and persists the listing, marking the item LISTED. */
    async create(input: ListingInput): Promise<Listing> {
      const draft = await this.buildDraft(input);
      const listing = await listingRepository.upsertByItem(draft.itemId, {
        title: draft.title,
        description: draft.description,
        price: draft.price,
        pricePct: draft.pricePct,
        photoUrl: draft.photoUrl,
        status: "ACTIVE",
        healthCard: draft.healthCard as unknown as Prisma.InputJsonValue,
      });
      await itemRepository.updateStatus(draft.itemId, "LISTED");
      return listing;
    },
  };
}

export const listingService = createListingService();
