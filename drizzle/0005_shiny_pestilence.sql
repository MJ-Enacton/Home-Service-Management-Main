ALTER TABLE "listing_images" ALTER COLUMN "image_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ALTER COLUMN "image_mime" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "public_id" text;--> statement-breakpoint
ALTER TABLE "listing_images" ADD COLUMN "secure_url" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "avatar_public_id" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "avatar_url" text;