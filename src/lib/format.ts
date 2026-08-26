/** Shared display-formatting helpers. All monetary amounts are integer cents. */

export function formatCents(cents: number, options?: { withCents?: boolean }): string {
  const withCents = options?.withCents ?? true;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(cents / 100);
}

/** "85.00" | "85" -> 8500 (rounds fractional cents). Returns null when unparseable/negative. */
export function parseCents(input: string): number | null {
  const value = Number.parseFloat(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export const PRICING_TYPE_LABELS: Record<string, string> = {
  hourly: "hr",
  fixed: "project",
  visit: "visit",
};

/** Suffix shown next to a price, e.g. "$85/hr" */
export function pricingUnitLabel(pricingType: string): string {
  return PRICING_TYPE_LABELS[pricingType] ?? "";
}

/**
 * Canonical time-slot storage format is 24h "HH:mm" ("09:30").
 * Convert to the 12h display form used in the UI ("09:30 AM").
 */
export function formatTimeDisplay(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number.parseInt(hStr ?? "", 10);
  const m = mStr ?? "00";
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${suffix}`;
}

/** Human label for snake_case enum values: "pest_control" -> "Pest Control" */
export function enumLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
