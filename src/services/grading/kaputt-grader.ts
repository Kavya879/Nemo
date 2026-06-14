import { env } from "@/config/env";
import { ValidationError } from "@/lib/errors";
import type { DetectedFlaw, Grade, ImageInput } from "@/types";
import { GraderOutputSchema, type GraderOutput, type ImageGrader } from "./image-grader.interface";

/**
 * Kaputt grader — REAL computer-vision damage grading using the MobileNetV3-Small
 * model fine-tuned on the Kaputt product-damage dataset (exported to ONNX, run
 * in-process via onnxruntime-node). It produces a condition grade AND multilabel
 * defect detection — far richer than a heuristic.
 *
 * Model I/O (matches the training/export contract):
 *   input  "image"         float32 [1,3,224,224]  (ImageNet-normalised)
 *   output "grade_logits"  float32 [1,3]          (Like New | Minor | Major)
 *   output "defect_logits" float32 [1,7]          (multilabel defect types)
 *
 * Loads lazily and is cached. If the model or runtime is unavailable it throws,
 * and the grading service transparently falls back to the local sharp grader.
 */

// Model label vocabulary (identical to the Python training script).
const GRADE_LABELS = ["Like New", "Minor Damage", "Major Damage"] as const;
const DEFECT_TYPES = [
  "actuation",
  "deconstruction",
  "deformation",
  "missing_unit",
  "penetration",
  "spillage",
  "superficial",
] as const;
const DEFECT_LABELS: Record<(typeof DEFECT_TYPES)[number], string> = {
  actuation: "actuation wear",
  deconstruction: "deconstruction",
  deformation: "deformation",
  missing_unit: "missing unit",
  penetration: "penetration",
  spillage: "spillage",
  superficial: "superficial wear",
};

// Map the model's 3 condition classes onto our A–D grade scale.
const GRADE_TO_NEMO: Record<(typeof GRADE_LABELS)[number], Grade> = {
  "Like New": "A",
  "Minor Damage": "C",
  "Major Damage": "D",
};

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// onnxruntime types are loaded dynamically; keep this module import-light.
type OrtModule = typeof import("onnxruntime-node");
type Session = Awaited<ReturnType<OrtModule["InferenceSession"]["create"]>>;

let sessionPromise: Promise<{ ort: OrtModule; session: Session }> | null = null;

function loadSession() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = (await import("onnxruntime-node")) as OrtModule;
      const session = await ort.InferenceSession.create(env.KAPUTT_MODEL_PATH);
      return { ort, session };
    })().catch((e) => {
      sessionPromise = null; // allow a later retry
      throw e;
    });
  }
  return sessionPromise;
}

/** Decode + resize + ImageNet-normalise an image into a CHW float32 tensor. */
async function preprocess(image: ImageInput): Promise<Float32Array> {
  const sharp = (await import("sharp")).default;
  const bytes = Buffer.from(image.base64, "base64");
  const { data } = await sharp(bytes)
    .resize(224, 224, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }); // RGB, 224*224*3, interleaved

  const out = new Float32Array(3 * 224 * 224);
  const plane = 224 * 224;
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) {
      const v = data[i * 3 + c] / 255;
      out[c * plane + i] = (v - MEAN[c]) / STD[c];
    }
  }
  return out;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function flawsFromDefects(defectLogits: number[], grade: Grade): DetectedFlaw[] {
  if (grade === "A") return [];
  const severity = grade === "D" ? "severe" : grade === "C" ? "moderate" : "minor";
  const ranked = DEFECT_TYPES.map((t, i) => ({ type: t, prob: sigmoid(defectLogits[i]) }))
    .filter((d) => d.prob >= 0.5)
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);
  if (ranked.length === 0) {
    return [{ type: "general wear", severity, location: "body" }];
  }
  return ranked.map((d) => ({ type: DEFECT_LABELS[d.type], severity, location: "body" }));
}

export function createKaputtGrader(): ImageGrader {
  return {
    name: "kaputt",
    async grade(images: ImageInput[]): Promise<GraderOutput> {
      if (images.length === 0) throw new ValidationError("Kaputt grader received no images.");
      const { ort, session } = await loadSession();

      // Grade every photo, keep the most-damaged (lowest grade index → worst).
      let worst: { grade: Grade; confidence: number; flaws: DetectedFlaw[]; label: string } | null = null;
      let worstRank = -1;
      for (const image of images) {
        const input = await preprocess(image);
        const feeds = { image: new ort.Tensor("float32", input, [1, 3, 224, 224]) };
        const out = await session.run(feeds);
        const gradeLogits = Array.from(out.grade_logits.data as Float32Array);
        const defectLogits = Array.from(out.defect_logits.data as Float32Array);

        const probs = softmax(gradeLogits);
        const idx = probs.indexOf(Math.max(...probs));
        const label = GRADE_LABELS[idx];
        const grade = GRADE_TO_NEMO[label];
        const flaws = flawsFromDefects(defectLogits, grade);
        if (idx > worstRank) {
          worstRank = idx;
          worst = { grade, confidence: Number(probs[idx].toFixed(3)), flaws, label };
        }
      }

      const w = worst!;
      const output: GraderOutput = {
        grade: w.grade,
        confidence: w.confidence,
        flaws: w.flaws,
        summary:
          w.grade === "A"
            ? "MobileNetV3 (Kaputt) assessment: Like New — no significant damage detected."
            : `MobileNetV3 (Kaputt) assessment: ${w.label} — detected ${w.flaws
                .map((f) => f.type)
                .join(", ")}.`,
      };
      return GraderOutputSchema.parse(output);
    },
  };
}
