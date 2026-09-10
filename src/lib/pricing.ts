/** Pricing math and booking-number generation. All amounts are integer cents. */

/** Platform service fee applied on top of the selected price. */
export const SERVICE_FEE_RATE = 0.1;

/**
 * Admin commission on the charged total (Razorpay Route split).
 * Provider transfer = total - admin cut; the remainder stays in the
 * platform nodal account automatically — no separate transfer needed.
 */
export const ADMIN_COMMISSION_RATE = 0.15;

/** Provider's share of a charged total, in paise (== cents numerically). */
export function providerShare(totalCents: number): number {
  return Math.round(Math.max(0, Math.round(totalCents)) * (1 - ADMIN_COMMISSION_RATE));
}

/** Minimum transferable amount (Razorpay requires >= INR 1.00). */
export const MIN_TRANSFER_PAISE = 100;

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
