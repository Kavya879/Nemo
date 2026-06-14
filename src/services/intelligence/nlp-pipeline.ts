import { env } from "@/config/env";

/**
 * Shared open-source NLP primitives (Transformers.js), mirroring the CLIP vision
 * pipeline. Lazy singletons keyed by task so the models load once and are reused
 * across the intelligence engine. Everything runs in-process — no external API.
 *
 *  - sentiment: review text → polarity (powers satisfaction / return-risk),
 *  - embeddings: sentence vectors → cosine similarity (cohort / alternatives, P1).
 */

type Classify = (text: string) => Promise<Array<{ label: string; score: number }>>;
type Embed = (
  text: string,
  opts?: Record<string, unknown>,
) => Promise<{ data: Float32Array | number[] }>;

let sentimentP: Promise<Classify> | null = null;
let embedP: Promise<Embed> | null = null;

async function getSentimentPipe(): Promise<Classify> {
  if (!sentimentP) {
    sentimentP = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return (await pipeline("text-classification", env.SENTIMENT_MODEL)) as unknown as Classify;
    })();
  }
  return sentimentP;
}

async function getEmbedPipe(): Promise<Embed> {
  if (!embedP) {
    embedP = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return (await pipeline("feature-extraction", env.TEXT_EMBED_MODEL)) as unknown as Embed;
    })();
  }
  return embedP;
}

/**
 * Score text sentiment in -1..1 (negative..positive). Returns null if inference
 * fails, so callers can fall back to the star rating alone.
 */
export async function scoreSentiment(text: string): Promise<number | null> {
  const clean = text.trim();
  if (!clean) return null;
  try {
    const classify = await getSentimentPipe();
    const out = await classify(clean.slice(0, 512));
    const top = out[0];
    if (!top) return null;
    // SST-2 returns POSITIVE/NEGATIVE with a 0..1 confidence; map to a signed score.
    const signed = top.label.toUpperCase().startsWith("POS") ? top.score : -top.score;
    return Number(signed.toFixed(4));
  } catch {
    return null;
  }
}

/** Embed a sentence into a normalized vector, or null on failure (P1 features). */
export async function embedText(text: string): Promise<number[] | null> {
  const clean = text.trim();
  if (!clean) return null;
  try {
    const embed = await getEmbedPipe();
    const out = await embed(clean.slice(0, 512), { pooling: "mean", normalize: true });
    return Array.from(out.data);
  } catch {
    return null;
  }
}
