import type {
  Item,
  Prisma,
  ReturnCase,
  ReturnEvent,
  ReturnStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export type ReturnCaseWithRelations = ReturnCase & {
  item: Item;
  events: ReturnEvent[];
};

/**
 * ReturnCase repository — data access for the return-decision state machine and
 * its append-only event trail. Transitions update the case and log an event in
 * a single transaction so state is always persisted and traceable together.
 */
export const returnCaseRepository = {
  async create(data: Prisma.ReturnCaseCreateInput): Promise<ReturnCase> {
    return prisma.returnCase.create({ data });
  },

  async findById(id: string): Promise<ReturnCaseWithRelations | null> {
    return prisma.returnCase.findUnique({
      where: { id },
      include: { item: true, events: { orderBy: { createdAt: "asc" } } },
    });
  },

  async listForUser(userId: string): Promise<ReturnCaseWithRelations[]> {
    return prisma.returnCase.findMany({
      where: { userId },
      include: { item: true, events: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Admin view: every return case (all users), newest first. */
  async listAll(limit = 200): Promise<ReturnCaseWithRelations[]> {
    return prisma.returnCase.findMany({
      include: { item: true, events: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  /** Cases that are in the active Second Life window (for buyer sweeps / expiry). */
  async listActiveSecondLife(): Promise<ReturnCase[]> {
    return prisma.returnCase.findMany({
      where: { status: { in: ["SECOND_LIFE_LISTED", "BUYER_RESERVED"] } },
    });
  },

  /**
   * Atomic transition: patch the case fields AND append an audit event.
   * Returns the fully-hydrated case.
   */
  async transition(
    id: string,
    args: {
      status: ReturnStatus;
      message: string;
      data?: Prisma.InputJsonValue;
      patch?: Prisma.ReturnCaseUpdateInput;
    },
  ): Promise<ReturnCaseWithRelations> {
    await prisma.$transaction([
      prisma.returnCase.update({
        where: { id },
        data: { status: args.status, ...(args.patch ?? {}) },
      }),
      prisma.returnEvent.create({
        data: {
          returnCaseId: id,
          status: args.status,
          message: args.message,
          ...(args.data !== undefined ? { data: args.data } : {}),
        },
      }),
    ]);
    const hydrated = await this.findById(id);
    if (!hydrated) throw new Error(`ReturnCase ${id} vanished after transition.`);
    return hydrated;
  },
};
