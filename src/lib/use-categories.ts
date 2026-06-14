"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { CategoryCountDTO } from "@/types/dto";

/**
 * Loads the live category taxonomy (derived from the catalog) once per mount.
 * Shared by the header search, the home grid, and the sell form so categories
 * are never hardcoded and stay consistent across the app.
 */
export function useCategories(): { categories: CategoryCountDTO[]; loading: boolean } {
  const [categories, setCategories] = useState<CategoryCountDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiClient
      .getCategories()
      .then((c) => active && setCategories(c))
      .catch(() => active && setCategories([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading };
}
