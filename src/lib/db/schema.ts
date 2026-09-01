import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  uuid,
  primaryKey,
  integer,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const roleEnum = pgEnum("role", ["customer", "provider", "admin"]);

export const categoryEnum = pgEnum("category", [
  "plumbing",
  "cleaning",
  "electrical",
  "gardening",
  "painting",
  "hvac",
  "repairs",
  "pest_control",
  "furniture",
  "other",
]);

export const pricingTypeEnum = pgEnum("pricing_type", [
  "hourly",
  "fixed",
  "visit",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "requested",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "paid",
  "refunded",
  "failed",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "paypal",
  "wallet",
  "cod",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_request",
  "request_accepted",
  "booking_confirmed",
  "booking_cancelled",
  "booking_completed",
  "booking_started",
  "payment_received",
  "new_review",
  "new_message",
  "system",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "inactive",
  "draft",
]);

// ============================================================
// BETTER AUTH TABLES — DO NOT CHANGE
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  contact: text("contact").unique(),
  address: text("address"),
  role: roleEnum("role").default("customer"),
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_issuer_accountId_uidx").on(
      table.issuer,
      table.accountId,
    ),
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ============================================================
// APPLICATION TABLES
// ============================================================

// --------------------------------------------------
// Categories — admin-managed master list
// --------------------------------------------------

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageData: text("image_data"),
  imageMime: text("image_mime"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// --------------------------------------------------
// Provider Profiles — extended info (1:1 with user)
// --------------------------------------------------

export const providerProfiles = pgTable(
  "provider_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    yearsExperience: integer("years_experience").default(0).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    serviceAreas: jsonb("service_areas").$type<string[]>(),
    avatarData: text("avatar_data"),
    avatarMime: text("avatar_mime"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("provider_profiles_user_id_idx").on(table.userId)],
);

// --------------------------------------------------
// Service Listings — a provider's individual offering
// --------------------------------------------------

export const serviceListings = pgTable(
  "service_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    pricingType: pricingTypeEnum("pricing_type").notNull(),
    basePrice: integer("base_price").notNull(), // in cents
    status: listingStatusEnum("status").default("active").notNull(),
    location: text("location"),
    estimatedDuration: text("estimated_duration"), // e.g., "2-4 hours"
    isVerified: boolean("is_verified").default(false).notNull(),
    tags: jsonb("tags").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("service_listings_provider_id_idx").on(table.providerId),
    index("service_listings_category_id_idx").on(table.categoryId),
    index("service_listings_status_idx").on(table.status),
    check(
      "chk_service_listings_base_price_nonneg",
      sql`${table.basePrice} >= 0`,
    ),
  ],
);

// --------------------------------------------------
// Service Tiers — pricing tiers per listing
// --------------------------------------------------

export const serviceTiers = pgTable(
  "service_tiers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => serviceListings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price").notNull(), // in cents
    displayOrder: integer("display_order").default(0).notNull(),
  },
  (table) => [
    index("service_tiers_listing_id_idx").on(table.listingId),
    check("chk_service_tiers_price_nonneg", sql`${table.price} >= 0`),
  ],
);

// --------------------------------------------------
// Listing Images — gallery images for listings
// --------------------------------------------------

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => serviceListings.id, { onDelete: "cascade" }),
    imageData: text("image_data").notNull(),
    imageMime: text("image_mime").notNull(),
    altText: text("alt_text"),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("listing_images_listing_id_idx").on(table.listingId)],
);

// --------------------------------------------------
// Bookings — full booking lifecycle
// --------------------------------------------------

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingNumber: text("booking_number").notNull().unique(), // e.g., "HB-82941"

    listingId: uuid("listing_id")
      .notNull()
      .references(() => serviceListings.id, { onDelete: "restrict" }),
    tierId: uuid("tier_id").references(() => serviceTiers.id, {
      onDelete: "set null",
    }),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: bookingStatusEnum("status").default("requested").notNull(),

    // Step 1 — Job Details
    streetAddress: text("street_address").notNull(),
    city: text("city"),
    zipCode: text("zip_code"),
    jobNotes: text("job_notes"),
    contactFirstName: text("contact_first_name"),
    contactLastName: text("contact_last_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),

    // Step 2 — Schedule
    scheduledDate: timestamp("scheduled_date").notNull(),
    scheduledTimeSlot: text("scheduled_time_slot").notNull(), // e.g., "09:30 AM"
    isContactless: boolean("is_contactless").default(false).notNull(),
    isUrgent: boolean("is_urgent").default(false).notNull(),

    // Pricing (in cents)
    serviceFee: integer("service_fee").default(0).notNull(),
    taxAmount: integer("tax_amount").default(0).notNull(),
    totalAmount: integer("total_amount").notNull(),

    // Lifecycle timestamps
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("bookings_listing_id_idx").on(table.listingId),
    index("bookings_customer_id_idx").on(table.customerId),
    index("bookings_provider_id_idx").on(table.providerId),
    index("bookings_status_idx").on(table.status),
    index("bookings_scheduled_date_idx").on(table.scheduledDate),
    check(
      "chk_bookings_amounts_nonneg",
      sql`${table.serviceFee} >= 0 AND ${table.taxAmount} >= 0 AND ${table.totalAmount} >= 0`,
    ),
  ],
);

