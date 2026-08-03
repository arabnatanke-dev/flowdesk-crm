import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const membershipRole = pgEnum("membership_role", [
  "OWNER",
  "ADMIN",
  "DISPATCHER",
  "TECHNICIAN",
  "ACCOUNTANT",
  "VIEWER",
]);

export const workOrderStatus = pgEnum("work_order_status", [
  "NEW",
  "TRIAGED",
  "READY_TO_SCHEDULE",
  "SCHEDULED",
  "DISPATCHED",
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "PAUSED",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_PARTS",
  "WORK_COMPLETED",
  "CLOSED",
  "CANCELED",
]);

export const workOrderPriority = pgEnum("work_order_priority", ["LOW", "NORMAL", "HIGH", "URGENT"]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    name: text("name").notNull(),
    defaultLocale: varchar("default_locale", { length: 2 }).notNull().default("en"),
    timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Dubai"),
    currency: varchar("currency", { length: 3 }).notNull().default("AED"),
    taxRateBps: integer("tax_rate_bps").notNull().default(500),
    settingsVersion: integer("settings_version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("organizations_locale_check", sql`${table.defaultLocale} in ('ru', 'en')`),
    check("organizations_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check("organizations_tax_check", sql`${table.taxRateBps} between 0 and 10000`),
    check("organizations_settings_version_check", sql`${table.settingsVersion} > 0`),
  ],
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const technicianProfiles = pgTable(
  "technician_profiles",
  {
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    displayName: text("display_name").notNull(),
    phone: varchar("phone", { length: 40 }),
    specialization: varchar("specialization", { length: 160 }),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    avatarUrl: text("avatar_url"),
    notes: text("notes"),
    isAvailable: boolean("is_available").notNull().default(true),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivatedBy: uuid("deactivated_by"),
    deactivationReason: text("deactivation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("technician_profiles_user_idx").on(table.userId),
    index("technician_profiles_org_available_idx").on(table.organizationId, table.isAvailable),
    index("technician_profiles_org_specialization_idx").on(table.organizationId, table.specialization),
    check("technician_profiles_display_name_check", sql`length(btrim(${table.displayName})) between 1 and 120`),
    check("technician_profiles_skills_check", sql`jsonb_typeof(${table.skills}) = 'array'`),
    foreignKey({
      columns: [table.organizationId, table.userId],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "technician_profiles_membership_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.deactivatedBy],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "technician_profiles_deactivated_by_membership_fk",
    }),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    previousTokenHash: varchar("previous_token_hash", { length: 64 }),
    previousTokenValidUntil: timestamp("previous_token_valid_until", { withTimezone: true }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }).notNull().defaultNow(),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
    index("sessions_last_seen_idx").on(table.lastSeenAt),
    index("sessions_previous_token_idx").on(table.previousTokenHash),
  ],
);

export const organizationSequences = pgTable("organization_sequences", {
  organizationId: uuid("organization_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
  nextWorkOrderNumber: integer("next_work_order_number").notNull().default(1001),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    clientName: text("client_name").notNull(),
    clientPhone: varchar("client_phone", { length: 40 }).notNull(),
    titleRu: text("title_ru").notNull(),
    titleEn: text("title_en").notNull(),
    addressRu: text("address_ru").notNull(),
    addressEn: text("address_en").notNull(),
    status: workOrderStatus("status").notNull().default("NEW"),
    priority: workOrderPriority("priority").notNull().default("NORMAL"),
    technicianId: uuid("technician_id").references(() => users.id, { onDelete: "set null" }),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    timezone: varchar("timezone", { length: 80 }).notNull().default("Asia/Dubai"),
    amountMinor: integer("amount_minor").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("AED"),
    slaMinutes: integer("sla_minutes"),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    updatedBy: uuid("updated_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("work_orders_org_number_uidx").on(table.organizationId, table.number),
    index("work_orders_org_status_idx").on(table.organizationId, table.status),
    index("work_orders_technician_idx").on(table.organizationId, table.technicianId),
    check("work_orders_number_check", sql`${table.number} > 0`),
    check("work_orders_amount_check", sql`${table.amountMinor} >= 0`),
    check("work_orders_version_check", sql`${table.version} > 0`),
    check("work_orders_schedule_check", sql`${table.scheduledEnd} is null or ${table.scheduledStart} is null or ${table.scheduledEnd} >= ${table.scheduledStart}`),
    foreignKey({
      columns: [table.organizationId, table.technicianId],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "work_orders_technician_membership_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.createdBy],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "work_orders_creator_membership_fk",
    }),
    foreignKey({
      columns: [table.organizationId, table.updatedBy],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "work_orders_updater_membership_fk",
    }),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_org_created_idx").on(table.organizationId, table.createdAt),
    foreignKey({
      columns: [table.organizationId, table.actorUserId],
      foreignColumns: [memberships.organizationId, memberships.userId],
      name: "audit_logs_actor_membership_fk",
    }),
  ],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
    failures: integer("failures").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("auth_rate_limits_failures_check", sql`${table.failures} >= 0`)],
);
