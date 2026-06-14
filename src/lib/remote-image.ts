import type { ImageInput } from "@/types";

/**
 * Fetch a remote image (e.g. a catalog reference URL) into an ImageInput the
 * graders/verifiers can consume. Returns undefined on any failure so callers
 * can degrade gracefully (grade/verify without the reference).
 */
export async function fetchImageAsInput(url: string): Promise<ImageInput | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") ?? "";
    const mimeType = ct.includes("png")
      ? "image/png"
      : ct.includes("webp")
        ? "image/webp"
        : "image/jpeg";
    return { base64: buf.toString("base64"), mimeType };
  } catch {
    return undefined;
  }
}
