import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";
import { UpstreamError } from "@/lib/errors";

// Health checks must never be cached.
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Pings the database and reports connectivity. Returns:
 *   { status: "ok", db: "connected" }
 */
export async function GET() {
  try {
    // Cheapest possible round-trip that proves the connection works.
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", db: "connected" });
  } catch (error) {
    return fail(
      new UpstreamError("Database connectivity check failed.", {
        cause: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
