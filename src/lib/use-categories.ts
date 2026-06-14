"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { CANONICAL_CATEGORIES } from "@/config/constants";
import type { CategoryCountDTO } from "@/types/dto";

/**
 * Merge the live catalog taxonomy with the canonical category list (which always
 * includes "Others"), de-duplicated. Catalog categories come first (sorted by
 * activity); canonical-only categories follow so they're always selectable even
 * when no live product uses them yet.
 */
function mergeWithCanonical(live: CategoryCountDTO[]): CategoryCountDTO[] {
  const seen = new Set(live.map((c) => c.category.toLowerCase()));
  const extras = CANONICAL_CATEGORIES.filter((c) => !seen.has(c.toLowerCase())).map(
    (category) => ({ category, total: 0, activeListings: 0 }),
  );
  return [...live, ...extras];
}

/**
 * Loads the live category taxonomy (derived from the catalog) once per mount,
 * merged with the canonical list. Shared by the header search, the home grid,
 * and the sell form so categories are never hardcoded and stay consistent.
 */
export function useCategories(): { categories: CategoryCountDTO[]; loading: boolean } {
  const [categories, setCategories] = useState<CategoryCountDTO[]>(mergeWithCanonical([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .getCategories()
      .then((c) => active && setCategories(mergeWithCanonical(c)))
      .catch(() => active && setCategories(mergeWithCanonical([])))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
