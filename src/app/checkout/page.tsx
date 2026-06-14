"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useUser } from "@/lib/user-context";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CheckoutResultDTO, CartAssessmentDTO } from "@/types/dto";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PurchaseConfidenceMeter } from "@/components/intelligence/PurchaseConfidenceMeter";

interface Address {
  name: string;
  line1: string;
  city: string;
  pin: string;
  state: string;
}
const EMPTY_ADDRESS: Address = { name: "", line1: "", city: "", pin: "", state: "" };
const ADDRESS_KEY = "nemo-address-v1";
const isCompleteAddress = (a: Address) =>
  Boolean(a.name.trim() && a.line1.trim() && a.city.trim() && a.pin.trim() && a.state.trim());

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI (Google Pay / PhonePe)" },
  { id: "card", label: "Credit / Debit Card" },
  { id: "cod", label: "Cash on Delivery" },
  { id: "credits", label: "Pay with Amazon Nemo Credits" },
];

export default function CheckoutPage() {
  const { lines, subtotal, count, clear } = useCart();
  const { user } = useUser();
  const [method, setMethod] = useState("upi");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CheckoutResultDTO | null>(null);

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [editingAddr, setEditingAddr] = useState(false);
  const [draft, setDraft] = useState<Address>(EMPTY_ADDRESS);
  const [assessment, setAssessment] = useState<CartAssessmentDTO | null>(null);

  const lineKey = lines.map((l) => l.listingId).join(",");
  useEffect(() => {
    if (lines.length === 0) return;
    apiClient
      .assessCart(
        lines.map((l) => ({
          listingId: l.listingId,
          itemId: l.itemId,
          category: l.category,
          originalPrice: l.originalPrice,
          title: l.title,
        })),
      )
      .then(setAssessment)
      .catch(() => setAssessment(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDRESS_KEY);
      if (raw) {
        const a = JSON.parse(raw) as Address;
        setAddress(a);
        setDraft(a);
        return;
      }
    } catch {
      /* ignore */
    }
    // No saved address yet — prefill the name from the signed-in user and
    // prompt the user to complete it (nothing is assumed/hardcoded).
    const seeded = { ...EMPTY_ADDRESS, name: user.name };
    setAddress(seeded);
    setDraft(seeded);
    setEditingAddr(true);
  }, [user.name]);

  function saveAddress() {
    setAddress(draft);
    setEditingAddr(false);
    try {
      localStorage.setItem(ADDRESS_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }

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
            <div className="flex items-start justify-between">
              <h2 className="font-bold">Delivery address</h2>
              {!editingAddr && (
                <button
                  onClick={() => {
                    setDraft(address);
                    setEditingAddr(true);
                  }}
                  className="text-sm font-medium text-link hover:text-linkHover hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {!editingAddr ? (
              <p className="mt-1 text-sm text-storm">
                <span className="font-medium text-ink">{address.name}</span>
                <br />
                {address.line1}, {address.city} {address.pin}, {address.state}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {(
                  [
                    ["name", "Full name"],
                    ["line1", "Address"],
                    ["city", "City"],
                    ["pin", "PIN code"],
                    ["state", "State"],
                  ] as Array<[keyof Address, string]>
                ).map(([key, label]) => (
                  <input
                    key={key}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    placeholder={label}
                    aria-label={label}
                    className="w-full rounded border border-line px-3 py-2 text-sm"
                  />
                ))}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveAddress}
                    disabled={!draft.name.trim() || !draft.line1.trim() || !draft.pin.trim()}
                  >
                    Use this address
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditingAddr(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
        {assessment && (
          <div className="mb-4">
            <PurchaseConfidenceMeter assessment={assessment} />
          </div>
        )}
        <Button
          size="lg"
          className="w-full"
          disabled={placing || !isCompleteAddress(address)}
          onClick={placeOrder}
        >
          {placing ? "Placing order…" : "Place your order"}
        </Button>
        {!isCompleteAddress(address) && (
          <p className="mt-2 text-xs text-storm">Add a delivery address to place your order.</p>
        )}
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
