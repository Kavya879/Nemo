import { adminService } from "@/services/admin/admin.service";
import { CUSTOMER_LOCATION } from "@/config/constants";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/map?lat=&lng= — buyers, return origins, FCs, match connections.
 *  Coordinates are optional; when present (from the browser's live geolocation)
 *  they become the map origin so distances/nearest-FC reflect the real location. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const origin =
      Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
        ? { lat, lng }
        : CUSTOMER_LOCATION;
    return ok(await adminService.mapData(origin));
  } catch (error) {
    return fail(error);
  }
}
