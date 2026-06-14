"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { categoryIcon } from "@/lib/category-icon";

/** Product image with a graceful emoji fallback when the URL is missing/broken. */
export function ProductImage({
  src,
  category,
  alt,
  className,
}: {
  src?: string | null;
  category?: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-mist/50", className)}>
        <span className="text-4xl">{categoryIcon(category)}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? "product"}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
