/**
 * Category → emoji mapping. This is presentation (an icon for a label), not
 * data — the category labels themselves come dynamically from the catalog
 * (`/api/catalog/categories`). Centralised so every surface renders the same
 * glyph and unknown categories fall back gracefully.
 */
const ICONS: Record<string, string> = {
  Footwear: "👟",
  Electronics: "🎧",
  Apparel: "🧥",
  Home: "🍳",
  Books: "📚",
  Toys: "🧸",
  Furniture: "🛋️",
  Kitchenware: "🍽️",
  Beauty: "💄",
  Sports: "🏅",
  Others: "📦",
};

export function categoryIcon(category?: string | null): string {
  if (!category) return "📦";
  return ICONS[category] ?? "📦";
}
