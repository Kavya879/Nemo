import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Bedrock grader is tested with a fully mocked AWS SDK — no network.
 * We control what InvokeModelCommand "returns" and assert parsing + validation.
 */

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn().mockImplementation(() => ({ send: sendMock })),
  InvokeModelCommand: vi.fn().mockImplementation((args: unknown) => args),
}));

/** Builds a Bedrock-style response body wrapping the model's text output. */
function bedrockResponse(modelText: string) {
  const payload = JSON.stringify({ content: [{ text: modelText }] });
  return { body: new TextEncoder().encode(payload) };
}

const img = { base64: "QUJD", mimeType: "image/jpeg" as const };

describe("bedrock-grader", () => {
  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = "test-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
    sendMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses a clean JSON grade response", async () => {
    sendMock.mockResolvedValue(
      bedrockResponse(
        JSON.stringify({
          grade: "B",
          confidence: 0.88,
          flaws: [{ type: "scratch", severity: "minor", location: "lid" }],
          summary: "Light cosmetic wear.",
        }),
      ),
    );
    const { createBedrockGrader } = await import(
      "@/services/grading/bedrock-grader"
    );
    const out = await createBedrockGrader().grade([img]);
    expect(out.grade).toBe("B");
    expect(out.flaws).toHaveLength(1);
    expect(out.summary).toContain("wear");
  });

  it("handles markdown-fenced JSON", async () => {
    sendMock.mockResolvedValue(
      bedrockResponse(
        '```json\n{"grade":"A","confidence":0.97,"flaws":[],"summary":"Like new."}\n```',
      ),
    );
    const { createBedrockGrader } = await import(
      "@/services/grading/bedrock-grader"
    );
    const out = await createBedrockGrader().grade([img]);
    expect(out.grade).toBe("A");
  });

  it("throws (caught upstream) on malformed/non-JSON responses — does not crash", async () => {
    sendMock.mockResolvedValue(bedrockResponse("the item looks fine, grade it A"));
    const { createBedrockGrader } = await import(
      "@/services/grading/bedrock-grader"
    );
    await expect(createBedrockGrader().grade([img])).rejects.toThrow();
  });

  it("throws on JSON that violates the schema (bad grade enum)", async () => {
    sendMock.mockResolvedValue(
      bedrockResponse(
        JSON.stringify({ grade: "Z", confidence: 2, flaws: [], summary: "" }),
      ),
    );
    const { createBedrockGrader } = await import(
      "@/services/grading/bedrock-grader"
    );
    await expect(createBedrockGrader().grade([img])).rejects.toThrow();
  });
});
