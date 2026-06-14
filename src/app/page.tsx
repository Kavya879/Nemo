"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import type { ListingDTO, ProductDTO } from "@/types/dto";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductCard";
import { ListingCard } from "@/components/ListingCard";
import { useCategories } from "@/lib/use-categories";
import { categoryIcon } from "@/lib/category-icon";

export default function HomePage() {
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const { categories } = useCategories();
  useEffect(() => {
    apiClient.getListings().then(setListings).catch(() => setListings([]));
    apiClient.getProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const deals = listings.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      {/* Light hero banner (no dark band) */}
      <section className="overflow-hidden rounded-card bg-gradient-to-r from-zest/40 via-cloud to-cloud">
        <div className="flex flex-col gap-3 px-6 py-8 sm:px-10 sm:py-10">
          <span className="text-xs font-bold uppercase tracking-widest text-ember">
            Second-Life Commerce
          </span>
          <h1 className="max-w-2xl text-2xl font-bold text-ink sm:text-4xl">
            Certified pre-owned, intelligently routed from every return.
          </h1>
          <p className="max-w-xl text-sm text-storm">
            AI-graded in seconds · verified against the original product · matched to nearby buyers ·
            backed by a Product Health Card.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-full bg-ember px-5 py-2 text-sm font-bold text-squid hover:bg-zestDark"
            >
              Shop Brand New
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-line bg-white px-5 py-2 text-sm font-bold text-ink hover:bg-mist"
            >
              Shop second-life deals
            </Link>
          </div>
        </div>
      </section>

      {/* Card grid — uniform-height white cards on the light page background */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Shop by category */}
        <article className="flex h-full flex-col rounded-card border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-lg font-bold text-ink">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded bg-mist/60" />
                ))
              : categories.slice(0, 4).map((c) => (
                  <Link
                    key={c.category}
                    href={`/products?q=${encodeURIComponent(c.category)}`}
                    className="flex flex-col items-center justify-center gap-1 rounded bg-mist/50 p-3 text-center hover:bg-mist"
                  >
                    <span className="text-3xl">{categoryIcon(c.category)}</span>
                    <span className="text-xs font-medium text-ink">{c.category}</span>
                  </Link>
                ))}
          </div>
          <Link
            href="/products"
            className="mt-auto pt-3 text-sm font-medium text-link hover:text-linkHover hover:underline"
          >
            Shop all products
          </Link>
        </article>

        {/* Certified pre-owned deals */}
        <article className="flex h-full flex-col rounded-card border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-lg font-bold text-ink">Today&apos;s certified deals</h2>
          <div className="grid grid-cols-2 gap-3">
            {deals.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded bg-mist/60" />
                ))
              : deals.map((l) => (
                  <Link
                    key={l.id}
                    href={`/marketplace/${l.id}`}
                    className="overflow-hidden rounded border border-line text-center hover:shadow-card"
                  >
                    <ProductImage
                      src={l.item?.imageUrl}
                      category={l.item?.category}
                      alt={l.title}
                      className="h-20 w-full"
                    />
                    <span className="block py-1 text-xs font-bold text-priceRed">
                      ₹{l.price.toLocaleString("en-IN")}
                    </span>
                  </Link>
                ))}
          </div>
          <Link
            href="/marketplace"
            className="mt-auto pt-3 text-sm font-medium text-link hover:text-linkHover hover:underline"
          >
            See all deals
          </Link>
        </article>

        {/* Your green impact */}
        <article className="flex h-full flex-col rounded-card border border-line bg-white p-4 shadow-card">
          <h2 className="mb-3 text-lg font-bold text-ink">Your green impact</h2>
          <div className="flex flex-1 items-center justify-center rounded bg-success/10 py-8 text-6xl">
            🌱
          </div>
          <p className="mt-3 text-xs text-storm">
            Earn Amazon Nemo Credits and redeem them for vouchers, perks &amp; tree-planting.
          </p>
          <Link
            href="/impact"
            className="mt-auto pt-2 text-sm font-medium text-link hover:text-linkHover hover:underline"
          >
            View impact &amp; redeem
          </Link>
        </article>
      </section>

      {/* Section 1 — Explore Brand New Products (standard inventory) */}
      {products.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Explore Brand New Products</h2>
              <p className="text-sm text-storm">
                Standard Amazon-style inventory · multiple quantities · ships fast.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 text-sm font-medium text-link hover:text-linkHover hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Section 2 — Explore Resold Products (AI-verified second life) */}
      {listings.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Explore Resold Products</h2>
              <p className="text-sm text-storm">
                AI-verified second-life finds · one-of-a-kind · a greener choice.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="shrink-0 text-sm font-medium text-link hover:text-linkHover hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
