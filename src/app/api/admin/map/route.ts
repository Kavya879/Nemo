import { adminService } from "@/services/admin/admin.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/map — buyers, return origins, and match connections. */
export async function GET() {
  try {
    return ok(await adminService.mapData());
  } catch (error) {
    return fail(error);
  }
}
