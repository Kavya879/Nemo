import { describe, expect, it } from "vitest";
import { createLocalGrader, type ImageSignals } from "@/services/grading/local-grader";
import { GraderOutputSchema } from "@/services/grading/image-grader.interface";
import type { ImageInput } from "@/types";

const img: ImageInput = { base64: "QUJD", mimeType: "image/jpeg" };

function signals(score: number): ImageSignals {
  return { score, sharpness: 6, brightness: 135, contrast: 50, entropy: 7 };
}

describe("local-grader (image-signal driven)", () => {
  it("high condition score → grade A with no flaws", async () => {
    const grader = createLocalGrader({ analyze: async () => signals(0.95) });
    const out = await grader.grade([img]);
    expect(GraderOutputSchema.safeParse(out).success).toBe(true);
    expect(out.grade).toBe("A");
    expect(out.flaws).toHaveLength(0);
  });

  it("low condition score → grade D with severe flaws", async () => {
    const grader = createLocalGrader({
      analyze: async () => ({ score: 0.2, sharpness: 1, brightness: 50, contrast: 20, entropy: 3 }),
    });
    const out = await grader.grade([img]);
    expect(out.grade).toBe("D");
    expect(out.flaws.length).toBeGreaterThan(0);
    expect(out.flaws[0]?.severity).toBe("severe");
  });

  it("uses the worst image across multiple photos", async () => {
    let i = 0;
    const grader = createLocalGrader({
      analyze: async () => (i++ === 0 ? signals(0.9) : signals(0.3)),
    });
    const out = await grader.grade([img, img]);
    expect(out.grade).not.toBe("A"); // worst (0.3) wins
  });

  it("reports name = local and rejects empty input", async () => {
    const grader = createLocalGrader({ analyze: async () => signals(0.7) });
    expect(grader.name).toBe("local");
    await expect(grader.grade([])).rejects.toThrow();
  });
});
