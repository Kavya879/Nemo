"use client";

import { useRef, useState } from "react";

export type UploadedPhoto = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  preview: string;
  name: string;
};

export const MAX_PHOTOS = 4;
export const MAX_BYTES = 1024 * 1024; // 1 MB

function readImage(file: File): Promise<UploadedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1] ?? "";
      const mime =
        file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
      resolve({ base64, mimeType: mime, preview: result, name: file.name });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

/**
 * Reusable photo uploader: up to MAX_PHOTOS images, each ≤ 1 MB, with a
 * correctly-aligned discard (×) button on every thumbnail. Used by both the
 * return flow and the resell flow.
 */
export function PhotoUploader({
  photos,
  onChange,
  max = MAX_PHOTOS,
}: {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  max?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const incoming = Array.from(files);
    const room = max - photos.length;
    if (incoming.length > room) {
      setError(`You can upload at most ${max} photos.`);
    }
    const accepted: UploadedPhoto[] = [];
    const rejected: string[] = [];
    for (const file of incoming.slice(0, Math.max(room, 0))) {
      if (file.size > MAX_BYTES) {
        rejected.push(file.name);
        continue;
      }
      accepted.push(await readImage(file));
    }
    if (rejected.length) {
      setError(`${rejected.join(", ")} exceed${rejected.length === 1 ? "s" : ""} the 1 MB limit and ${rejected.length === 1 ? "was" : "were"} skipped.`);
    }
    if (accepted.length) onChange([...photos, ...accepted]);
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking same file
  }

  function remove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
    setError(null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative h-24 w-24 overflow-hidden rounded border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt={p.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Discard ${p.name}`}
              title="Discard photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-squid/85 text-sm font-bold leading-none text-white hover:bg-danger"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center rounded border-2 border-dashed border-line text-storm hover:border-link hover:text-link"
          >
            <span className="text-2xl leading-none">＋</span>
            <span className="mt-1 text-xs">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => onPick(e.target.files)}
        className="hidden"
      />

      <p className="mt-1 text-xs text-storm">
        Up to {max} photos · max 1 MB each · {photos.length}/{max} added
      </p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
