ALTER TABLE "auth_rate_limits" ADD CONSTRAINT "auth_rate_limits_failures_check" CHECK ("auth_rate_limits"."failures" >= 0);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_locale_check" CHECK ("organizations"."default_locale" in ('ru', 'en'));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_currency_check" CHECK ("organizations"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tax_check" CHECK ("organizations"."tax_rate_bps" between 0 and 10000);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_settings_version_check" CHECK ("organizations"."settings_version" > 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_number_check" CHECK ("work_orders"."number" > 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_amount_check" CHECK ("work_orders"."amount_minor" >= 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_version_check" CHECK ("work_orders"."version" > 0);--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_schedule_check" CHECK ("work_orders"."scheduled_end" is null or "work_orders"."scheduled_start" is null or "work_orders"."scheduled_end" >= "work_orders"."scheduled_start");