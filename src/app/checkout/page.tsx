"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CheckoutResultDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI (Google Pay / PhonePe)" },
  { id: "card", label: "Credit / Debit Card" },
  { id: "cod", label: "Cash on Delivery" },
  { id: "credits", label: "Pay with ReLoop Credits" },
];

export default function CheckoutPage() {
  const { lines, subtotal, count, clear } = useCart();
  const [method, setMethod] = useState("upi");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CheckoutResultDTO | null>(null);

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    try {
      const result = await apiClient.checkout(
        lines.map((l) => ({
          listingId: l.listingId,
          itemId: l.itemId,
          category: l.category,
          originalPrice: l.originalPrice,
          qty: l.qty,
        })),
      );
      setDone(result);
      clear();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Payment could not be completed");
    } finally {
      setPlacing(false);
    }
  }

  // Order confirmation
  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-3xl">
          ✅
        </div>
        <h1 className="text-2xl font-bold">Order placed!</h1>
        <p className="mt-1 text-sm text-storm">
          Order <span className="font-mono font-semibold">{done.orderRef}</span> ·{" "}
          {done.itemCount} item{done.itemCount === 1 ? "" : "s"}
        </p>
        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3 text-sm">
          <div className="rounded bg-cloud p-3">
            <div className="text-xl font-bold text-zest">+{done.creditsEarned}</div>
            <div className="text-storm">Credits earned</div>
          </div>
          <div className="rounded bg-cloud p-3">
            <div className="text-xl font-bold text-success">{done.co2SavedKg}kg</div>
            <div className="text-storm">CO₂ avoided</div>
          </div>
          <div className="rounded bg-cloud p-3">
            <div className="text-xl font-bold text-success">₹{done.costSaved.toLocaleString("en-IN")}</div>
            <div className="text-storm">Cost saved</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-storm">
          Credits balance: {done.totals.availableBalance}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/marketplace">
            <Button size="lg">Continue shopping</Button>
          </Link>
          <Link href="/impact">
            <Button size="lg" variant="secondary">
              View impact &amp; redeem
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-storm">Your cart is empty.</p>
        <Link href="/marketplace" className="mt-3 inline-block">
          <Button>Shop the marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        {/* Delivery address */}
        <Card>
          <CardBody>
            <h2 className="font-bold">Delivering to Demo User</h2>
            <p className="text-sm text-storm">
              221B, MG Road, Bengaluru 560001, Karnataka
            </p>
          </CardBody>
        </Card>

        {/* Payment method */}
        <Card>
          <CardBody>
            <h2 className="mb-2 font-bold">Payment method</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay"
                    checked={method === p.id}
                    onChange={() => setMethod(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Review items */}
        <Card>
          <CardBody>
            <h2 className="mb-2 font-bold">Review items</h2>
            <ul className="divide-y divide-line text-sm">
              {lines.map((l) => (
                <li key={l.listingId} className="flex justify-between py-2">
                  <span>
                    {l.title} <span className="text-storm">× {l.qty}</span>
                  </span>
                  <span className="font-medium">₹{(l.price * l.qty).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Order summary */}
      <aside className="h-fit rounded bg-white p-5">
        <Button size="lg" className="w-full" disabled={placing} onClick={placeOrder}>
          {placing ? "Placing order…" : "Place your order"}
        </Button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-storm">Items ({count}):</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-storm">Delivery:</span>
            <span className="text-success">FREE</span>
          </div>
          <div className="flex justify-between border-t border-line pt-1 text-lg font-bold text-priceRed">
            <span>Order total:</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-storm">Pay via {PAYMENT_METHODS.find((p) => p.id === method)?.label}.</p>
      </aside>
    </div>
  );
}
