ALTER TABLE "sessions" ADD COLUMN "previous_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "previous_token_valid_until" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sessions_previous_token_idx" ON "sessions" USING btree ("previous_token_hash");