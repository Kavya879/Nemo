import { ProductImage } from "@/components/ProductImage";

export interface ReturnPhoto {
  data: string;
  mimeType: string;
  role: string;
}

/** Resolves a stored photo (raw base64 or a data/http URL) to an <img> src. */
function toSrc(p: ReturnPhoto): string {
  if (p.data.startsWith("http") || p.data.startsWith("data:")) return p.data;
  return `data:${p.mimeType};base64,${p.data}`;
}

/** Thumbnail grid of the photos the customer submitted at return time. */
export function ReturnPhotoGrid({ photos }: { photos: ReturnPhoto[] }) {
  if (!photos?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, i) => (
        <div key={i} className="w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={toSrc(p)}
            alt={p.role}
            className="h-20 w-20 rounded border border-line object-cover"
          />
          <div className="mt-0.5 text-center text-[10px] capitalize text-storm">{p.role}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Side-by-side comparison for the pickup delivery partner: the original product
 * (how it was delivered) vs the customer's return photos — so they can confirm
 * the item matches and isn't a different/defective piece.
 */
export function OriginalVsReturn({
  originalImageUrl,
  category,
  photos,
}: {
  originalImageUrl?: string | null;
  category?: string;
  photos: ReturnPhoto[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-semibold text-storm">Original (as delivered)</p>
        <ProductImage
          src={originalImageUrl}
          category={category}
          alt="Original product"
          className="h-28 w-28 rounded border border-line"
        />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-storm">Customer&apos;s return photos</p>
        {photos.length ? (
          <ReturnPhotoGrid photos={photos} />
        ) : (
          <p className="text-xs text-storm">No photos were submitted.</p>
        )}
      </div>
    </div>
  );
}
