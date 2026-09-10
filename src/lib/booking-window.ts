/** Booking window: customers can book from today up to 7 days ahead (inclusive). */

export const MAX_BOOKING_DAYS_AHEAD = 7;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local YYYY-MM-DD for a Date (avoids UTC-shift from toISOString). */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalMidnight(dateStr: string): Date | null {
  if (!DATE_RE.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole-calendar-day difference: scheduled - today. */
export function bookingDayOffset(dateStr: string, now: Date = new Date()): number | null {
  const target = parseLocalMidnight(dateStr);
  if (!target) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isDateWithinBookingWindow(dateStr: string, now: Date = new Date()): boolean {
  const offset = bookingDayOffset(dateStr, now);
  return offset !== null && offset >= 0 && offset <= MAX_BOOKING_DAYS_AHEAD;
}

/** { min, max } as local YYYY-MM-DD for <input type="date"> bounds. */
export function getBookingWindow(now: Date = new Date()): { min: string; max: string } {
  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(minDate);
  maxDate.setDate(minDate.getDate() + MAX_BOOKING_DAYS_AHEAD);
  return { min: toLocalDateKey(minDate), max: toLocalDateKey(maxDate) };
}

const SLOT_24H_RE = /^(\d{1,2}):(\d{2})$/;
const SLOT_12H_RE = /^(\d{1,2}):(\d{2})\s*([AP])\.?\s*M\.?$/i;

/**
 * True once the scheduled slot's start time has passed (server local time).
 * Slots are stored 24h "HH:MM"; very old rows may hold "HH:MM AM/PM".
 * Unparseable input fails OPEN (returns true) so legacy rows stay completable.
 */
export function isSlotStartPassed(
  scheduledDate: string,
  scheduledTimeSlot: string,
  now: Date = new Date(),
): boolean {
  if (!DATE_RE.test(scheduledDate)) return true;
  const slot = scheduledTimeSlot.trim();
  const m24 = SLOT_24H_RE.exec(slot);
  const m12 = SLOT_12H_RE.exec(slot);
  let hours: number;
  let minutes: number;
  if (m24) {
    hours = Number(m24[1]);
    minutes = Number(m24[2]);
  } else if (m12) {
    hours = Number(m12[1]) % 12;
    if (m12[3]?.toUpperCase() === "P") hours += 12;
    minutes = Number(m12[2]);
  } else {
    return true;
  }
  if (hours > 23 || minutes > 59) return true;
  const [y, mo, d] = scheduledDate.split("-").map(Number);
  const slotStart = new Date(y, mo - 1, d, hours, minutes);
  if (Number.isNaN(slotStart.getTime())) return true;
  return now.getTime() >= slotStart.getTime();
}
