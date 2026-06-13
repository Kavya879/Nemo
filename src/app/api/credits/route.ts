import { creditsService } from "@/services/credits/credits.service";
import { CreditsRequestSchema } from "@/types/api";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/credits?userId= — running impact totals for a user. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    const totals = await creditsService.totals(userId);
    return ok(totals);
  } catch (error) {
    return fail(error);
  }
}

/** POST /api/credits — award credits for a second-life action. */
export async function POST(request: Request) {
  try {
    const input = await parseJsonBody(request, CreditsRequestSchema);
    const result = await creditsService.award(input);
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
