ALTER TYPE "public"."payment_method" ADD VALUE 'upi' BEFORE 'paypal';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "razorpay_order_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "razorpay_payment_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "transfer_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "transfer_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "razorpay_account_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "razorpay_product_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "razorpay_activation_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "razorpay_tnc_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_razorpay_account_id_unique" UNIQUE("razorpay_account_id");