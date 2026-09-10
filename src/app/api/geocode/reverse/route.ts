import { NextResponse } from "next/server";

import { reverseGeocode } from "@/lib/geocode";

/** Nominatim reverse proxy: pin -> real address. Throttled + cached server-side. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const latitude = Number(sp.get("lat"));
  const longitude = Number(sp.get("lon"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Out of range." }, { status: 400 });
  }
  try {
    const result = await reverseGeocode(latitude, longitude);
    if (!result) {
      return NextResponse.json(
        { error: "No address found for this location." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "private, max-age=86400" } },
    );
  } catch (err) {
    console.error("[geocode] reverse failed:", err);
    return NextResponse.json({ error: "Geocoding unavailable." }, { status: 502 });
  }
}
