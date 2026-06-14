/**
 * Reverse geocoding via OpenStreetMap Nominatim (keyless). Server-side only.
 * Results are cached per rounded coordinate so a busy delivery board doesn't
 * hammer the service (its policy is ~1 req/sec), and every call is timeout- and
 * failure-tolerant — it returns null on any problem so callers can fall back.
 */

const cache = new Map<string, string | null>();

const key = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

/** Short, human address (first few segments of the OSM display name). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const k = key(lat, lng);
  if (cache.has(k)) return cache.get(k) ?? null;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
      `&zoom=18&addressdetails=0`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "AmazonNemo/1.0 (delivery-routing demo)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      cache.set(k, null);
      return null;
    }
    const data = (await res.json()) as { display_name?: string };
    const full = data.display_name ?? null;
    // Keep it concise: first 4 comma-separated parts (street, area, locality, city).
    const short = full ? full.split(", ").slice(0, 4).join(", ") : null;
    cache.set(k, short);
    return short;
  } catch {
    cache.set(k, null);
    return null;
  }
}
