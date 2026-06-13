import { Redis } from "@upstash/redis";
import { env } from "@/config/env";

/**
 * Upstash Redis client (REST-based, edge-friendly).
 *
 * Used by the matching service to keep a fast index of "who wants what nearby".
 * Like the Prisma client, cached on globalThis to survive dev hot reloads.
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis: Redis =
  globalForRedis.redis ??
  new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

if (env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
