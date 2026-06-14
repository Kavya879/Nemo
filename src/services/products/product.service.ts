import type { Product } from "@prisma/client";
import { productRepository } from "@/repositories/product.repository";

/**
 * Product service — read model + availability logic for brand-new inventory.
 * Stock status is derived ONLY from the real `stock` value (single source of
 * truth); nothing is hardcoded per-product.
 */

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/** Threshold (units at/below which we surface a "Low stock" nudge). */
export const LOW_STOCK_THRESHOLD = 5;

export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
}

/** Human label for a brand-new product's availability, from real stock. */
export function stockLabel(stock: number): string {
  if (stock <= 0) return "Out of Stock";
  if (stock <= LOW_STOCK_THRESHOLD) return `Only ${stock} left`;
  return "In Stock";
}

export interface ProductView extends Product {
  stockStatus: StockStatus;
  stockLabel: string;
}

function withAvailability(p: Product): ProductView {
  return { ...p, stockStatus: stockStatus(p.stock), stockLabel: stockLabel(p.stock) };
}

export const productService = {
  async listActive(): Promise<ProductView[]> {
    const products = await productRepository.listActive();
    return products.map(withAvailability);
  },

  async getById(id: string): Promise<ProductView | null> {
    const p = await productRepository.findById(id);
    return p ? withAvailability(p) : null;
  },
};
