import type { Buyer } from "@prisma/client";
import { redis } from "@/lib/redis";
import { buyerRepository } from "@/repositories/buyer.repository";
import { configRepository } from "@/repositories/config.repository";
import { REDIS_KEYS } from "@/config/constants";
import { haversineKm } from "@/lib/geo";
import type { BuyerMatch, GeoPoint } from "@/types";

/**
 * Matching service — the Nearby Buyer Match.
 *
 * Uses a Redis (Upstash) index of "who wants what nearby" for fast category
 * lookups, then ranks candidates by great-circle distance and filters to the
 * configured radius. Falls back to the DB if the Redis index is cold, and warms
 * it for next time. Radius comes from config.
 */

/** Pure ranking core: filter buyers to radius around origin, sort by distance. */
export function rankWithinRadius(
  origin: GeoPoint,
  buyers: Array<Pick<Buyer, "id" | "name" | "lat" | "lng">>,
  radiusKm: number,
): BuyerMatch[] {
  return buyers
    .map((b) => ({
      buyerId: b.id,
      name: b.name,
      lat: b.lat,
      lng: b.lng,
      distanceKm: Number(haversineKm(origin, { lat: b.lat, lng: b.lng }).toFixed(3)),
    }))
    .filter((m) => m.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export interface MatchRequest {
  category: string;
  origin: GeoPoint;
  /** Optional override; defaults to the configured radius. */
  radiusKm?: number;
}

export function createMatchingService() {
  /** Adds/refreshes a buyer in the Redis index for each wished category. */
  async function indexBuyer(buyer: Buyer): Promise<void> {
    await redis.hset(REDIS_KEYS.buyer(buyer.id), {
      name: buyer.name,
      lat: buyer.lat,
      lng: buyer.lng,
    });
    for (const category of buyer.wishlist) {
      await redis.sadd(REDIS_KEYS.wishlistByCategory(category), buyer.id);
    }
  }

  /** (Re)builds the entire index from the DB. Idempotent. */
  async function rebuildIndex(): Promise<number> {
    const buyers = await buyerRepository.list();
    for (const b of buyers) await indexBuyer(b);
    return buyers.length;
  }

  /** Hydrates buyers for a category from Redis; rebuilds from DB if cold. */
  async function buyersForCategory(
    category: string,
  ): Promise<Array<Pick<Buyer, "id" | "name" | "lat" | "lng">>> {
    let ids = await redis.smembers(REDIS_KEYS.wishlistByCategory(category));
    if (!ids || ids.length === 0) {
      // Cold index — warm it from the DB, then retry.
      await rebuildIndex();
      ids = await redis.smembers(REDIS_KEYS.wishlistByCategory(category));
    }
    if (!ids || ids.length === 0) return [];

    const hydrated = await Promise.all(
      ids.map(async (id) => {
        const data = await redis.hgetall<{ name: string; lat: number; lng: number }>(
          REDIS_KEYS.buyer(id),
        );
        if (!data) return null;
        return {
          id,
          name: data.name,
          lat: Number(data.lat),
          lng: Number(data.lng),
        };
      }),
    );
    return hydrated.filter((b): b is NonNullable<typeof b> => b !== null);
  }

  return {
    indexBuyer,
    rebuildIndex,

    async findNearby(req: MatchRequest): Promise<BuyerMatch[]> {
      const config = await configRepository.getRules();
      const radiusKm = req.radiusKm ?? config.matchRadiusKm;
      const candidates = await buyersForCategory(req.category);
      return rankWithinRadius(req.origin, candidates, radiusKm);
    },
  };
}

export const matchingService = createMatchingService();
