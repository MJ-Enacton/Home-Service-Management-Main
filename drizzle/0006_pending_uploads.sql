CREATE TABLE "pending_uploads" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "public_id" text NOT NULL UNIQUE, "user_id" text NOT NULL, "purpose" text NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL);--> statement-breakpoint
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pending_uploads_user_id_idx" ON "pending_uploads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pending_uploads_created_at_idx" ON "pending_uploads" USING btree ("created_at");
