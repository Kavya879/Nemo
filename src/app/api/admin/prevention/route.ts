import { adminService } from "@/services/admin/admin.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/prevention — learned return-reason patterns + nudges. */
export async function GET() {
  try {
    return ok(await adminService.prevention());
  } catch (error) {
    return fail(error);
  }
}
