import { describe, expect, it } from "vitest";
import { stockStatus, stockLabel, LOW_STOCK_THRESHOLD } from "@/services/products/product.service";

describe("brand-new product stock status", () => {
  it("is OUT_OF_STOCK at zero (or negative) stock", () => {
    expect(stockStatus(0)).toBe("OUT_OF_STOCK");
    expect(stockLabel(0)).toBe("Out of Stock");
  });

  it("is LOW_STOCK at/below the threshold and shows the remaining count", () => {
    expect(stockStatus(LOW_STOCK_THRESHOLD)).toBe("LOW_STOCK");
    expect(stockStatus(3)).toBe("LOW_STOCK");
    expect(stockLabel(3)).toBe("Only 3 left");
  });

  it("is IN_STOCK above the threshold", () => {
    expect(stockStatus(LOW_STOCK_THRESHOLD + 1)).toBe("IN_STOCK");
    expect(stockStatus(50)).toBe("IN_STOCK");
    expect(stockLabel(50)).toBe("In Stock");
  });
});
