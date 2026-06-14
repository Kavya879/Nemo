"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ProductImage";

export default function CartPage() {
  const router = useRouter();
  const { lines, subtotal, count, setQty, remove, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded bg-white p-10 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <h1 className="text-2xl font-bold">Your ReLoop Cart is empty</h1>
          <p className="mt-1 text-sm text-storm">Certified pre-owned deals are waiting.</p>
          <Link href="/marketplace" className="mt-4 inline-block">
            <Button size="lg">Shop the marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 lg:grid-cols-[1fr_300px]">
      {/* Line items */}
      <div className="rounded bg-white p-5">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <button onClick={clear} className="text-sm text-link hover:text-linkHover hover:underline">
            Clear cart
          </button>
        </div>

        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.listingId} className="flex gap-4 py-4">
              <Link href={`/marketplace/${l.listingId}`} className="shrink-0">
                <ProductImage
                  src={l.imageUrl}
                  category={l.category}
                  alt={l.title}
                  className="h-24 w-24 rounded"
                />
              </Link>
              <div className="flex-1">
                <Link href={`/marketplace/${l.listingId}`} className="font-medium text-ink hover:text-linkHover">
                  {l.title}
                </Link>
                <p className="text-xs text-success">In stock · Certified Pre-Owned</p>
                <p className="text-xs text-storm">{l.category}</p>

                <div className="mt-2 flex items-center gap-4">
                  {/* Quantity stepper */}
                  <div className="flex items-center overflow-hidden rounded-full border border-line">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => setQty(l.listingId, l.qty - 1)}
                      className="h-8 w-8 bg-mist/60 text-lg font-bold hover:bg-mist"
                    >
                      {l.qty <= 1 ? "🗑" : "−"}
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => setQty(l.listingId, l.qty + 1)}
                      className="h-8 w-8 bg-mist/60 text-lg font-bold hover:bg-mist"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(l.listingId)}
                    className="text-sm text-link hover:text-linkHover hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-ink">
                  ₹{(l.price * l.qty).toLocaleString("en-IN")}
                </div>
                {l.qty > 1 && (
                  <div className="text-xs text-storm">₹{l.price.toLocaleString("en-IN")} each</div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-line pt-3 text-right text-lg">
          Subtotal ({count} item{count === 1 ? "" : "s"}):{" "}
          <span className="font-bold">₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Summary / checkout */}
      <aside className="h-fit rounded bg-white p-5">
        <div className="text-lg">
          Subtotal ({count} item{count === 1 ? "" : "s"}):
          <div className="text-2xl font-bold">₹{subtotal.toLocaleString("en-IN")}</div>
        </div>
        <p className="mt-1 text-xs text-success">FREE delivery on all ReLoop second-life orders</p>
        <Button size="lg" className="mt-4 w-full" onClick={() => router.push("/checkout")}>
          Proceed to payment
        </Button>
        <p className="mt-2 text-center text-xs text-storm">Earn ReLoop Credits 🌱 after purchase</p>
      </aside>
    </div>
  );
}
