/**
 * Phase 0 verification helper: proves the app fails loudly when a required
 * env var is missing. Run with: npx tsx scripts/env-fail-check.ts
 */
delete process.env.DATABASE_URL;
process.env.UPSTASH_REDIS_REST_URL = "https://x.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "tok";

import("../src/config/env")
  .then(() => {
    console.error("FAIL: env loaded despite missing DATABASE_URL");
    process.exit(1);
  })
  .catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("DATABASE_URL")) {
      console.info("PASS: app failed loudly. Message excerpt:");
      console.info(msg.split("\n").slice(0, 6).join("\n"));
      process.exit(0);
    }
    console.error("FAIL: threw, but not about DATABASE_URL:\n", msg);
    process.exit(1);
  });
