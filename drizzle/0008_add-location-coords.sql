ALTER TABLE "bookings" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "used_saved_address" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "longitude" double precision;