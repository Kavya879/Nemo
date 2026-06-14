import { configRepository } from "@/repositories/config.repository";
import { ConfigPatchSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/admin/config — the live routing rules from the config table. */
export async function GET() {
  try {
    return ok(await configRepository.getRules());
  } catch (error) {
    return fail(error);
  }
}

/** PATCH /api/admin/config — change rules live (no redeploy). */
export async function PATCH(request: Request) {
  try {
    const patch = await parseJsonBody(request, ConfigPatchSchema);
    return ok(await configRepository.update(patch));
  } catch (error) {
    return fail(error);
  }
}
