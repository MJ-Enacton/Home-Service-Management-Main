"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";

export interface PickedLocation {
  address: string;
  latitude: number;
  longitude: number;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const dotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#18181b;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToSet({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef("");
  useEffect(() => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (last.current !== key) {
      last.current = key;
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);
  return null;
}

export function MapLocationPicker({
  initial,
  onChange,
  compact = false,
  toolbar,
}: {
  initial?: PickedLocation | null;
  onChange: (next: PickedLocation | null) => void;
  compact?: boolean;
  /** Optional left-side content sharing the top row with the locate button. */
  toolbar?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(
    initial ? [initial.latitude, initial.longitude] : null,
  );
  const [address, setAddress] = useState(initial?.address ?? "");
  const [detail, setDetail] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Emit combined address (reverse text + manual detail) upward.
  useEffect(() => {
    if (!position || !address) {
      onChange(null);
      return;
    }
    const full = detail.trim() ? `${detail.trim()}, ${address}` : address;
    onChange({ address: full, latitude: position[0], longitude: position[1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, address, detail]);

  const resolvePin = useCallback(async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setResolving(true);
    setGeoError("");
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      const json = await res.json();
      if (res.ok && json.result?.address) {
        setAddress(json.result.address);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setGeoError(
          "No street address found here — add house/flat details below.",
        );
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setGeoError(
        "Address lookup is offline — coords saved, add details below.",
      );
    } finally {
      setResolving(false);
    }
  }, []);

  /** Browser geolocation: free, no API key, explicit user gesture. */
  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("This browser does not support location access.");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void resolvePin(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — tap the map to drop a pin instead."
            : "Could not get your location — tap the map to drop a pin instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, [resolvePin]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {toolbar ?? <span className="text-xs text-muted-foreground">Pick on the map</span>}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={useMyLocation}
          disabled={locating}
        >
          <LocateFixed className="size-4" />
          {locating ? "Locating…" : "Use my location"}
        </Button>
      </div>

      {mounted && (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ height: compact ? 220 : 280 }}
        >
          <MapContainer
            center={position ?? INDIA_CENTER}
            zoom={position ? 15 : 5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToSet onPick={(lat, lng) => void resolvePin(lat, lng)} />
            {position && (
              <>
                <Recenter lat={position[0]} lng={position[1]} />
                <Marker
                  position={position}
                  icon={dotIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const m = e.target as L.Marker;
                      const ll = m.getLatLng();
                      void resolvePin(ll.lat, ll.lng);
                    },
                  }}
                />
              </>
            )}
          </MapContainer>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Tap the map to drop a pin or drag it to adjust, or use your current
        location.
      </p>

      <div className="space-y-2">
        <Label>Selected address</Label>
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
          {resolving
            ? "Resolving address…"
            : address || "No location picked yet."}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addr-detail">
          House / flat / floor / landmark (optional)
        </Label>
        <Input
          id="addr-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Flat 4B, 2nd floor, near Shiv Mandir"
          maxLength={200}
        />
      </div>

      {geoError && <p className="text-xs text-amber-600">{geoError}</p>}
    </div>
  );
}
