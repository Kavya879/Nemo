import { describe, expect, it } from "vitest";
import { createLocalGrader } from "@/services/grading/local-grader";
import { GraderOutputSchema } from "@/services/grading/image-grader.interface";
import type { ImageInput } from "@/types";

const img: ImageInput = { base64: "QUJD", mimeType: "image/jpeg" };

describe("local-grader", () => {
  it("maps high classifier confidence to grade A with no flaws", async () => {
    const grader = createLocalGrader({
      classify: async () => [{ label: "sneaker", score: 0.95 }],
    });
    const out = await grader.grade([img]);
    expect(GraderOutputSchema.safeParse(out).success).toBe(true);
    expect(out.grade).toBe("A");
    expect(out.flaws).toHaveLength(0);
    expect(out.confidence).toBeCloseTo(0.95, 2);
  });

  it("maps low classifier confidence to grade D with a severe flaw", async () => {
    const grader = createLocalGrader({
      classify: async () => [{ label: "shoe", score: 0.2 }],
    });
    const out = await grader.grade([img]);
    expect(out.grade).toBe("D");
    expect(out.flaws[0]?.severity).toBe("severe");
  });

  it("returns the correct contract shape (gradedBy name = local)", async () => {
    const grader = createLocalGrader({
      classify: async () => [{ label: "x", score: 0.7 }],
    });
    expect(grader.name).toBe("local");
    const out = await grader.grade([img]);
    expect(out.grade).toBe("B");
  });

  it("rejects empty image input", async () => {
    const grader = createLocalGrader({ classify: async () => [] });
    await expect(grader.grade([])).rejects.toThrow();
  });
});
