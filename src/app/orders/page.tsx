"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { EligibleOrderDTO } from "@/types/dto";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/flow/States";

function categoryIcon(cat?: string) {
  return cat === "Footwear" ? "👟" : cat === "Electronics" ? "🎧" : cat === "Apparel" ? "🧥" : "📦";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<EligibleOrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  function load() {
    setError(null);
    setOrders(null);
    apiClient
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
  }
  useEffect(load, []);

  async function cancelReturn(itemId: string) {
    setCancelling(itemId);
    try {
      await apiClient.cancelReturn(itemId);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel the return");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Your Orders</h1>
      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}
      {!error && !orders && <div className="mt-6"><LoadingState label="Loading your orders…" /></div>}

      <div className="mt-4 space-y-3">
        {orders?.map((o) => {
          const it = o.order.item;
          return (
            <div key={o.order.id} className="overflow-hidden rounded border border-line bg-white">
              <div className="flex items-center justify-between border-b border-line bg-mist/40 px-4 py-2 text-xs text-storm">
                <span>
                  ORDER PLACED{" "}
                  <span className="font-medium text-ink">
                    {new Date(o.order.orderedAt).toLocaleDateString("en-IN")}
                  </span>
                </span>
                <span>
                  DELIVERED{" "}
                  <span className="font-medium text-ink">
                    {new Date(o.order.deliveredAt).toLocaleDateString("en-IN")}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-20 w-20 items-center justify-center rounded bg-mist/50 text-4xl">
                  {categoryIcon(it.category)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">{it.name}</h3>
                  <p className="text-xs text-storm">
                    {it.brand ? `${it.brand} · ` : ""}
                    {it.category} · ₹{it.originalPrice.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-2">
                    {o.returnEligible ? (
                      <Badge tone="success">Returnable · {o.returnDaysLeft} day(s) left</Badge>
                    ) : (
                      <Badge tone="danger">{o.reasonIfNot ?? "Not returnable"}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {o.order.status === "RETURN_REQUESTED" ? (
                    <button
                      onClick={() => cancelReturn(it.id)}
                      disabled={cancelling === it.id}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-mist disabled:opacity-50"
                    >
                      {cancelling === it.id ? "Cancelling…" : "Cancel return request"}
                    </button>
                  ) : o.returnEligible ? (
                    <Link
                      href={`/return?itemId=${it.id}`}
                      className="rounded-full bg-amzYellow px-4 py-2 text-center text-sm font-medium text-ink hover:bg-amzYellowDark"
                    >
                      Return item
                    </Link>
                  ) : (
                    <>
                      <span className="rounded-full bg-mist px-4 py-2 text-center text-xs text-storm">
                        Return window closed
                      </span>
                      {/* #18: resale only allowed once the return window is over */}
                      <Link
                        href={`/sell?itemId=${it.id}`}
                        className="rounded-full bg-amzOrange px-4 py-2 text-center text-sm font-medium text-ink hover:bg-amzOrangeDark"
                      >
                        Resell on ReLoop
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
