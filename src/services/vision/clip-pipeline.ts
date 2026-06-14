import { env } from "@/config/env";
import type { ImageInput } from "@/types";

/**
 * Shared CLIP primitives (Transformers.js). Centralised so the grader and the
 * product verifier reuse ONE loaded model instance instead of each pulling and
 * holding its own copy — the pipelines are lazy singletons keyed by task.
 */

export type ZeroShot = (
  image: unknown,
  labels: string[],
) => Promise<Array<{ label: string; score: number }>>;
export type Extractor = (
  image: unknown,
  opts?: Record<string, unknown>,
) => Promise<{ data: Float32Array | number[] }>;

let zeroShotP: Promise<ZeroShot> | null = null;
let extractorP: Promise<Extractor> | null = null;

export async function rawImageFromInput(image: ImageInput) {
  const { RawImage } = await import("@xenova/transformers");
  const bytes = Buffer.from(image.base64, "base64");
  const blob = new Blob([bytes], { type: image.mimeType });
  return RawImage.fromBlob(blob);
}

export async function getZeroShot(): Promise<ZeroShot> {
  if (!zeroShotP) {
    zeroShotP = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return (await pipeline(
        "zero-shot-image-classification",
        env.CLIP_MODEL,
      )) as unknown as ZeroShot;
    })();
  }
  return zeroShotP;
}

export async function getExtractor(): Promise<Extractor> {
  if (!extractorP) {
    extractorP = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return (await pipeline(
        "image-feature-extraction",
        env.CLIP_MODEL,
      )) as unknown as Extractor;
    })();
  }
  return extractorP;
}

/** Cosine similarity of two equal-length embedding vectors. */
export function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
