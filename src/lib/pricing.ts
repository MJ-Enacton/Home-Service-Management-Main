/** Pricing math and booking-number generation. All amounts are integer cents. */

/** Platform service fee applied on top of the selected price. */
export const SERVICE_FEE_RATE = 0.1;

export interface PriceBreakdown {
  baseCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalCents: number;
}

export function computePriceBreakdown(baseCents: number): PriceBreakdown {
  const safeBase = Math.max(0, Math.round(baseCents));
  const serviceFeeCents = Math.round(safeBase * SERVICE_FEE_RATE);
  return {
    baseCents: safeBase,
    serviceFeeCents,
    taxCents: 0,
    totalCents: safeBase + serviceFeeCents,
  };
}

/**
 * Human-facing booking reference, e.g. "HB-82941".
 * Retried by callers on unique-constraint collisions.
 */
export function generateBookingNumber(): string {
  const digits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `HB-${digits}`;
}
