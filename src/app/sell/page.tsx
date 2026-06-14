"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { Grade } from "@/types";
import type { ListingDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { GradeBadge } from "@/components/GradeBadge";

const CATEGORIES = ["Footwear", "Electronics", "Apparel", "Home", "Books", "Other"];
const GRADES: Grade[] = ["A", "B", "C", "D"];

export default function SellPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [brand, setBrand] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [grade, setGrade] = useState<Grade>("B");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ListingDTO | null>(null);

  const mrp = Number(originalPrice) || 0;
  const ask = Number(askingPrice) || 0;
  const valid = name.trim() && mrp > 0 && ask > 0 && ask <= mrp;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      // 1) Create the seller's item (may be a product not already on the platform).
      const item = await apiClient.createItem({
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        originalPrice: mrp,
      });
      // 2) List it for second-life resale.
      const listing = await apiClient.createListing({
        itemId: item.id,
        grade,
        confidence: 0.85,
        flaws: [],
        price: ask,
        pricePct: Number((ask / mrp).toFixed(3)),
        history: ["Listed by seller on ReLoop"],
      });
      setCreated(listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not list your item");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">
          ✅
        </div>
        <h1 className="text-2xl font-bold">Your item is live!</h1>
        <p className="mt-1 text-sm text-storm">{created.title}</p>
        <p className="mt-1 text-2xl font-bold text-priceRed">
          ₹{created.price.toLocaleString("en-IN")}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href={`/marketplace/${created.id}`}>
            <Button size="lg">View your listing →</Button>
          </Link>
          <Button size="lg" variant="secondary" onClick={() => setCreated(null)}>
            List another item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">Sell on ReLoop</h1>
      <p className="text-sm text-storm">
        List your own item for second-life resale — including products not already on the
        platform. It appears in the marketplace with a Product Health Card.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4 rounded border border-line bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-semibold">Product name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vintage Leather Satchel"
            className="w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-line px-3 py-2 text-sm"
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
              placeholder="e.g. Acme"
              className="w-full rounded border border-line px-3 py-2 text-sm"
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
              className="w-full rounded border border-line px-3 py-2 text-sm"
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
          <label className="mb-1 block text-sm font-semibold">Condition (self-declared)</label>
          <div className="flex gap-2">
            {GRADES.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setGrade(g)}
                className={`rounded border px-3 py-2 ${
                  grade === g ? "border-ember ring-2 ring-zest" : "border-line"
                }`}
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