// --------------------------------------------------
// Payments — payment transactions for bookings
// --------------------------------------------------

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    amountPaid: integer("amount_paid").notNull(), // in cents
    providerPayout: integer("provider_payout"), // after platform fee deduction
    externalId: text("external_id"), // Stripe payment intent ID, etc.
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("payments_booking_id_idx").on(table.bookingId),
    index("payments_status_idx").on(table.status),
    check("chk_payments_amount_paid_nonneg", sql`${table.amountPaid} >= 0`),
  ],
);

// --------------------------------------------------
// Reviews — customer reviews after booking completion
// --------------------------------------------------

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => serviceListings.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1–5
    comment: text("comment"),
    isVisible: boolean("is_visible").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("reviews_provider_id_idx").on(table.providerId),
    index("reviews_listing_id_idx").on(table.listingId),
    index("reviews_reviewer_id_idx").on(table.reviewerId),
    check(
      "chk_reviews_rating_range",
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`,
    ),
  ],
);

// --------------------------------------------------
// Favorites — customer wishlist / saved listings
// --------------------------------------------------

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => serviceListings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
    index("favorites_user_id_idx").on(table.userId),
    index("favorites_listing_id_idx").on(table.listingId),
  ],
);

// --------------------------------------------------
// Notifications — enhanced with richer types
// --------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "cascade",
    }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at"),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_booking_id_idx").on(table.bookingId),
    index("notifications_read_at_idx").on(table.readAt),
  ],
);

// --------------------------------------------------
// Provider Availability — weekly time slots
// --------------------------------------------------

export const providerAvailability = pgTable(
  "provider_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday .. 6=Saturday
    startTime: text("start_time").notNull(), // "08:00"
    endTime: text("end_time").notNull(), // "17:00"
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("provider_availability_provider_id_idx").on(table.providerId),
    check(
      "chk_provider_availability_day_of_week",
      sql`${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6`,
    ),
    check(
      "chk_provider_availability_time_order",
      sql`${table.startTime} < ${table.endTime}`,
    ),
  ],
);

// --------------------------------------------------
// Booking Messages — per-booking chat between customer and provider
// --------------------------------------------------

export const bookingMessages = pgTable(
  "booking_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("booking_messages_booking_id_idx").on(table.bookingId),
    index("booking_messages_sender_id_idx").on(table.senderId),
  ],
);

// ============================================================
// RELATIONS
// ============================================================

// --- Better-Auth relations (unchanged) ---

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  providerProfile: one(providerProfiles, {
    fields: [user.id],
    references: [providerProfiles.userId],
  }),
  serviceListings: many(serviceListings),
  customerBookings: many(bookings, { relationName: "customer" }),
  providerBookings: many(bookings, { relationName: "provider" }),
  reviewsWritten: many(reviews, { relationName: "reviewer" }),
  reviewsReceived: many(reviews, { relationName: "reviewedProvider" }),
  favorites: many(favorites),
  notifications: many(notifications),
  availability: many(providerAvailability),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// --- Application relations ---

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(serviceListings),
}));

export const providerProfilesRelations = relations(
  providerProfiles,
  ({ one }) => ({
    user: one(user, {
      fields: [providerProfiles.userId],
      references: [user.id],
    }),
  }),
);

export const serviceListingsRelations = relations(
  serviceListings,
  ({ one, many }) => ({
    provider: one(user, {
      fields: [serviceListings.providerId],
      references: [user.id],
    }),
    category: one(categories, {
      fields: [serviceListings.categoryId],
      references: [categories.id],
    }),
    tiers: many(serviceTiers),
    images: many(listingImages),
    bookings: many(bookings),
    reviews: many(reviews),
    favorites: many(favorites),
  }),
);

export const serviceTiersRelations = relations(serviceTiers, ({ one }) => ({
  listing: one(serviceListings, {
    fields: [serviceTiers.listingId],
    references: [serviceListings.id],
  }),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(serviceListings, {
    fields: [listingImages.listingId],
    references: [serviceListings.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  listing: one(serviceListings, {
    fields: [bookings.listingId],
    references: [serviceListings.id],
  }),
  tier: one(serviceTiers, {
    fields: [bookings.tierId],
    references: [serviceTiers.id],
  }),
  customer: one(user, {
    fields: [bookings.customerId],
    references: [user.id],
    relationName: "customer",
  }),
  provider: one(user, {
    fields: [bookings.providerId],
    references: [user.id],
    relationName: "provider",
  }),
  payments: many(payments),
  review: one(reviews),
  notifications: many(notifications),
  messages: many(bookingMessages),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  reviewer: one(user, {
    fields: [reviews.reviewerId],
    references: [user.id],
    relationName: "reviewer",
  }),
  provider: one(user, {
    fields: [reviews.providerId],
    references: [user.id],
    relationName: "reviewedProvider",
  }),
  listing: one(serviceListings, {
    fields: [reviews.listingId],
    references: [serviceListings.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(user, {
    fields: [favorites.userId],
    references: [user.id],
  }),
  listing: one(serviceListings, {
    fields: [favorites.listingId],
    references: [serviceListings.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  booking: one(bookings, {
    fields: [notifications.bookingId],
    references: [bookings.id],
  }),
}));

export const providerAvailabilityRelations = relations(
  providerAvailability,
  ({ one }) => ({
    provider: one(user, {
      fields: [providerAvailability.providerId],
      references: [user.id],
    }),
  }),
);

export const bookingMessagesRelations = relations(bookingMessages, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingMessages.bookingId],
    references: [bookings.id],
  }),
  sender: one(user, {
    fields: [bookingMessages.senderId],
    references: [user.id],
  }),
}));
