import type { Item, Order, OrderStatus, Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/db";

export type OrderWithItem = Order & { item: Item };
/** An order from either ecosystem — item-backed (resold) OR product-backed (brand-new). */
export type OrderWithLines = Order & { item: Item | null; product: Product | null };

/**
 * Order repository — data access for customer orders (the basis for returns).
 */
export const orderRepository = {
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return prisma.order.create({ data });
  },

  /**
   * Returnable orders for a user — only item-backed (resold/second-life)
   * purchases. Brand-new product orders carry no Item and aren't part of the
   * return/refund flow, so they're excluded from this list.
   */
  async listForUser(userId: string): Promise<OrderWithItem[]> {
    const orders = await prisma.order.findMany({
      where: { userId, itemId: { not: null } },
      include: { item: true },
      orderBy: { deliveredAt: "desc" },
    });
    return orders.filter((o) => o.item !== null) as OrderWithItem[];
  },

  /**
   * ALL orders for a user across both ecosystems — resold (item) and brand-new
   * (product) — for the "Your Orders" page. Newest first.
   */
  async listAllForUser(userId: string): Promise<OrderWithLines[]> {
    return prisma.order.findMany({
      where: { userId },
      include: { item: true, product: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({ where: { id } });
  },

  async findByItem(itemId: string, userId: string): Promise<OrderWithItem | null> {
    return prisma.order.findFirst({
      where: { itemId, userId },
      include: { item: true },
    }) as Promise<OrderWithItem | null>;
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return prisma.order.update({ where: { id }, data: { status } });
  },
};
