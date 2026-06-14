import { adminService } from "@/services/admin/admin.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/return-cases/:id — Decision Explorer (feasibility + live routing). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    return ok(await adminService.caseDetail(params.id));
  } catch (error) {
    return fail(error);
  }
}
