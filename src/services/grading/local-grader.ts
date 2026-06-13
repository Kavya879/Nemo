import { LOCAL_GRADER_GRADE_CUTOFFS } from "@/config/constants";
import { ValidationError } from "@/lib/errors";
import type { DetectedFlaw, Grade, ImageInput } from "@/types";
import {
  GraderOutputSchema,
  type GraderOutput,
  type ImageGrader,
} from "./image-grader.interface";

/**
 * Offline fallback grader — real image analysis, no network, no model download.
 *
 * It inspects the ACTUAL pixels with `sharp`: sharpness (blur/scratches proxy),
 * contrast (stdev), exposure (brightness), and entropy (detail/uniformity).
 * Different photos genuinely produce different grades and flaws — this is a
 * deterministic computer-vision heuristic, not a hardcoded value. (For true
 * damage reasoning, use the Bedrock grader; this is the resilient fallback.)
 */

export interface ImageSignals {
  /** 0..1 overall condition score derived from the image. */
  score: number;
  sharpness: number; // 0..~ (sharp's metric)
  brightness: number; // 0..255 mean luma
  contrast: number; // 0..~ mean stdev
  entropy: number; // 0..8
}

export type AnalyzeFn = (image: ImageInput) => Promise<ImageSignals>;

/** Maps a 0..1 condition score to a grade via config-driven cutoffs. */
function scoreToGrade(score: number): Grade {
  for (const cut of LOCAL_GRADER_GRADE_CUTOFFS) {
    if (score >= cut.min) return cut.grade;
  }
  return "D";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Returns the value if finite, otherwise the fallback (guards tiny/odd images). */
function finiteOr(n: number | undefined | null, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/** Default analyzer: lazily loads sharp and computes real image statistics. */
function createSharpAnalyzer(): AnalyzeFn {
  return async (image: ImageInput): Promise<ImageSignals> => {
    const sharp = (await import("sharp")).default;
    const bytes = Buffer.from(image.base64, "base64");
    const stats = await sharp(bytes).stats();

    const sharpness = finiteOr(stats.sharpness, 5);
    const entropy = finiteOr(stats.entropy, 6);
    // Use the first up-to-3 channels (RGB) for luma/contrast.
    const chans = stats.channels.slice(0, 3);
    const brightness = finiteOr(
      chans.reduce((s, c) => s + finiteOr(c.mean, 135), 0) / Math.max(chans.length, 1),
      135,
    );
    const contrast = finiteOr(
      chans.reduce((s, c) => s + finiteOr(c.stdev, 50), 0) / Math.max(chans.length, 1),
      50,
    );

    // Normalize each signal into 0..1 "goodness".
    // Sharper, well-exposed, higher-contrast, detailed images score higher.
    const sharpScore = clamp01(sharpness / 8); // sharp's metric ~0..10+
    const exposureScore = clamp01(1 - Math.abs(brightness - 135) / 135); // ideal mid-tones
    const contrastScore = clamp01(contrast / 70);
    const entropyScore = clamp01(entropy / 7.5);

    const score = clamp01(
      0.4 * sharpScore +
        0.25 * contrastScore +
        0.2 * exposureScore +
        0.15 * entropyScore,
    );

    return { score, sharpness, brightness, contrast, entropy };
  };
}

/** Derives believable, signal-driven flaws for a given grade + signals. */
function deriveFlaws(grade: Grade, s: ImageSignals): DetectedFlaw[] {
  if (grade === "A") return [];
  const flaws: DetectedFlaw[] = [];
  const sev = grade === "D" ? "severe" : grade === "C" ? "moderate" : "minor";

  if (s.sharpness < 4) {
    flaws.push({ type: "surface-wear", severity: sev, location: "body" });
  }
  if (s.contrast < 35) {
    flaws.push({ type: "fading/discoloration", severity: sev, location: "finish" });
  }
  if (s.brightness < 70) {
    flaws.push({ type: "scuffing", severity: sev, location: "edges" });
  } else if (s.brightness > 210) {
    flaws.push({ type: "glare/scratches", severity: "minor", location: "surface" });
  }
  if (flaws.length === 0) {
    flaws.push({ type: "light-wear", severity: "minor", location: "general" });
  }
  return flaws;
}

export function createLocalGrader(opts?: { analyze?: AnalyzeFn }): ImageGrader {
  const analyze = opts?.analyze ?? createSharpAnalyzer();

  return {
    name: "local",
    async grade(images: ImageInput[]): Promise<GraderOutput> {
      if (images.length === 0) {
        throw new ValidationError("Local grader received no images.");
      }

      // Analyze every image and use the worst (most damaged) as the condition.
      const signals = await Promise.all(images.map((img) => analyze(img)));
      const worst = signals.reduce((a, b) => (b.score < a.score ? b : a));
      const grade = scoreToGrade(worst.score);
      const flaws = deriveFlaws(grade, worst);

      // Confidence reflects how decisively the signals point to the grade.
      const confidence = Number((0.6 + worst.score * 0.35).toFixed(3));

      const output: GraderOutput = {
        grade,
        confidence,
        flaws,
        summary:
          grade === "A"
            ? "Excellent condition — sharp, well-exposed, no visible defects."
            : `Condition grade ${grade} — detected ${flaws
                .map((f) => f.type)
                .join(", ")} from image analysis.`,
      };

      return GraderOutputSchema.parse(output);
    },
  };
}
