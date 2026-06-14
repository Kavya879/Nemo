/**
 * A compact OpenStreetMap preview of a location. The map itself is a
 * non-interactive embed; clicking the overlay opens Google Maps directions to
 * the spot in a new tab. No API key required.
 */
export function MiniMap({
  lat,
  lng,
  label,
  className = "h-32",
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  const d = 0.012;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={`relative w-full overflow-hidden rounded border border-line ${className}`}>
      {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
      <iframe
        src={osm}
        title="Pickup location"
        loading="lazy"
        className="h-full w-full"
        style={{ border: 0, pointerEvents: "none" }}
      />
      {/* Click anywhere on the map → Google Maps */}
      <a
        href={gmaps}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-squid/40 to-transparent p-2"
      >
        <span className="rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink">
          📍 {label ?? "Location"}
        </span>
        <span className="rounded bg-link px-2 py-0.5 text-[11px] font-bold text-white">
          Open in Google Maps →
        </span>
      </a>
    </div>
  );
}
