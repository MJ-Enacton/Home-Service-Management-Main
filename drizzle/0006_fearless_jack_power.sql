ALTER TABLE "bookings" ALTER COLUMN "street_address" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "scheduled_date" SET DATA TYPE date;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_provider_slot_no_overlap" ON "bookings" USING btree ("provider_id","scheduled_date","scheduled_time_slot") WHERE "bookings"."status" != 'cancelled';--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "zip_code";