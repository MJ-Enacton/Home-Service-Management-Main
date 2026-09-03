import { z } from "zod";

import { pricingTypeEnum } from "@/lib/db/schema";

export const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contact: z
    .string()
    .min(10, { message: "Please enter a valid contact number." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  role: z.enum(["customer", "provider"], {
    message: "Please select a role.",
  }),
});

// ============================================================
// SERVICE LISTINGS (provider editor)
// ============================================================

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Money input in the UI; stored as integer cents. */
const moneyCents = z
  .number({ message: "Price is required." })
  .int("Whole cents only.")
  .min(0, "Price cannot be negative.");

export const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required.").max(80),
  description: z.string().max(300).nullish(),
  priceCents: moneyCents,
  displayOrder: z.number().int().min(0).default(0),
});

export const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(120),
  description: z.string().max(2000).nullish(),
  categorySlug: z.string().min(1, "Category is required."),
  // Pricing is required unless tiers are provided
  pricingType: z.enum(pricingTypeEnum.enumValues).optional(),
  basePriceCents: moneyCents.optional(),
  location: z.string().min(2, "Service area is required.").max(120),
  estimatedDuration: z.string().min(2, "Hours is required.").max(60),
  tags: z
    .array(z.string().min(1).max(30))
    .min(1, "At least one tag is required.")
    .max(10),
});

export type ListingInput = z.infer<typeof listingSchema>;
export type TierInput = z.infer<typeof tierSchema>;

// ============================================================
// BOOKING WIZARD (steps map to bookings columns)
// ============================================================

export const bookingDetailsSchema = z.object({
  streetAddress: z.string().min(5, "Street address is required.").max(200),
  jobNotes: z.string().max(2000).optional(),
  contactFullName: z.string().max(120).optional(),
  contactEmail: z.string().min(1, "Email is required.").email("Enter a valid email."),
  contactPhone: z.string().min(1, "Phone number is required.").max(30),
});

export const bookingScheduleSchema = z.object({
  /** ISO date (YYYY-MM-DD) */
  scheduledDate: z.string().optional(),
  /** canonical 24h slot start, e.g. "09:30" */
  scheduledTimeSlot: z
    .string()
    .regex(HH_MM, "Pick a valid time slot.")
    .optional()
    .or(z.literal("")),
  isContactless: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  tierId: z.uuid().nullish(),
}).refine(data => data.isUrgent || (data.scheduledDate && data.scheduledTimeSlot), {
  message: "Date and time are required for non-urgent jobs.",
  path: ["scheduledDate"],
});

export type BookingDetailsInput = z.infer<typeof bookingDetailsSchema>;
export type BookingScheduleInput = z.infer<typeof bookingScheduleSchema>;

// ============================================================
// REVIEWS / AVAILABILITY / FAVORITES
// ============================================================

export const reviewSchema = z.object({
  bookingId: z.uuid(),
  rating: z.number().int().min(1, "Rating is required.").max(5),
  comment: z.string().max(1000).optional(),
});

export const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HH_MM, 'Use 24h "HH:mm".'),
    endTime: z.string().regex(HH_MM, 'Use 24h "HH:mm".'),
  })
  .refine((w) => w.startTime < w.endTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });

export const favoriteToggleSchema = z.object({
  listingId: z.uuid(),
});

