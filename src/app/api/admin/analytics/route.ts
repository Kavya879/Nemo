import { adminService } from "@/services/admin/admin.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/analytics — impact & operations aggregates. */
export async function GET() {
  try {
    return ok(await adminService.analytics());
  } catch (error) {
    return fail(error);
  }
}
