"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminCaseRowDTO } from "@/types/dto";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/flow/States";

/**
 * Delivery-rejection review queue. When a delivery partner rejects a second-hand
 * item (at return pickup or at the second-life transfer verification), the case
 * parks in DELIVERY_REJECTED_REVIEW. An admin decides per item:
 *  • KEEP   — relist it in the store (back into inventory for resale), or
 *  • REMOVE — pull it from the store completely (deactivate + route the item out).
 */
export function DeliveryRejections() {
  const [rows, setRows] = useState<AdminCaseRowDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    apiClient
      .adminCases()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load rejections"));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live refresh
    return () => clearInterval(t);
  }, []);

  async function resolve(id: string, action: "KEEP" | "REMOVE") {
    setBusyId(id);
    setError(null);
    try {
      await apiClient.adminResolveRejection(id, action);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resolve the rejection");
    } finally {
      setBusyId(null);
    }
  }

  const pending = rows?.filter((r) => r.status === "DELIVERY_REJECTED_REVIEW") ?? [];

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-bold">Delivery Rejections</h2>
        <p className="text-sm text-storm">
          Second-hand items a delivery partner rejected at pickup/verification. Keep each one in
          the store (relist for resale) or remove it from the store completely.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !rows && <LoadingState label="Loading rejection queue…" />}

      {rows && pending.length === 0 && (
        <p className="rounded border border-line bg-white p-4 text-sm text-storm">
          No rejected items awaiting review. 🎉
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="rounded-card border border-warn/40 bg-warn/5 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ProductImage
                    src={r.imageUrl}
                    category={r.category}
                    alt={r.itemName}
                    className="h-10 w-10 shrink-0 rounded"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{r.itemName}</span>
                      {r.grade && <GradeBadge grade={r.grade} size="sm" />}
                    </div>
                    <div className="text-xs text-storm">
                      {r.brand ? `${r.brand} · ` : ""}
                      {r.category} · was ₹{r.originalPrice.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <Badge tone="warn">Awaiting review</Badge>
              </div>

              <p className="mb-3 rounded border border-line bg-white p-2 text-xs text-storm">
                <span className="font-semibold text-ink">Rejection reason: </span>
                {r.rejectionReason ?? "Not recorded."}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button disabled={busyId === r.id} onClick={() => resolve(r.id, "KEEP")}>
                  ♻️ Keep in inventory
                </Button>
                <Button
                  variant="danger"
                  disabled={busyId === r.id}
                  onClick={() => resolve(r.id, "REMOVE")}
                >
                  🗑️ Remove from store
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
