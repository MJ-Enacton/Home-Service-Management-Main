export type { Role } from "./auth";
export type {
  ServiceListing,
  ServiceListingCard,
  ServiceListingDetail,
  ServiceTier,
  TierOption,
  ListingCategory,
  PricingType,
  ListingStatus,
} from "./service";
export type {
  Booking,
  BookingListItem,
  BookingStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "./booking";
export { BOOKING_STATUS_LABELS } from "./booking";
export type { NotificationItem } from "./notification";
export type { AdminUser } from "./user";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };
