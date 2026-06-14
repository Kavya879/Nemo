"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { Grade } from "@/types";
import type { ListingDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/GradeBadge";
import { LoadingState } from "@/components/flow/States";

const CATEGORIES = ["Footwear", "Electronics", "Apparel", "Home", "Books", "Other"];
const GRADES: Grade[] = ["A", "B", "C", "D"];

function SellInner() {
  const search = useSearchParams();
  const resellItemId = search.get("itemId");

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [brand, setBrand] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [grade, setGrade] = useState<Grade>("B");

  const [prefilling, setPrefilling] = useState<boolean>(!!resellItemId);
  const [locked, setLocked] = useState(false); // fields locked when reselling an owned item
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ListingDTO | null>(null);

  // Resell flow: prefill from the owned item + enforce "only after return window closes".
  useEffect(() => {
    if (!resellItemId) return;
    (async () => {
      try {
        const [items, orders] = await Promise.all([apiClient.getItems(), apiClient.getOrders()]);
        const item = items.find((i) => i.id === resellItemId);
        if (!item) {
          setBlockedReason("That item could not be found.");
          return;
        }
        setName(item.name);
        setCategory(item.category);
        setBrand(item.brand ?? "");
        setOriginalPrice(String(item.originalPrice));
        if (item.currentGrade) setGrade(item.currentGrade);
        setLocked(true);

        // #18: cannot resell while the order is still within its return window.
        const order = orders.find((o) => o.order.item.id === resellItemId);
        if (order && order.returnEligible) {
          setBlockedReason(
            `This item is still within its return window (${order.returnDaysLeft} day(s) left). You can resell it only after the return period is over — return it for a refund instead, or wait for the window to close.`,
          );
        }
      } catch {
        setBlockedReason("Could not load the item for resale.");
      } finally {
        setPrefilling(false);
      }
    })();
  }, [resellItemId]);

  const mrp = Number(originalPrice) || 0;
  const ask = Number(askingPrice) || 0;
  const valid = !blockedReason && name.trim() && mrp > 0 && ask > 0 && ask <= mrp;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      // Reselling an owned item → list the existing item; otherwise create a new one.
      const itemId = resellItemId
        ? resellItemId
        : (
            await apiClient.createItem({
              name: name.trim(),
              category,
              brand: brand.trim() || undefined,
              originalPrice: mrp,
            })
          ).id;

      const listing = await apiClient.createListing({
        itemId,
        grade,
        confidence: 0.85,
        flaws: [],
        price: ask,
        pricePct: Number((ask / mrp).toFixed(3)),
        history: [resellItemId ? "Resold by owner (return window closed)" : "Listed by seller on ReLoop"],
      });
      setCreated(listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not list your item");
    } finally {
      setSubmitting(false);
    }
  }

  if (prefilling) return <div className="p-8"><LoadingState label="Loading item…" /></div>;

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">✅</div>
        <h1 className="text-2xl font-bold">Your item is live!</h1>
        <p className="mt-1 text-sm text-storm">{created.title}</p>
        <p className="mt-1 text-2xl font-bold text-priceRed">₹{created.price.toLocaleString("en-IN")}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href={`/marketplace/${created.id}`}>
            <Button size="lg">View your listing →</Button>
          </Link>
          <Link href="/sell">
            <Button size="lg" variant="secondary">List another item</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">{resellItemId ? "Resell on ReLoop" : "Sell on ReLoop"}</h1>
      <p className="text-sm text-storm">
        {resellItemId
          ? "List an item you own (its return window has closed) for second-life resale."
          : "List your own item for second-life resale — including products not already on the platform."}
      </p>

      {blockedReason && (
        <div className="mt-4 rounded border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          {blockedReason}{" "}
          <Link href="/orders" className="font-medium underline">
            Back to Your Orders
          </Link>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4 rounded border border-line bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-semibold">Product name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            placeholder="e.g. Vintage Leather Satchel"
            className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Brand (optional)</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Original price (₹) *</label>
            <input
              type="number"
              min="1"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              disabled={locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-mist/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Your asking price (₹) *</label>
            <input
              type="number"
              min="1"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
        </div>
        {ask > 0 && mrp > 0 && ask > mrp && (
          <p className="text-xs text-danger">Asking price can&apos;t exceed the original price.</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold">Condition</label>
          <div className="flex gap-2">
            {GRADES.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGrade(g)}
                className={`rounded border px-3 py-2 ${grade === g ? "border-ember ring-2 ring-zest" : "border-line"}`}
              >
                <GradeBadge grade={g} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" disabled={!valid || submitting} className="w-full">
          {submitting ? "Listing…" : "List my item for second life"}
        </Button>
      </form>
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<div className="p-8"><LoadingState label="Loading…" /></div>}>
      <SellInner />
    </Suspense>
  );
}
