"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import type { BuyerMatchDTO } from "@/types/dto";

/**
 * Nearby-buyer map (Leaflet + OpenStreetMap). Uses CircleMarkers (no external
 * icon assets) so it renders reliably in any bundler. Client-only — must be
 * loaded with next/dynamic({ ssr: false }) because Leaflet needs `window`.
 */
export default function BuyerMap({
  origin,
  matches,
  radiusKm,
}: {
  origin: { lat: number; lng: number };
  matches: BuyerMatchDTO[];
  radiusKm: number;
}) {
  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: 360, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Radius circle */}
      <Circle
        center={[origin.lat, origin.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#007185", fillColor: "#007185", fillOpacity: 0.08 }}
      />
      {/* Origin (the returner) */}
      <CircleMarker
        center={[origin.lat, origin.lng]}
        radius={9}
        pathOptions={{ color: "#131921", fillColor: "#febd69", fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top">
          Your location
        </Tooltip>
      </CircleMarker>
      {/* Matched buyers */}
      {matches.map((m) => (
        <CircleMarker
          key={m.buyerId}
          center={[m.lat, m.lng]}
          radius={8}
          pathOptions={{ color: "#067d62", fillColor: "#067d62", fillOpacity: 0.9 }}
        >
          <Tooltip direction="top">
            {m.name} · {m.distanceKm.toFixed(1)} km
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
