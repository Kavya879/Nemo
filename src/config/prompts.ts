/**
 * Centralized AI prompts (configuration, not hardcoded inline in graders).
 * Keeping them here means prompt tuning never touches business logic, and the
 * grader/listing implementations stay swappable.
 */

/**
 * Grading prompt. Forces a strict JSON response so it can be Zod-validated.
 * The model must return ONLY the JSON object, no prose.
 */
export const GRADING_PROMPT = `You are an expert product-condition inspector for a returns marketplace.
Examine the product photo(s) and assess the item's resale condition.

Assign ONE overall grade:
- "A" = like-new, no visible flaws, fully resellable at near-original price.
- "B" = lightly used, minor cosmetic wear, fully functional.
- "C" = visibly used, noticeable wear or small defects, still usable.
- "D" = damaged, broken, or heavily worn; not resellable as-is.

Identify visible flaws. For each flaw give: type (e.g. "scratch","stain","dent","tear","missing-part","discoloration"), severity ("minor"|"moderate"|"severe"), and a short human-readable location (e.g. "top-left of screen").

Respond with ONLY a JSON object in EXACTLY this shape, no markdown, no commentary:
{
  "grade": "A" | "B" | "C" | "D",
  "confidence": <number between 0 and 1>,
  "flaws": [ { "type": string, "severity": "minor" | "moderate" | "severe", "location": string } ],
  "summary": "<one short sentence describing the overall condition>"
}`;

/**
 * Listing copy prompt. Produces a marketplace title + description for a
 * graded second-life item. Returns strict JSON.
 */
export const LISTING_PROMPT = (input: {
  name: string;
  category: string;
  brand?: string | null;
  grade: string;
  flaws: string;
}) => `You write concise, trustworthy product listings for a certified pre-owned marketplace.

Item: ${input.name}
Brand: ${input.brand ?? "Unbranded"}
Category: ${input.category}
Verified condition grade: ${input.grade}
Known flaws: ${input.flaws || "none"}

Write an honest, appealing listing. Be transparent about condition (buyers trust honesty). Do not invent features or hide flaws.

Respond with ONLY a JSON object in EXACTLY this shape, no markdown:
{
  "title": "<= 70 chars, includes the grade as 'Grade X'>",
  "description": "2-3 short sentences, honest and appealing"
}`;
