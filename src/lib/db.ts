import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloads modules, which would otherwise create a
 * new PrismaClient (and a new connection pool) on every reload and exhaust the
 * database connection limit. We cache the instance on `globalThis` to reuse it.
 *
 * This file and the repositories are the ONLY places allowed to import Prisma.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
