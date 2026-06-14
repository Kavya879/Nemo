"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Amazon-style global header: logo, deliver-to, full search bar with category
 * dropdown + yellow button, account / orders / cart on the right, plus the
 * secondary dark department bar.
 */
const DEPARTMENTS = [
  { href: "/marketplace", label: "Second-Life Deals" },
  { href: "/sell", label: "Sell on ReLoop" },
  { href: "/return", label: "Returns" },
  { href: "/impact", label: "Your Impact" },
  { href: "/coupons", label: "Coupons" },
  { href: "/orders", label: "Your Orders" },
];

export function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/marketplace${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <header className="w-full">
      {/* Top bar */}
      <div className="flex items-center gap-2 bg-squid px-3 py-2 text-white">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1 rounded border border-transparent px-2 py-1 hover:border-white"
        >
          <span className="text-2xl">♻️</span>
          <span className="text-xl font-bold tracking-tight">
            Re<span className="text-zest">Loop</span>
          </span>
        </Link>

        {/* Deliver to */}
        <div className="hidden items-end gap-1 rounded border border-transparent px-2 py-1 hover:border-white lg:flex">
          <span className="text-lg">📍</span>
          <div className="leading-tight">
            <div className="text-xs text-mist/70">Deliver to</div>
            <div className="text-sm font-bold">Bengaluru 560001</div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="flex h-10 flex-1 overflow-hidden rounded-md">
          <select
            aria-label="Search category"
            className="hidden bg-mist px-2 text-xs text-ink sm:block"
            defaultValue="all"
          >
            <option value="all">All</option>
            <option>Footwear</option>
            <option>Electronics</option>
            <option>Apparel</option>
            <option>Home</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search certified pre-owned…"
            className="min-w-0 flex-1 px-3 text-sm text-ink outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex items-center justify-center bg-zest px-4 text-ink hover:bg-zestDark"
          >
            🔍
          </button>
        </form>

        {/* Account & lists */}
        <Link
          href="/account"
          className="hidden rounded border border-transparent px-2 py-1 leading-tight hover:border-white md:block"
        >
          <div className="text-xs">Hello, Demo</div>
          <div className="text-sm font-bold">Account &amp; Lists</div>
        </Link>

        {/* Orders */}
        <Link
          href="/orders"
          className="hidden rounded border border-transparent px-2 py-1 leading-tight hover:border-white sm:block"
        >
          <div className="text-xs">Returns</div>
          <div className="text-sm font-bold">&amp; Orders</div>
        </Link>

        {/* Cart */}
        <Link
          href="/marketplace"
          className="flex items-end gap-1 rounded border border-transparent px-2 py-1 hover:border-white"
        >
          <span className="text-2xl">🛒</span>
          <span className="hidden text-sm font-bold sm:inline">Cart</span>
        </Link>
      </div>

      {/* Department bar */}
      <div className="flex items-center gap-1 bg-slate px-3 py-1 text-sm text-white">
        <Link
          href="/marketplace"
          className="flex items-center gap-1 rounded border border-transparent px-2 py-1 font-bold hover:border-white"
        >
          ☰ All
        </Link>
        {DEPARTMENTS.map((d) => (
          <Link
            key={d.label}
            href={d.href}
            className="rounded border border-transparent px-2 py-1 hover:border-white"
          >
            {d.label}
          </Link>
        ))}
        <span className="ml-auto hidden truncate pr-2 text-mist/80 lg:inline">
          Millions of products. One intelligent bridge.
        </span>
      </div>
    </header>
  );
}
