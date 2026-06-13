import type {
  Grade,
  GradeResult,
  Item,
  ItemStatus,
  Prisma,
  RoutingDecision,
} from "@prisma/client";
import { prisma } from "@/lib/db";

/** What a fully-hydrated item looks like (with its latest related rows). */
export type ItemWithRelations = Item & {
  gradeResults: GradeResult[];
  routingDecisions: RoutingDecision[];
};

/**
 * Item repository — data access for the physical product. No business logic.
 */
export const itemRepository = {
  async create(data: Prisma.ItemCreateInput): Promise<Item> {
    return prisma.item.create({ data });
  },

  async findById(id: string): Promise<Item | null> {
    return prisma.item.findUnique({ where: { id } });
  },

  /** Item with its grade + routing history, newest first. */
  async findByIdWithRelations(id: string): Promise<ItemWithRelations | null> {
    return prisma.item.findUnique({
      where: { id },
      include: {
        gradeResults: { orderBy: { createdAt: "desc" } },
        routingDecisions: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async list(limit = 50): Promise<Item[]> {
    return prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async updateStatus(id: string, status: ItemStatus): Promise<Item> {
    return prisma.item.update({ where: { id }, data: { status } });
  },

  async updateGrade(id: string, grade: Grade): Promise<Item> {
    return prisma.item.update({
      where: { id },
      data: { currentGrade: grade, status: "GRADED" },
    });
  },
};
