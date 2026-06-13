import { prisma } from "@/lib/db";

/**
 * System repository — low-level health/diagnostic data access.
 * Keeps the "only repositories touch the database" rule intact for the
 * health endpoint.
 */
export const systemRepository = {
  /** Cheapest round-trip that proves the DB connection works. Throws on failure. */
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
