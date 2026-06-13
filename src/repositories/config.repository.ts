import type { Prisma, RoutingConfig } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CONFIG_SINGLETON_KEY } from "@/config/constants";
import { NotFoundError } from "@/lib/errors";

/**
 * Config repository — the ONLY way to read/write the RoutingConfig rules table.
 *
 * Pure data access: no business logic. Services read rules from here so that
 * thresholds, radii, bands, and factors are never hardcoded in code.
 */
export const configRepository = {
  /** Fetch the singleton rules row. Throws if the seed hasn't run. */
  async getRules(): Promise<RoutingConfig> {
    const config = await prisma.routingConfig.findUnique({
      where: { id: CONFIG_SINGLETON_KEY },
    });
    if (!config) {
      throw new NotFoundError(
        "RoutingConfig not found. Run `npm run db:seed` to populate the rules table.",
      );
    }
    return config;
  },

  /** Upsert the singleton rules row (used by the seed and live-edit demos). */
  async upsert(
    data: Omit<Prisma.RoutingConfigCreateInput, "id">,
  ): Promise<RoutingConfig> {
    return prisma.routingConfig.upsert({
      where: { id: CONFIG_SINGLETON_KEY },
      create: { id: CONFIG_SINGLETON_KEY, ...data },
      update: data,
    });
  },

  /** Patch specific rule fields (used to change behavior live in the demo). */
  async update(
    patch: Prisma.RoutingConfigUpdateInput,
  ): Promise<RoutingConfig> {
    return prisma.routingConfig.update({
      where: { id: CONFIG_SINGLETON_KEY },
      data: patch,
    });
  },
};
