import { describe, expect, it, vi } from "vitest";
import { createGradingService } from "@/services/grading/grading.service";
import type {
  GraderOutput,
  ImageGrader,
} from "@/services/grading/image-grader.interface";
import type { ImageInput } from "@/types";

const images: ImageInput[] = [{ base64: "QUJD", mimeType: "image/jpeg" }];

function stubGrader(
  name: ImageGrader["name"],
  output: GraderOutput,
  opts?: { fail?: boolean; delayMs?: number },
): ImageGrader {
  return {
    name,
    grade: vi.fn(async () => {
      if (opts?.delayMs) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }
      if (opts?.fail) throw new Error(`${name} exploded`);
      return output;
    }),
  };
}

const goodA: GraderOutput = {
  grade: "A",
  confidence: 0.9,
  flaws: [],
  summary: "Like new.",
};
const goodC: GraderOutput = {
  grade: "C",
  confidence: 0.6,
  flaws: [{ type: "wear", severity: "moderate", location: "general" }],
  summary: "Used.",
};

describe("grading.service", () => {
  it("returns a valid GradeResult from the primary grader", async () => {
    const svc = createGradingService({
      primary: stubGrader("bedrock", goodA),
      fallback: stubGrader("local", goodC),
    });
    const res = await svc.grade({ images }); // no itemId → no persistence
    expect(res.grade).toBe("A");
    expect(res.gradedBy).toBe("bedrock");
    expect(res.tookMs).toBeGreaterThanOrEqual(0);
  });

  it("falls back to the local grader when the primary throws", async () => {
    const primary = stubGrader("bedrock", goodA, { fail: true });
    const fallback = stubGrader("local", goodC);
    const svc = createGradingService({ primary, fallback });
    const res = await svc.grade({ images });
    expect(res.gradedBy).toBe("local");
    expect(res.grade).toBe("C");
    expect(fallback.grade).toHaveBeenCalledOnce();
  });

  it("records grading time", async () => {
    const svc = createGradingService({
      primary: stubGrader("bedrock", goodA, { delayMs: 15 }),
      fallback: stubGrader("local", goodC),
    });
    const res = await svc.grade({ images });
    expect(res.tookMs).toBeGreaterThanOrEqual(10);
  });

  it("handles 3 images and returns one consolidated grade", async () => {
    const three: ImageInput[] = [images[0], images[0], images[0]];
    const svc = createGradingService({
      primary: stubGrader("bedrock", goodC),
      fallback: stubGrader("local", goodA),
    });
    const res = await svc.grade({ images: three });
    expect(["A", "B", "C", "D"]).toContain(res.grade);
    expect(res.gradedBy).toBe("bedrock");
  });
});
