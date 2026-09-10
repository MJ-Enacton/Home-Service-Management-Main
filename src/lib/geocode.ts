export interface ReverseResult {
  address: string;
  latitude: number;
  longitude: number;
}

const UA = "HandyHub/1.0 (home-service-management)";

const reverseCache = new Map<
  string,
  { at: number; data: ReverseResult | null }
>();
const REVERSE_TTL = 30 * 24 * 60 * 60 * 1000;

// Nominatim public instance: max 1 req/s. Serialize server-side calls.
let lastNominatimAt = 0;
async function throttleNominatim() {
  const now = Date.now();
  const wait = 1100 - (now - lastNominatimAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseResult | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const hit = reverseCache.get(key);
  if (hit && Date.now() - hit.at < REVERSE_TTL) return hit.data;

  await throttleNominatim();
  // Nominatim reverse: free, keyless, 1 req/s + User-Agent required.
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return hit?.data ?? null;
  const json = (await res.json()) as { display_name?: string };
  if (!json.display_name) {
    reverseCache.set(key, { at: Date.now(), data: null });
    return null;
  }
  const data = { address: json.display_name, latitude, longitude };
  reverseCache.set(key, { at: Date.now(), data });
  return data;
}

/** India bbox guard (loose, includes metros + rural). */
export function isInIndia(latitude: number, longitude: number) {
  return latitude >= 6 && latitude <= 38 && longitude >= 68 && longitude <= 98;
}
