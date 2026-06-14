import { advisorService } from "@/services/intelligence/advisor.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/intelligence/advisor?userId=… — personalized purchase-advisor summary. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    return ok(await advisorService.summary(userId));
  } catch (error) {
    return fail(error);
  }
}
