import { notificationsService } from "@/services/notifications/notifications.service";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/notifications?userId= — the user's derived activity feed. */
export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId") ?? "demo-user";
    return ok(await notificationsService.listForUser(userId));
  } catch (error) {
    return fail(error);
  }
}
