import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  // Check the order status for demo-item-tshirt
  const orders = await p.order.findMany({
    where: { itemId: "demo-item-tshirt" },
    select: { id: true, status: true, deliveredAt: true, itemId: true },
  });
  console.log("Orders for demo-item-tshirt:", JSON.stringify(orders, null, 2));

  // Check all orders for demo-user
  const allOrders = await p.order.findMany({
    where: { userId: "demo-user", item: { isNot: null } },
    select: { id: true, status: true, deliveredAt: true, itemId: true },
  });
  console.log("\nAll demo-user item orders:");
  for (const o of allOrders) {
    const eligible = o.status === "DELIVERED" && o.deliveredAt && 
      (Date.now() - new Date(o.deliveredAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
    console.log(`  ${o.itemId?.padEnd(25)} | ${o.status.padEnd(18)} | delivered: ${o.deliveredAt?.toISOString().slice(0,10) ?? 'N/A'} | eligible: ${eligible}`);
  }
}

main().then(() => p.$disconnect());
