import { z } from "zod";
import { returnDealsService } from "@/services/return-deals/return-deals.service";
import { parseJsonBody } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const WarehousePickupSchema = z.object({ caseId: z.string().min(1) });

/**
 * POST /api/delivery/warehouse-pickup — an in-transit deal expired unsold; the
 * delivery partner collects it and routes it to the nearest Amazon warehouse.
 */
export async function POST(request: Request) {
  try {
    const { caseId } = await parseJsonBody(request, WarehousePickupSchema);
    await returnDealsService.collectExpiredToWarehouse(caseId);
    return ok({ caseId, collected: true });
  } catch (error) {
    return fail(error);
  }
}
