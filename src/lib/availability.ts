/**
 * Time-slot generation for the booking wizard schedule step.
 *
 * Canonical formats:
 * - availability windows & slots: 24h "HH:mm" strings ("08:00", "17:30")
 * - dayOfWeek: 0 = Sunday .. 6 = Saturday (matches providerAvailability.dayOfWeek)
 */

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface Slot {
  /** canonical "HH:mm" */
  time: string;
  status: "available" | "booked";
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((p) => Number.parseInt(p ?? "", 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error(`Invalid time string: ${hhmm}`);
  }
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** JS getDay() of a YYYY-MM-DD or Date — kept explicit for testability */
export function dayOfWeekOf(date: Date): number {
  return date.getDay();
}

interface GenerateSlotsOptions {
  date: Date;
  windows: AvailabilityWindow[];
  /**
   * Start times ("HH:mm") already taken by bookings on this date for the
   * provider. A booking is assumed to occupy one slot length.
   */
  bookedSlotTimes?: string[];
  /** length of one appointment in minutes (default 90) */
  slotMinutes?: number;
  /** step between slot starts in minutes (default = slotMinutes) */
  stepMinutes?: number;
  /** Current time (server-side) to filter out past slots for today's date */
  now?: Date;
}

/**
 * Generate bookable slots for a date from the provider's weekly windows,
 * marking overlaps with existing bookings. For today's date, past slots
 * (before `now`) are filtered out.
 */
export function generateSlots({
  date,
  windows,
  bookedSlotTimes = [],
  slotMinutes = 90,
  stepMinutes = slotMinutes,
  now = new Date(),
}: GenerateSlotsOptions): Slot[] {
  const day = dayOfWeekOf(date);
  const booked = new Set(bookedSlotTimes);

  // Check if the target date is today (same year, month, day as `now`)
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const currentMinutes = isToday ? timeToMinutes(minutesToTime(now.getHours() * 60 + now.getMinutes())) : -1;

  const slots: Slot[] = [];
  for (const window of windows) {
    if (!window.isActive || window.dayOfWeek !== day) continue;

    let cursor = timeToMinutes(window.startTime);
    const end = timeToMinutes(window.endTime);

    while (cursor + slotMinutes <= end) {
      const time = minutesToTime(cursor);
      // For today's date, skip slots that are in the past
      if (isToday && cursor < currentMinutes) {
        cursor += stepMinutes;
        continue;
      }
      slots.push({ time, status: booked.has(time) ? "booked" : "available" });
      cursor += stepMinutes;
    }
  }

  // Windows may overlap; dedupe by start time keeping the first occurrence.
  const seen = new Set<string>();
  return slots.filter((slot) => {
    if (seen.has(slot.time)) return false;
    seen.add(slot.time);
    return true;
  });
}

/** Next calendar date (YYYY-MM-DD) that has at least one active window — used for "Next available" hints. */
export function nextAvailableDate(
  windows: AvailabilityWindow[],
  from: Date = new Date(),
  horizonDays = 30,
): string | null {
  for (let offset = 0; offset <= horizonDays; offset++) {
    const d = new Date(from);
    d.setDate(d.getDate() + offset);
    const day = d.getDay();
    if (windows.some((w) => w.isActive && w.dayOfWeek === day)) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
    }
  }
  return null;
}
