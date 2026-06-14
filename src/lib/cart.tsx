"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Production-style cart: line items with quantity, persisted to localStorage so
 * it survives reloads. The single source of truth for everything cart-related
 * (Navbar badge, /cart page, /checkout).
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
const STORAGE_KEY = "nemo-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        // Defensive: only keep well-formed lines (guards against an older shape).
        setLines(parsed.filter((l) => l && typeof l.key === "string" && typeof l.qty === "number"));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration, so we don't clobber stored data).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota errors */
    }
  }, [lines, hydrated]);

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
