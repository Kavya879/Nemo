import { describe, expect, it, vi } from "vitest";

// Mock the config repo so the gate thresholds are deterministic and no DB is needed.
vi.mock("@/repositories/config.repository", () => ({
  configRepository: {
    getRules: vi.fn(async () => ({
      verificationMatchThreshold: 0.7,
      fraudRiskThreshold: 0.5,
      minQualityConfidence: 0.6,
    })),
  },
}));

import { createVerificationService } from "@/services/verification/verification.service";
import type {
  ProductVerifier,
  VerifyContext,
} from "@/services/verification/product-verifier.interface";
import type { RoledImageInput, VerifierOutput } from "@/types";

const images: RoledImageInput[] = [{ base64: "QUJD", mimeType: "image/jpeg", role: "front" }];

function stubVerifier(
  name: ProductVerifier["name"],
  output: VerifierOutput,
  opts?: { fail?: boolean },
): ProductVerifier {
  return {
    name,
    verify: vi.fn(async (_imgs: RoledImageInput[], _ctx: VerifyContext) => {
      if (opts?.fail) throw new Error(`${name} exploded`);
      return output;
    }),
  };
}

const match = (productMatchConfidence: number, fraudRiskScore: number): VerifierOutput => ({
  productMatchConfidence,
  fraudRiskScore,
  attributes: { category: 0.9, brand: 0.9, model: 0.9, packaging: 0.5, visual: 0.9 },
  deviations: [],
  summary: "stub",
});

describe("verification.service gate", () => {
  it("PROCEEDs on a confident, low-fraud match", async () => {
    const svc = createVerificationService({
      primary: stubVerifier("bedrock", match(0.9, 0.1)),
      fallback: stubVerifier("clip", match(0.9, 0.1)),
    });
    const res = await svc.verify({ images }); // no itemId → no persistence
    expect(res.recommendation).toBe("PROCEED");
    expect(res.verifiedBy).toBe("bedrock");
    expect(res.imageRoles).toEqual(["front"]);
  });

  it("REQUESTs evidence when match is below threshold (and fraud is low)", async () => {
    const svc = createVerificationService({
      primary: stubVerifier("bedrock", match(0.5, 0.2)),
      fallback: stubVerifier("clip", match(0.5, 0.2)),
    });
    const res = await svc.verify({ images });
    expect(res.recommendation).toBe("REQUEST_EVIDENCE");
  });

  it("escalates to MANUAL_REVIEW when fraud risk is at/above threshold", async () => {
    const svc = createVerificationService({
      primary: stubVerifier("bedrock", match(0.9, 0.8)),
      fallback: stubVerifier("clip", match(0.9, 0.8)),
    });
    const res = await svc.verify({ images });
    expect(res.recommendation).toBe("MANUAL_REVIEW");
  });

  it("falls back to the secondary verifier when the primary throws", async () => {
    const svc = createVerificationService({
      primary: stubVerifier("bedrock", match(0.9, 0.1), { fail: true }),
      fallback: stubVerifier("clip", match(0.95, 0.05)),
    });
    const res = await svc.verify({ images });
    expect(res.verifiedBy).toBe("clip");
    expect(res.recommendation).toBe("PROCEED");
  });

  it("decide() is a pure mapping of scores → recommendation", () => {
    const svc = createVerificationService({
      primary: stubVerifier("clip", match(1, 0)),
      fallback: stubVerifier("clip", match(1, 0)),
    });
    const th = { matchThreshold: 0.7, fraudThreshold: 0.5 };
    expect(svc.decide(0.9, 0.1, th)).toBe("PROCEED");
    expect(svc.decide(0.4, 0.1, th)).toBe("REQUEST_EVIDENCE");
    expect(svc.decide(0.9, 0.6, th)).toBe("MANUAL_REVIEW");
  });
});
