"use client";

// an embedded OpenStreetMap map for a single business's street address,
// shown on its detail page (see app/business/[slug]/page.js) — only ever
// rendered there for a physical-location business that actually has a
// street address set. Leaflet needs real browser APIs (window, document)
// that don't exist during server-side rendering, so this whole component
// is loaded through next/dynamic with "ssr: false" rather than a normal
// import — see components/BusinessMapLoader.jsx.

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Leaflet's default marker icon looks up its image files using a relative
// path baked in at build time, which breaks once bundled through Next.js —
// this removes that broken lookup and points the icons at the same images
// straight from Leaflet's own CDN instead. this is a known, standard fix
// for "Leaflet + Next.js", not specific to this one map.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ZOOM_LEVEL = 15; // street level

export default function BusinessMap({ streetAddress, area, province }) {
  const mapContainerRef = useRef(null); // the <div> Leaflet attaches the actual map to, once one exists (see the "ready" branch below)
  const mapInstanceRef  = useRef(null); // the live Leaflet map instance, so it can be torn down on unmount
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [coords, setCoords] = useState(null);       // { lat, lon } once geocoding succeeds

  // look up this address's coordinates once, using OpenStreetMap's free
  // Nominatim geocoding service — no API key needed. including the area and
  // province (not just the raw street address) makes the match far more
  // reliable, since plenty of street names repeat across different towns.
  useEffect(() => {
    let cancelled = false; // guards against setting state after this effect's own cleanup has already run (e.g. the admin navigates away mid-request)

    async function geocode() {
      try {
        const query = `${streetAddress}, ${area}, ${province}, South Africa`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });
        const results = await response.json();

        if (cancelled) return;

        if (!Array.isArray(results) || results.length === 0) {
          setStatus("error");
          return;
        }

        const { lat, lon } = results[0];
        setCoords({ lat: parseFloat(lat), lon: parseFloat(lon) });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    geocode();
    return () => { cancelled = true; };
  }, [streetAddress, area, province]);

  // once coordinates are known, build the actual Leaflet map. kept as its
  // own effect (rather than folded into the geocoding one above) so it only
  // ever runs once the "ready" branch below has actually put the map
  // container div on the page for Leaflet to attach to.
  useEffect(() => {
    if (status !== "ready" || !coords || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lon], ZOOM_LEVEL);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.marker([coords.lat, coords.lon]).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [status, coords]);

  return (
    <div className="card biz-section biz-map-section">
      <h2 className="biz-section-title">
        <i className="fa-solid fa-map-location-dot" /> Find Us
      </h2>

      {status === "loading" && (
        <p className="biz-map-loading">
          <i className="fa-solid fa-spinner fa-spin" /> Loading map...
        </p>
      )}

      {status === "error" && (
        <p className="biz-map-fallback">Map not available for this address.</p>
      )}

      {status === "ready" && (
        <>
          <div ref={mapContainerRef} className="biz-map" />
          <a
            href={`https://www.openstreetmap.org/directions?to=${coords.lat},${coords.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="biz-map-directions"
          >
            <i className="fa-solid fa-diamond-turn-right" /> Get Directions
          </a>
        </>
      )}
    </div>
  );
}
