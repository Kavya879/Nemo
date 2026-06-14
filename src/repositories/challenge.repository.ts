import type {
  Challenge,
  ChallengeEvent,
  ChallengeEvidence,
  ChallengeStatus,
  Item,
  Prisma,
  ReturnCase,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export type ChallengeWithRelations = Challenge & {
  evidence: ChallengeEvidence[];
  events: ChallengeEvent[];
  /** Always present — every challenge links to an item. */
  item: Item;
  /** Present for return-flow challenges; null for Sell-flow verification escalations. */
  returnCase: (ReturnCase & { item: Item }) | null;
};

const INCLUDE = {
  evidence: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { createdAt: "asc" } },
  item: true,
  returnCase: { include: { item: true } },
} as const;

/**
 * Challenge repository — data access for AI-verdict disputes and their
 * append-only event trail. Transitions update the challenge and log an event in
 * a single transaction, mirroring the return-case repository so a challenge is
 * always persisted and auditable together.
 */
export const challengeRepository = {
  async create(
    data: Prisma.ChallengeCreateInput,
    evidence?: Prisma.ChallengeEvidenceCreateWithoutChallengeInput[],
  ): Promise<ChallengeWithRelations> {
    const created = await prisma.challenge.create({
      data: {
        ...data,
        ...(evidence && evidence.length ? { evidence: { create: evidence } } : {}),
      },
    });
    const hydrated = await this.findById(created.id);
    if (!hydrated) throw new Error(`Challenge ${created.id} vanished after create.`);
    return hydrated;
  },

  async findById(id: string): Promise<ChallengeWithRelations | null> {
    return prisma.challenge.findUnique({ where: { id }, include: INCLUDE });
  },

  /** Open challenge for a given return case, if any (one active dispute at a time). */
  async findOpenForCase(returnCaseId: string): Promise<Challenge | null> {
    return prisma.challenge.findFirst({
      where: {
        returnCaseId,
        status: { in: ["OPEN", "UNDER_REVIEW", "NEEDS_MORE_INFO"] },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Open verification escalation for an item, if any (prevents duplicates). */
  async findOpenVerificationForItem(itemId: string): Promise<Challenge | null> {
    return prisma.challenge.findFirst({
      where: {
        itemId,
        kind: { in: ["RETURN_VERIFICATION", "SELL_VERIFICATION"] },
        status: { in: ["OPEN", "UNDER_REVIEW", "NEEDS_MORE_INFO"] },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listForUser(userId: string): Promise<ChallengeWithRelations[]> {
    return prisma.challenge.findMany({
      where: { openedByUserId: userId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  /** Ops view: every challenge (all users), newest first. */
  async listAll(limit = 200): Promise<ChallengeWithRelations[]> {
    return prisma.challenge.findMany({
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async addEvidence(
    challengeId: string,
    evidence: Prisma.ChallengeEvidenceCreateWithoutChallengeInput[],
  ): Promise<void> {
    if (!evidence.length) return;
    await prisma.challengeEvidence.createMany({
      data: evidence.map((e) => ({ ...e, challengeId })),
    });
  },

  /** Atomic transition: patch the challenge AND append an audit event. */
  async transition(
    id: string,
    args: {
      status: ChallengeStatus;
      message: string;
      actor: string;
      data?: Prisma.InputJsonValue;
      patch?: Prisma.ChallengeUpdateInput;
    },
  ): Promise<ChallengeWithRelations> {
    await prisma.$transaction([
      prisma.challenge.update({
        where: { id },
        data: { status: args.status, ...(args.patch ?? {}) },
      }),
      prisma.challengeEvent.create({
        data: {
          challengeId: id,
          status: args.status,
          message: args.message,
          actor: args.actor,
          ...(args.data !== undefined ? { data: args.data } : {}),
        },
      }),
    ]);
    const hydrated = await this.findById(id);
    if (!hydrated) throw new Error(`Challenge ${id} vanished after transition.`);
    return hydrated;
  },
};
