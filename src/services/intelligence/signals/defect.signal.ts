import { intelligenceRepository } from "@/repositories/intelligence.repository";
import { type Signal, clamp01, round, sampleConfidence } from "../types";

/**
 * Defect / authenticity signal — derived from real inspection outcomes. Blends
 * how often grading found flaws and how often verification found deviations or
 * elevated fraud risk for this item (and its brand). Drives defect probability,
 * counterfeit risk, and the passport's authenticity confidence.
 */
export async function defectSignal(input: {
  itemId: string;
  brand?: string | null;
}): Promise<Signal> {
  const [itemGrades, itemVer, brandGrades] = await Promise.all([
    intelligenceRepository.gradeOutcomes({ itemId: input.itemId }),
    intelligenceRepository.verificationOutcomes({ itemId: input.itemId }),
    input.brand
      ? intelligenceRepository.gradeOutcomes({ brand: input.brand })
      : Promise.resolve({ count: 0, grades: [], withFlaws: 0 }),
  ]);

  const itemFlawFreq = itemGrades.count > 0 ? itemGrades.withFlaws / itemGrades.count : null;
  const brandFlawFreq = brandGrades.count > 0 ? brandGrades.withFlaws / brandGrades.count : null;
  const flawFreq = itemFlawFreq ?? brandFlawFreq ?? 0.3;

  const deviationFreq =
    itemVer.count > 0 ? itemVer.withDeviations / itemVer.count : 0;
  const fraud = itemVer.avgFraudRisk ?? 0;

  const value = clamp01(0.5 * flawFreq + 0.3 * deviationFreq + 0.2 * fraud);
  const sample = itemGrades.count + itemVer.count + brandGrades.count;
  const confidence = sampleConfidence(sample, 8);

  const reason =
    value >= 0.5
      ? `Inspections found defects/deviations fairly often (${Math.round(value * 100)}% defect signal).`
      : value >= 0.25
        ? `Occasional defects reported (${Math.round(value * 100)}% defect signal).`
        : `Defects rarely reported in inspections.`;

  return {
    key: "defect",
    value: round(value),
    confidence: round(confidence),
    reason,
    meta: {
      flawFreq: round(flawFreq),
      deviationFreq: round(deviationFreq),
      avgFraudRisk: itemVer.avgFraudRisk != null ? round(itemVer.avgFraudRisk) : null,
      avgProductMatch: itemVer.avgProductMatch != null ? round(itemVer.avgProductMatch) : null,
    },
  };
}
