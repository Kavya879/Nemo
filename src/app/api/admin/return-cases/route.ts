import { adminService } from "@/services/admin/admin.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/return-cases — every return case (live command-center queue). */
export async function GET() {
  try {
    return ok(await adminService.listCases());
  } catch (error) {
    return fail(error);
  }
}
