import { prisma } from "@/lib/db";

/**
 * Detects whether a live database is reachable. Integration tests use this to
 * skip cleanly (rather than fail) when no DATABASE_URL is configured yet — so
 * `npm test` stays green locally, and the full suite runs once creds exist.
 */
let cached: boolean | null = null;

export async function isDbAvailable(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    await prisma.$queryRaw`SELECT 1`;
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}
