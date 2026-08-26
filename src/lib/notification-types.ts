/** String union of the notification_type DB enum (kept in sync with schema.ts). */
export type NotificationType =
  | "new_request"
  | "request_accepted"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "booking_started"
  | "payment_received"
  | "new_review"
  | "new_message"
  | "system";
