/** Notification row shape for the notifications center + realtime payloads */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
}
