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
 */

export interface CartLine {
  listingId: string;
  itemId: string;
  title: string;
  price: number;
  category: string;
  originalPrice: number;
  imageUrl?: string | null;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (listingId: string, qty: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nemo-cart-v1";
const MAX_QTY = 10;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
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
    setLines((prev) => {
      const existing = prev.find((l) => l.listingId === line.listingId);
      if (existing) {
        return prev.map((l) =>
          l.listingId === line.listingId
            ? { ...l, qty: Math.min(l.qty + qty, MAX_QTY) }
            : l,
        );
      }
      return [...prev, { ...line, qty: Math.min(qty, MAX_QTY) }];
    });
  }, []);

  const setQty = useCallback((listingId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.listingId !== listingId)
        : prev.map((l) =>
            l.listingId === listingId ? { ...l, qty: Math.min(qty, MAX_QTY) } : l,
          ),
    );
  }, []);

  const remove = useCallback((listingId: string) => {
    setLines((prev) => prev.filter((l) => l.listingId !== listingId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    return { lines, count, subtotal, add, setQty, remove, clear };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>.");
  return ctx;
}
