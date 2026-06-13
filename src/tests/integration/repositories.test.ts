import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { itemRepository } from "@/repositories/item.repository";
import { configRepository } from "@/repositories/config.repository";
import { isDbAvailable } from "@/tests/helpers/db-available";

/**
 * Phase 1 verification: repository methods do real round-trips.
 * Skips cleanly if no live DB is configured (so the suite stays green locally).
 * Run `npm run db:migrate && npm run db:seed` first for the config test to pass.
 */
describe("repository integration", () => {
  let dbUp = false;

  beforeAll(async () => {
    dbUp = await isDbAvailable();
    if (!dbUp) {
      console.warn(
        "⚠ Skipping repository integration tests — no live DB reachable. " +
          "Set DATABASE_URL and run migrations to enable.",
      );
    }
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.item
        .deleteMany({ where: { name: "TEST Roundtrip Widget" } })
        .catch(() => undefined);
    }
  });

  it("creates an item and fetches it back", async () => {
    if (!dbUp) return;
    const created = await itemRepository.create({
      name: "TEST Roundtrip Widget",
      category: "Electronics",
      originalPrice: 1000,
    });
    expect(created.id).toBeTruthy();

    const fetched = await itemRepository.findById(created.id);
    expect(fetched?.name).toBe("TEST Roundtrip Widget");
    expect(fetched?.category).toBe("Electronics");

    // cleanup this specific row
    await prisma.item.delete({ where: { id: created.id } });
  });

  it("reads the seeded config rules", async () => {
    if (!dbUp) return;
    const rules = await configRepository.getRules();
    expect(rules.id).toBe("default");
    expect(rules.matchRadiusKm).toBeGreaterThan(0);
    expect(rules.priceBands).toBeTruthy();
    expect(rules.gradeDefaultRoutes).toBeTruthy();
  });
});
