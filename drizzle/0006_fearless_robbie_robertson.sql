CREATE TABLE "technician_profiles" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"phone" varchar(40),
	"specialization" varchar(160),
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avatar_url" text,
	"notes" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivated_by" uuid,
	"deactivation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technician_profiles_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id"),
	CONSTRAINT "technician_profiles_display_name_check" CHECK (length(btrim("technician_profiles"."display_name")) between 1 and 120),
	CONSTRAINT "technician_profiles_skills_check" CHECK (jsonb_typeof("technician_profiles"."skills") = 'array')
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_membership_fk" FOREIGN KEY ("organization_id","user_id") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_deactivated_by_membership_fk" FOREIGN KEY ("organization_id","deactivated_by") REFERENCES "public"."memberships"("organization_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "technician_profiles" (
	"organization_id",
	"user_id",
	"display_name",
	"is_available",
	"deactivated_at"
)
SELECT
	"memberships"."organization_id",
	"users"."id",
	coalesce(nullif(btrim("users"."display_name"), ''), "users"."email"),
	("memberships"."is_active" AND "users"."is_active"),
	CASE WHEN "memberships"."is_active" AND "users"."is_active" THEN NULL ELSE now() END
FROM "memberships"
INNER JOIN "users" ON "users"."id" = "memberships"."user_id"
WHERE "memberships"."role" = 'TECHNICIAN'
ON CONFLICT ("organization_id", "user_id") DO NOTHING;--> statement-breakpoint
CREATE INDEX "technician_profiles_user_idx" ON "technician_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "technician_profiles_org_available_idx" ON "technician_profiles" USING btree ("organization_id","is_available");--> statement-breakpoint
CREATE INDEX "technician_profiles_org_specialization_idx" ON "technician_profiles" USING btree ("organization_id","specialization");
