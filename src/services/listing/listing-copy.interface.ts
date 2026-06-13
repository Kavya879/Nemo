import { z } from "zod";

/**
 * Swappable contract for generating listing copy (title + description).
 * Like the grader, the listing service depends on THIS, not on Bedrock — so the
 * AI text generator can be swapped for the deterministic template with no
 * change to the listing service.
 */

export interface ListingCopyInput {
  name: string;
  category: string;
  brand?: string | null;
  grade: string;
  /** Comma-joined flaw descriptions (transparency). */
  flaws: string;
}

export const ListingCopySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
});
export type ListingCopy = z.infer<typeof ListingCopySchema>;

export interface ListingCopyGenerator {
  readonly name: "bedrock" | "template";
  generate(input: ListingCopyInput): Promise<ListingCopy>;
}
