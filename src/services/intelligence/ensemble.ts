import { type RiskLevel, type Signal, clamp01, round } from "./types";

/**
 * Ensemble combiner — turns multiple independent signals into one calibrated
 * score. A decision is NEVER made from a single signal: each contributes by
 * weight × its own confidence, so thin signals barely move the result. Overall
 * confidence is the evidence coverage; when it's low the score is shrunk toward
 * a neutral prior so we don't show a misleadingly extreme number, and a
 * "need more information" reason is surfaced (per the production-accuracy spec).
 */

export interface WeightedSignal {
  signal: Signal;
  weight: number;
}

export interface EnsembleResult {
  /** 0..100 (risk-oriented: higher = riskier). */
  score: number;
  level: RiskLevel;
  /** 0..1 evidence coverage. */
  confidence: number;
  reasons: string[];
  signals: Array<{ key: string; value: number; confidence: number; weight: number }>;
}

const NEUTRAL_PRIOR = 0.4;
const LOW_CONFIDENCE = 0.35;

function levelFor(risk: number): RiskLevel {
  if (risk < 0.35) return "low";
  if (risk < 0.65) return "medium";
  return "high";
}

export function combine(inputs: WeightedSignal[]): EnsembleResult {
  const totalWeight = inputs.reduce((s, i) => s + i.weight, 0) || 1;
  const effective = inputs.map((i) => i.weight * clamp01(i.signal.confidence));
  const effectiveSum = effective.reduce((a, b) => a + b, 0);

  // Evidence coverage: how much of the intended weight is actually backed by data.
  const confidence = clamp01(
    inputs.reduce((s, i) => s + i.weight * clamp01(i.signal.confidence), 0) / totalWeight,
  );

  let weightedRisk: number;
  if (effectiveSum === 0) {
    weightedRisk = NEUTRAL_PRIOR; // no usable evidence at all
  } else {
    weightedRisk =
      inputs.reduce((s, i, idx) => s + clamp01(i.signal.value) * effective[idx], 0) / effectiveSum;
  }

  // Shrink toward the neutral prior in proportion to (lack of) confidence.
  const adjusted = clamp01(weightedRisk * confidence + NEUTRAL_PRIOR * (1 - confidence));

  // Reasons: the signals that contributed most, highest first; only ones with data.
  const ranked = inputs
    .map((i, idx) => ({ reason: i.signal.reason, contrib: clamp01(i.signal.value) * effective[idx], conf: i.signal.confidence }))
    .filter((r) => r.conf > 0)
    .sort((a, b) => b.contrib - a.contrib)
    .map((r) => r.reason);

  const reasons = ranked.slice(0, 4);
  if (confidence < LOW_CONFIDENCE) {
    reasons.push("Limited data so far — confidence is low; gather more signals before relying on this.");
  }

  return {
    score: Math.round(adjusted * 100),
    level: levelFor(adjusted),
    confidence: round(confidence),
    reasons: reasons.length ? reasons : ["Not enough information to assess yet."],
    signals: inputs.map((i) => ({
      key: i.signal.key,
      value: i.signal.value,
      confidence: i.signal.confidence,
      weight: i.weight,
    })),
  };
}
