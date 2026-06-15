"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUser } from "@/lib/user-context";

/**
 * Production-style cart: line items with quantity, persisted to localStorage so
 * it survives reloads. The single source of truth for everything cart-related
 * (Navbar badge, /cart page, /checkout).
 *
 * The cart is scoped to the signed-in user: each account has its own cart
 * (storage key `nemo-cart-v2::<userId>`), so switching accounts loads that
 * account's cart and one user can never see or mutate another's. This mirrors
 * the per-user scoping already used for orders/credits/returns via session.ts.
 *
 * Lines belong to one of two ecosystems:
 *  • RESOLD — a one-of-a-kind second-life listing; maxQty is always 1.
 *  • NEW    — a brand-new catalog product; maxQty mirrors live DB stock.
 * Quantity can never exceed `maxQty`, so the cart can't request more than the
 * inventory allows (the server re-checks at checkout as the final guard).
 */

export interface CartLine {
  /** Stable identity: listingId (RESOLD), productId (NEW), returnCaseId (TRANSIT). */
  key: string;
  kind: "NEW" | "RESOLD" | "TRANSIT";
  /** RESOLD / TRANSIT identifiers. */
  listingId?: string;
  itemId?: string;
  /** NEW identifier. */
  productId?: string;
  /** TRANSIT identifier (the return case being bought early). */
  returnCaseId?: string;
  title: string;
  price: number;
  category: string;
  originalPrice: number;
  imageUrl?: string | null;
  /** Available stock (RESOLD => 1). Quantity is clamped to this. */
  maxQty: number;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** Add 1 (or `qty`), clamped to the line's available stock. */
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Current quantity of a line in the cart (0 if absent). */
  qtyOf: (key: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_PREFIX = "nemo-cart-v2";

/** Per-user storage key, so each account keeps its own separate cart. */
function storageKeyFor(userId: string): string {
  return `${STORAGE_PREFIX}::${userId}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const storageKey = storageKeyFor(user.id);

  // `key` records which storage key the current `lines` were loaded/saved under.
  // Tracking it inside state (not a ref) lets the persist effect skip the render
  // immediately after a user switch — when `lines` still holds the previous
  // account's cart — so we never clobber the new account's stored cart.
  const [state, setState] = useState<{ key: string; lines: CartLine[] }>({
    key: "",
    lines: [],
  });
  const lines = state.lines;

  const setLines = useCallback(
    (updater: CartLine[] | ((prev: CartLine[]) => CartLine[])) => {
      setState((prev) => ({
        key: prev.key,
        lines: typeof updater === "function" ? updater(prev.lines) : updater,
      }));
    },
    [],
  );

  // Load whenever the active user (and thus the storage key) changes.
  useEffect(() => {
    let loaded: CartLine[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        // Defensive: only keep well-formed lines (guards against an older shape).
        loaded = parsed.filter(
          (l) => l && typeof l.key === "string" && typeof l.qty === "number",
        );
      }
    } catch {
      /* ignore corrupt storage */
    }
    setState({ key: storageKey, lines: loaded });
  }, [storageKey]);

  // Persist on change — but only once `lines` belong to the active key, so a
  // user switch can't write the previous account's lines into the new key.
  useEffect(() => {
    if (state.key !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state.lines));
    } catch {
      /* ignore quota errors */
    }
  }, [state, storageKey]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    const cap = Math.max(line.maxQty, 0);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === line.key);
      if (existing) {
        // Refresh stock/price from the latest data and bump quantity within stock.
        return prev.map((l) =>
          l.key === line.key
            ? { ...l, ...line, qty: Math.min(l.qty + qty, cap) }
            : l,
        );
      }
      if (cap <= 0) return prev; // out of stock — nothing to add
      return [...prev, { ...line, qty: Math.min(qty, cap) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, Math.max(l.maxQty, 0)) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const qtyOf = (key: string) => lines.find((l) => l.key === key)?.qty ?? 0;
    return { lines, count, subtotal, add, setQty, remove, clear, qtyOf };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>.");
  return ctx;
}
