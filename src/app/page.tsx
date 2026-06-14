"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO } from "@/types/dto";
import { ProductImage } from "@/components/ProductImage";

const CATEGORIES = [
  { label: "Footwear", icon: "👟" },
  { label: "Electronics", icon: "🎧" },
  { label: "Apparel", icon: "🧥" },
  { label: "Home", icon: "🍳" },
];

export default function HomePage() {
  const [listings, setListings] = useState<ListingDTO[]>([]);
  useEffect(() => {
    apiClient.getListings().then(setListings).catch(() => setListings([]));
  }, []);

  return (
    <div className="relative">
      {/* Hero banner */}
      <div className="h-64 w-full bg-gradient-to-b from-squid via-slate to-mist sm:h-72">
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-zest">
            Second-Life Commerce
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Certified pre-owned, intelligently routed from every return.
          </h1>
          <p className="mt-2 max-w-xl text-mist/80">
            AI-graded in seconds · matched to nearby buyers · backed by a Product Health Card.
          </p>
        </div>
      </div>

      {/* Cards pulled up over the banner (Amazon style) */}
      <div className="mx-auto -mt-28 max-w-6xl px-4 pb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Category card */}
          <div className="rounded bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-ink">Shop by category</h2>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.label}
                  href={`/marketplace?q=${encodeURIComponent(c.label)}`}
                  className="flex flex-col items-center gap-1 rounded bg-mist/60 p-3 text-center hover:bg-mist"
                >
                  <span className="text-3xl">{c.icon}</span>
                  <span className="text-xs font-medium text-ink">{c.label}</span>
                </Link>
              ))}
            </div>
            <Link href="/marketplace" className="mt-3 block text-sm font-medium text-link hover:text-linkHover hover:underline">
              Shop all second-life deals
            </Link>
          </div>

          {/* Start a return card */}
          <div className="flex flex-col rounded bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-ink">Start a return</h2>
            <div className="flex flex-1 items-center justify-center rounded bg-mist/60 py-6 text-6xl">
              📦
            </div>
            <p className="mt-3 text-xs text-storm">
              Return an eligible order — we&apos;ll grade it and find its second life.
            </p>
            <Link href="/return" className="mt-2 text-sm font-medium text-link hover:text-linkHover hover:underline">
              Start a return
            </Link>
          </div>

          {/* Deals card */}
          <div className="rounded bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-ink">Certified pre-owned deals</h2>
            <div className="grid grid-cols-2 gap-3">
              {(listings.slice(0, 4).length ? listings.slice(0, 4) : Array.from({ length: 4 })).map(
                (l, i) =>
                  l ? (
                    <Link
                      key={(l as ListingDTO).id}
                      href={`/marketplace/${(l as ListingDTO).id}`}
                      className="overflow-hidden rounded border border-line text-center hover:shadow-card"
                    >
                      <ProductImage
                        src={(l as ListingDTO).item?.imageUrl}
                        category={(l as ListingDTO).item?.category}
                        alt={(l as ListingDTO).title}
                        className="h-20 w-full"
                      />
                      <span className="block py-1 text-xs font-bold text-priceRed">
                        ₹{(l as ListingDTO).price.toLocaleString("en-IN")}
                      </span>
                    </Link>
                  ) : (
                    <div key={i} className="h-16 animate-pulse rounded bg-mist/60" />
                  ),
              )}
            </div>
            <Link href="/marketplace" className="mt-3 block text-sm font-medium text-link hover:text-linkHover hover:underline">
              See all deals
            </Link>
          </div>

          {/* Impact card */}
          <div className="flex flex-col rounded bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-ink">Your green impact</h2>
            <div className="flex flex-1 items-center justify-center rounded bg-success/10 py-6 text-6xl">
              🌱
            </div>
            <p className="mt-3 text-xs text-storm">
              Earn ReLoop Credits and redeem them for vouchers, perks & tree-planting.
            </p>
            <Link href="/impact" className="mt-2 text-sm font-medium text-link hover:text-linkHover hover:underline">
              View impact &amp; redeem
            </Link>
          </div>
        </div>

        {/* Deals row */}
        {listings.length > 0 && (
          <div className="mt-4 rounded bg-white p-4 shadow-card">
            <h2 className="mb-3 text-lg font-bold text-ink">More second-life finds</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  href={`/marketplace/${l.id}`}
                  className="w-40 shrink-0 rounded border border-line p-3 hover:shadow-cardHover"
                >
                  <ProductImage
                    src={l.item?.imageUrl}
                    category={l.item?.category}
                    alt={l.title}
                    className="h-24 w-full rounded"
                  />
                  <div className="mt-2 line-clamp-2 text-xs text-ink">{l.title}</div>
                  <div className="mt-1 font-bold text-priceRed">
                    ₹{l.price.toLocaleString("en-IN")}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
