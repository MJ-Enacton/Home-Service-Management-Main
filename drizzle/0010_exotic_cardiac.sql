ALTER TABLE "user" DROP CONSTRAINT "user_razorpay_account_id_unique";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payout_settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "razorpay_account_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "razorpay_product_id";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "razorpay_activation_status";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "razorpay_tnc_accepted_at";