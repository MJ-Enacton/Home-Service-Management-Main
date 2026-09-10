import type { InferSelectModel } from "drizzle-orm";

import type { bookings, payments } from "@/lib/db/schema";

export type Booking = InferSelectModel<typeof bookings>;
export type Payment = InferSelectModel<typeof payments>;

/** DB enum values — keep in sync with bookingStatusEnum */
export type BookingStatus =
  | "requested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus = Payment["status"];
export type PaymentMethod = Payment["method"];

/** Row shown in the customer / provider booking lists */
export interface BookingListItem {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  listingId: string;
  listingTitle: string;
  categoryName: string | null;
  /** the other party relative to the viewer */
  counterpartyName: string;
  /** date-only "YYYY-MM-DD" (bookings.scheduled_date is a date column) */
  scheduledDate: string;
  scheduledTimeSlot: string;
  addressLine: string;
  totalAmountCents: number;
  amountPaidCents: number | null;
  /** true when an online payment is still pending (Pay now retry) */
  paymentPending?: boolean;
  /** true when the customer already left a review (customer view) */
  reviewed: boolean;
  requestedAt: Date;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: "Awaiting Approval",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
