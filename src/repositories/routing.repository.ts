import type { Prisma, RoutingDecision } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * RoutingDecision repository — data access for routing decisions (auditable).
 */
export const routingRepository = {
  async create(data: Prisma.RoutingDecisionCreateInput): Promise<RoutingDecision> {
    return prisma.routingDecision.create({ data });
  },

  async findLatestForItem(itemId: string): Promise<RoutingDecision | null> {
    return prisma.routingDecision.findFirst({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
  },
};
