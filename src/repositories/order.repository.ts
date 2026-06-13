import type { Item, Order, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type OrderWithItem = Order & { item: Item };

/**
 * Order repository — data access for customer orders (the basis for returns).
 */
export const orderRepository = {
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return prisma.order.create({ data });
  },

  async listForUser(userId: string): Promise<OrderWithItem[]> {
    return prisma.order.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { deliveredAt: "desc" },
    });
  },

  async findByItem(itemId: string, userId: string): Promise<OrderWithItem | null> {
    return prisma.order.findFirst({
      where: { itemId, userId },
      include: { item: true },
    });
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return prisma.order.update({ where: { id }, data: { status } });
  },
};
