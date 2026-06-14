import {
  ListingCopySchema,
  type ListingCopy,
  type ListingCopyGenerator,
  type ListingCopyInput,
} from "./listing-copy.interface";

/**
 * Deterministic fallback copy generator — no AI, always available.
 * Produces honest, on-brand listing text from a template.
 */
export function createTemplateCopyGenerator(): ListingCopyGenerator {
  return {
    name: "template",
    async generate(input: ListingCopyInput): Promise<ListingCopy> {
      const brand = input.brand ? `${input.brand} ` : "";
      const title = `Certified Pre-Owned: ${brand}${input.name} (Grade ${input.grade})`;

      const condition =
        input.grade === "A"
          ? "in like-new condition"
          : input.grade === "B"
            ? "in great condition with only light wear"
            : input.grade === "C"
              ? "in good, usable condition with visible wear"
              : "sold as-is for parts or repair";

      const flawNote = input.flaws
        ? ` Noted condition details: ${input.flaws}.`
        : " No significant flaws detected.";

      const description = `This ${input.category.toLowerCase()} is Amazon Nemo-certified and ${condition}.${flawNote} Inspected, verified, and backed by our second-life guarantee.`;

      return ListingCopySchema.parse({ title: title.slice(0, 120), description });
    },
  };
}
