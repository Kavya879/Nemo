import { describe, expect, it, vi, beforeEach } from "vitest";

// In-memory stand-ins for the repositories the service depends on.
const state: { challenge: any; returnCase: any } = { challenge: null, returnCase: null };

vi.mock("@/repositories/challenge.repository", () => ({
  challengeRepository: {
    findById: vi.fn(async () => state.challenge),
    findOpenForCase: vi.fn(async () => null),
    create: vi.fn(async () => state.challenge),
    addEvidence: vi.fn(async () => undefined),
    transition: vi.fn(async (_id: string, args: any) => {
      state.challenge = {
        ...state.challenge,
        status: args.status,
        ...(args.patch ?? {}),
      };
      return state.challenge;
    }),
  },
}));

vi.mock("@/repositories/return-case.repository", () => ({
  returnCaseRepository: {
    findById: vi.fn(async () => state.returnCase),
    transition: vi.fn(async () => state.returnCase),
  },
}));

vi.mock("@/repositories/grade.repository", () => ({
  gradeRepository: { findLatestForItem: vi.fn(async () => null) },
}));

vi.mock("@/repositories/verification.repository", () => ({
  verificationRepository: { findLatestForItem: vi.fn(async () => null) },
}));

import { createChallengeService } from "@/services/challenge/challenge.service";
import { returnCaseRepository } from "@/repositories/return-case.repository";

const svc = createChallengeService();

function baseChallenge(overrides?: Record<string, unknown>) {
  return {
    id: "chal-1",
    returnCaseId: "rc-1",
    itemId: "item-1",
    status: "UNDER_REVIEW",
    reason: "Grade is too low",
    sellerComment: "It's barely used.",
    snapshot: { grade: "C" },
    evidence: [],
    events: [],
    returnCase: { id: "rc-1", status: "GRADED", reason: "x", item: { id: "item-1" } },
    ...overrides,
  };
}

beforeEach(() => {
  state.challenge = baseChallenge();
  state.returnCase = { id: "rc-1", itemId: "item-1", status: "GRADED", grade: "C" };
});

describe("challenge.service", () => {
  it("rejects opening a dispute on a return that has no grade", async () => {
    state.returnCase = { id: "rc-1", itemId: "item-1", status: "INITIATED", grade: null };
    await expect(
      svc.open({ returnCaseId: "rc-1", reason: "x", comment: "y", userId: "u1" }),
    ).rejects.toThrow();
  });

  it("UPHOLD resolves to RESOLVED_UPHELD and leaves the grade untouched", async () => {
    const res = await svc.resolve({
      challengeId: "chal-1",
      reviewer: "Ops Admin",
      action: "UPHOLD",
      reasoning: "AI was right.",
    });
    expect(res.status).toBe("RESOLVED_UPHELD");
    expect(returnCaseRepository.transition).not.toHaveBeenCalled();
  });

  it("OVERRIDE requires a revised grade", async () => {
    await expect(
      svc.resolve({
        challengeId: "chal-1",
        reviewer: "Ops Admin",
        action: "OVERRIDE",
        reasoning: "Looks like a B.",
      }),
    ).rejects.toThrow();
  });

  it("OVERRIDE writes the revised grade back onto the return case", async () => {
    const res = await svc.resolve({
      challengeId: "chal-1",
      reviewer: "Ops Admin",
      action: "OVERRIDE",
      revisedGrade: "B",
      reasoning: "Evidence supports a B.",
    });
    expect(res.status).toBe("RESOLVED_OVERRIDDEN");
    expect(res.revisedGrade).toBe("B");
    expect(returnCaseRepository.transition).toHaveBeenCalled();
  });

  it("REJECT resolves to REJECTED", async () => {
    const res = await svc.resolve({
      challengeId: "chal-1",
      reviewer: "Ops Admin",
      action: "REJECT",
      reasoning: "No supporting evidence.",
    });
    expect(res.status).toBe("REJECTED");
  });

  it("refuses to resolve an already-resolved challenge", async () => {
    state.challenge = baseChallenge({ status: "RESOLVED_UPHELD" });
    await expect(
      svc.resolve({
        challengeId: "chal-1",
        reviewer: "Ops Admin",
        action: "UPHOLD",
        reasoning: "again",
      }),
    ).rejects.toThrow();
  });
});
