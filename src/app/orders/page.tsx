"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { EligibleOrderDTO, ReturnCaseDTO } from "@/types/dto";
import { Badge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/ProductImage";
import { LoadingState, ErrorState } from "@/components/flow/States";

export default function OrdersPage() {
  const [orders, setOrders] = useState<EligibleOrderDTO[] | null>(null);
  const [returnCases, setReturnCases] = useState<ReturnCaseDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setError(null);
    setOrders(null);
    apiClient
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load orders"));
    // Also fetch return cases so we can link to the specific case for each item
    apiClient.getReturnCases().then(setReturnCases).catch(() => undefined);
  }
  useEffect(load, []);

  /** Find the return case for a given item (most recent non-terminal first). */
  function caseForItem(itemId: string): ReturnCaseDTO | undefined {
    return returnCases.find((c) => c.itemId === itemId);
  }

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
          const prod = o.order.product;
          const isResold = !!it;
          // Unified display fields for either ecosystem.
          const display = it
            ? { name: it.name, brand: it.brand, category: it.category, imageUrl: it.imageUrl, price: it.originalPrice }
            : {
                name: prod?.name ?? "Product",
                brand: prod?.brand ?? null,
                category: prod?.category ?? "",
                imageUrl: prod?.imageUrl ?? null,
                price: prod?.price ?? 0,
              };
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
                <ProductImage
                  src={display.imageUrl}
                  category={display.category}
                  alt={display.name}
                  className="h-20 w-20 shrink-0 rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">{display.name}</h3>
                  <p className="text-xs text-storm">
                    {display.brand ? `${display.brand} · ` : ""}
                    {display.category} · ₹{display.price.toLocaleString("en-IN")}
                    {!isResold && o.order.quantity > 1 ? ` · Qty ${o.order.quantity}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={isResold ? "neutral" : "info"}>
                      {isResold ? "Second-life" : "Brand New"}
                    </Badge>
                    {s === "CANCELLED" ? (
                      <Badge tone="danger">Order cancelled</Badge>
                    ) : s === "RETURNED" ? (
                      <Badge tone="neutral">Returned</Badge>
                    ) : s === "RETURN_REQUESTED" ? (
                      <Badge tone="warn">Return in progress</Badge>
                    ) : notDelivered ? (
                      <Badge tone="info">{s === "SHIPPED" ? "Shipped" : "Order placed"}</Badge>
                    ) : !isResold ? (
                      <Badge tone="success">Delivered</Badge>
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

                  {/* Return in progress → view progress + cancel (resold only) */}
                  {isResold && it && s === "RETURN_REQUESTED" && (
                    <>
                      <Link
                        href={caseForItem(it.id) ? `/return?caseId=${caseForItem(it.id)!.id}` : "/return"}
                        className="rounded-full bg-ember px-4 py-2 text-center text-sm font-medium text-white hover:bg-ember/90"
                      >
                        View return &amp; decision
                      </Link>
                      <button
                        onClick={() => run(o.order.id, () => apiClient.cancelReturn(it.id), "Could not cancel return")}
                        disabled={busyId === o.order.id}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-mist disabled:opacity-50"
                      >
                        {busyId === o.order.id ? "Cancelling…" : "Cancel return request"}
                      </button>
                    </>
                  )}

                  {/* Delivered + within window → return (resold only) */}
                  {isResold && it && s === "DELIVERED" && o.returnEligible && (
                    <Link
                      href={`/return?itemId=${it.id}`}
                      className="rounded-full bg-amzYellow px-4 py-2 text-center text-sm font-medium text-ink hover:bg-amzYellowDark"
                    >
                      Return &amp; get Nemo decision
                    </Link>
                  )}

                  {/* Returned items — view the completed decision */}
                  {isResold && it && s === "RETURNED" && caseForItem(it.id) && (
                    <Link
                      href={`/return?caseId=${caseForItem(it.id)!.id}`}
                      className="rounded-full border border-ember bg-white px-4 py-2 text-center text-sm font-medium text-ember hover:bg-ember/5"
                    >
                      View Nemo decision
                    </Link>
                  )}

                  {/* Delivered + window closed → resell (resold only, #12b, #18) */}
                  {isResold && it && s === "DELIVERED" && !o.returnEligible && (
                    <>
                      <span className="rounded-full bg-mist px-4 py-2 text-center text-xs text-storm">
                        Return window closed
                      </span>
                      <Link
                        href={`/sell?itemId=${it.id}`}
                        className="rounded-full bg-amzOrange px-4 py-2 text-center text-sm font-medium text-ink hover:bg-amzOrangeDark"
                      >
                        Resell on Amazon Nemo
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
