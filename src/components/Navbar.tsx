"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useUser } from "@/lib/user-context";
import { isAdmin } from "@/lib/session";
import { useCategories } from "@/lib/use-categories";
import { Logo } from "@/components/Logo";
import { DeliverTo } from "@/components/DeliverTo";

/**
 * Amazon-style global header: logo, deliver-to, full search bar with category
 * dropdown + yellow button, account / orders / cart on the right, plus the
 * secondary dark department bar.
 */
const DEPARTMENTS = [
  { href: "/products", label: "Shop New" },
  { href: "/marketplace", label: "Second-Life Deals" },
  { href: "/sell", label: "Sell on Amazon Nemo" },
  { href: "/return", label: "Returns" },
  { href: "/impact", label: "Your Impact" },
  { href: "/coupons", label: "Coupons" },
  { href: "/orders", label: "Your Orders" },
  { href: "/admin", label: "⚡ Admin Console" },
];

export function Navbar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const { count } = useCart();
  const { user } = useUser();
  const { categories } = useCategories();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = cat !== "all" ? cat : q;
    // The header search is the main Brand New store search; second-life is its
    // own destination ("Second-Life Deals" in the department bar).
    router.push(`/products${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  }

  // Admins get a focused, console-only header — no storefront search, no
  // departments, no cart. Just the console and a way to switch accounts.
  if (isAdmin(user)) {
    return (
      <header className="flex w-full items-center gap-2 bg-squid px-3 py-2 text-white">
        <Link
          href="/admin"
          className="flex shrink-0 items-center gap-1 rounded border border-transparent px-2 py-1 hover:border-white"
        >
          <Logo tone="dark" size="md" />
        </Link>
        <span className="ml-1 rounded bg-ember/90 px-2 py-0.5 text-xs font-bold text-squid">
          ⚡ Operations Console
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm sm:block">
            Signed in as <span className="font-bold">{user.name}</span>
          </span>
          <Link
            href="/login"
            className="rounded border border-transparent px-2 py-1 text-sm font-bold leading-tight hover:border-white"
            title="Switch account"
          >
            Switch account
          </Link>
        </div>
      </header>
    );
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
          <Logo tone="dark" size="md" />
        </Link>

        {/* Deliver to */}
        <DeliverTo />

        {/* Search */}
        <form onSubmit={submitSearch} className="flex h-10 flex-1 overflow-hidden rounded-md">
          <select
            aria-label="Search category"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="hidden bg-mist px-2 text-xs text-ink sm:block"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Amazon Nemo…"
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
          <div className="text-xs">Hello, {user.name}</div>
          <div className="text-sm font-bold">Account &amp; Lists</div>
        </Link>

        {/* Switch / sign in */}
        <Link
          href="/login"
          className="hidden rounded border border-transparent px-2 py-1 leading-tight hover:border-white lg:block"
          title="Switch account"
        >
          <div className="text-xs">Switch</div>
          <div className="text-sm font-bold">Account</div>
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
          href="/cart"
          className="relative flex items-end gap-1 rounded border border-transparent px-2 py-1 hover:border-white"
        >
          <span className="relative text-2xl">
            🛒
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-xs font-bold text-squid">
                {count}
              </span>
            )}
          </span>
          <span className="hidden text-sm font-bold sm:inline">Cart</span>
        </Link>
      </div>

      {/* Department bar */}
      <div className="flex items-center gap-1 bg-slate px-3 py-1 text-sm text-white">
        <Link
          href="/products"
          className="flex items-center gap-1 rounded border border-transparent px-2 py-1 font-bold hover:border-white"
        >
          ☰ All
        </Link>
        {DEPARTMENTS.filter((d) => d.href !== "/admin" || isAdmin(user)).map((d) => (
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
