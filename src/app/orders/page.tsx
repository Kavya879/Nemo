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
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setError(null);
    setOrders(null);
    apiClient
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
  }
  useEffect(load, []);

  async function run(id: string, fn: () => Promise<unknown>, msg: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : msg);
    } finally {
      setBusyId(null);
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
          const s = o.order.status;
          const notDelivered = s === "PLACED" || s === "SHIPPED";
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
                  {o.order.deliveredAt ? (
                    <>
                      DELIVERED{" "}
                      <span className="font-medium text-ink">
                        {new Date(o.order.deliveredAt).toLocaleDateString("en-IN")}
                      </span>
                    </>
                  ) : s === "CANCELLED" ? (
                    <span className="font-medium text-danger">CANCELLED</span>
                  ) : (
                    <span className="font-medium text-ember">ARRIVING SOON</span>
                  )}
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
                    {s === "CANCELLED" ? (
                      <Badge tone="danger">Order cancelled</Badge>
                    ) : s === "RETURNED" ? (
                      <Badge tone="neutral">Returned</Badge>
                    ) : s === "RETURN_REQUESTED" ? (
                      <Badge tone="warn">Return in progress</Badge>
                    ) : notDelivered ? (
                      <Badge tone="info">{s === "SHIPPED" ? "Shipped" : "Order placed"}</Badge>
                    ) : o.returnEligible ? (
                      <Badge tone="success">Returnable · {o.returnDaysLeft} day(s) left</Badge>
                    ) : (
                      <Badge tone="danger">{o.reasonIfNot ?? "Not returnable"}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Before delivery → cancel the order */}
                  {notDelivered && (
                    <button
                      onClick={() => run(o.order.id, () => apiClient.cancelOrder(o.order.id), "Could not cancel order")}
                      disabled={busyId === o.order.id}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-mist disabled:opacity-50"
                    >
                      {busyId === o.order.id ? "Cancelling…" : "Cancel order"}
                    </button>
                  )}

                  {/* Return in progress → cancel the return */}
                  {s === "RETURN_REQUESTED" && (
                    <button
                      onClick={() => run(o.order.id, () => apiClient.cancelReturn(it.id), "Could not cancel return")}
                      disabled={busyId === o.order.id}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-mist disabled:opacity-50"
                    >
                      {busyId === o.order.id ? "Cancelling…" : "Cancel return request"}
                    </button>
                  )}

                  {/* Delivered + within window → return */}
                  {s === "DELIVERED" && o.returnEligible && (
                    <Link
                      href={`/return?itemId=${it.id}`}
                      className="rounded-full bg-amzYellow px-4 py-2 text-center text-sm font-medium text-ink hover:bg-amzYellowDark"
                    >
                      Return item
                    </Link>
                  )}

                  {/* Delivered + window closed → resell (#12b, #18) */}
                  {s === "DELIVERED" && !o.returnEligible && (
                    <>
                      <span className="rounded-full bg-mist px-4 py-2 text-center text-xs text-storm">
                        Return window closed
                      </span>
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
