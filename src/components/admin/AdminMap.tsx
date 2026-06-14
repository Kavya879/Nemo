"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Polyline,
  Tooltip,
} from "react-leaflet";
import type { AdminMapDTO } from "@/types/dto";

/**
 * The Matching Map — makes the invisible matching visible. Returned items pin
 * near the returner hub, nearby buyers pin at their real locations, and a line
 * is drawn for every match: "item here → buyer 3.2km away".
 */
export default function AdminMap({ data }: { data: AdminMapDTO }) {
  const { origin, radiusKm, buyers, returns } = data;

  // Spread return-item pins in a small ring around the origin so they're visible.
  const itemPos = (i: number, n: number) => {
    const r = 0.006; // ~0.6km
    const angle = (i / Math.max(n, 1)) * 2 * Math.PI;
    return { lat: origin.lat + r * Math.cos(angle), lng: origin.lng + r * Math.sin(angle) };
  };

  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: 460, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Matching radius */}
      <Circle
        center={[origin.lat, origin.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#007185", fillColor: "#007185", fillOpacity: 0.06 }}
      />

      {/* Returner hub */}
      <CircleMarker
        center={[origin.lat, origin.lng]}
        radius={10}
        pathOptions={{ color: "#131921", fillColor: "#febd69", fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top">Returns hub</Tooltip>
      </CircleMarker>

      {/* Buyers (blue) */}
      {buyers.map((b) => (
        <CircleMarker
          key={b.id}
          center={[b.lat, b.lng]}
          radius={7}
          pathOptions={{ color: "#0050a0", fillColor: "#2f7ed8", fillOpacity: 0.9 }}
        >
          <Tooltip direction="top">
            🛍 {b.name} · wants {b.wishlist.join(", ")}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Returned items (orange) + match lines (green) */}
      {returns.map((r, i) => {
        const pos = itemPos(i, returns.length);
        return (
          <span key={r.id}>
            <CircleMarker
              center={[pos.lat, pos.lng]}
              radius={6}
              pathOptions={{
                color: r.matched ? "#067d62" : "#c45500",
                fillColor: r.matched ? "#067d62" : "#ff9900",
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top">
                📦 {r.itemName} · {r.pathLabel}
              </Tooltip>
            </CircleMarker>
            {r.matched && r.buyer && (
              <Polyline
                positions={[
                  [pos.lat, pos.lng],
                  [r.buyer.lat, r.buyer.lng],
                ]}
                pathOptions={{ color: "#067d62", weight: 2, dashArray: "6 6" }}
              >
                <Tooltip direction="center">
                  {r.itemName} → {r.buyer.name}
                  {r.buyer.distanceKm != null ? ` (${r.buyer.distanceKm.toFixed(1)}km)` : ""}
                </Tooltip>
              </Polyline>
            )}
          </span>
        );
      })}
    </MapContainer>
  );
}
