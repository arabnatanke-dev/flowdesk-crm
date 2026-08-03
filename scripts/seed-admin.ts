import "dotenv/config";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index";
import { memberships, organizations, organizationSequences, users, workOrders } from "../db/schema";
import { hashPassword } from "../src/server/security/crypto";

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  SEED_ORG_SLUG: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default("horizon"),
  SEED_ORG_NAME: z.string().min(1).default("Horizon Home Services"),
  SEED_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_PASSWORD: z.string().min(12),
  SEED_ADMIN_NAME: z.string().min(1).default("FlowDesk Owner"),
});

async function seed(): Promise<void> {
  // EN: Idempotently create the first tenant, owner membership, sequence and representative work orders.
  // RU: Идемпотентно создаёт первый tenant, owner-membership, sequence и примеры заявок.
  const environment = seedEnvironmentSchema.parse(process.env);
  const db = getDb();
  const [organization] = await db.insert(organizations).values({
    slug: environment.SEED_ORG_SLUG,
    name: environment.SEED_ORG_NAME,
  }).onConflictDoUpdate({
    target: organizations.slug,
    set: { name: environment.SEED_ORG_NAME, isActive: true, updatedAt: new Date() },
  }).returning();

  const passwordHash = await hashPassword(environment.SEED_ADMIN_PASSWORD);
  const [owner] = await db.insert(users).values({
    email: environment.SEED_ADMIN_EMAIL,
    displayName: environment.SEED_ADMIN_NAME,
    passwordHash,
  }).onConflictDoUpdate({
    target: users.email,
    set: { displayName: environment.SEED_ADMIN_NAME, passwordHash, isActive: true, updatedAt: new Date() },
  }).returning();

  await db.insert(memberships).values({
    organizationId: organization.id,
    userId: owner.id,
    role: "OWNER",
  }).onConflictDoUpdate({
    target: [memberships.organizationId, memberships.userId],
    set: { role: "OWNER", isActive: true },
  });
  await db.insert(organizationSequences).values({
    organizationId: organization.id,
    nextWorkOrderNumber: 1049,
  }).onConflictDoNothing({ target: organizationSequences.organizationId });

  const [existing] = await db.select({ value: count() }).from(workOrders).where(eq(workOrders.organizationId, organization.id));
  if (existing.value === 0) {
    const now = Date.now();
    await db.insert(workOrders).values([
      {
        organizationId: organization.id,
        number: 1048,
        clientName: "Layla Hassan",
        clientPhone: "+971 50 441 2048",
        titleRu: "Кондиционер не охлаждает",
        titleEn: "AC is not cooling",
        addressRu: "Dubai Marina · Marina Gate",
        addressEn: "Dubai Marina · Marina Gate",
        status: "NEW",
        priority: "URGENT",
        amountMinor: 0,
        slaMinutes: 18,
        createdBy: owner.id,
        updatedBy: owner.id,
      },
      {
        organizationId: organization.id,
        number: 1047,
        clientName: "Omar Al Mansoori",
        clientPhone: "+971 55 820 7142",
        titleRu: "Протечка под мойкой",
        titleEn: "Leak under kitchen sink",
        addressRu: "JVC · District 12",
        addressEn: "JVC · District 12",
        status: "DISPATCHED",
        priority: "HIGH",
        technicianId: owner.id,
        scheduledStart: new Date(now + 60 * 60 * 1000),
        scheduledEnd: new Date(now + 150 * 60 * 1000),
        amountMinor: 42_000,
        slaMinutes: 52,
        version: 3,
        createdBy: owner.id,
        updatedBy: owner.id,
      },
      {
        organizationId: organization.id,
        number: 1046,
        clientName: "Nadia Karim",
        clientPhone: "+971 52 110 9230",
        titleRu: "Диагностика стиральной машины",
        titleEn: "Washing machine diagnostics",
        addressRu: "Business Bay · Merano Tower",
        addressEn: "Business Bay · Merano Tower",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        technicianId: owner.id,
        scheduledStart: new Date(now + 3 * 60 * 60 * 1000),
        scheduledEnd: new Date(now + 5 * 60 * 60 * 1000),
        amountMinor: 21_000,
        version: 5,
        createdBy: owner.id,
        updatedBy: owner.id,
      },
    ]);
  }

  console.info(`Seed complete for ${organization.slug}; owner: ${owner.email}`);
}

seed().catch((error: unknown) => {
  // EN: Fail the deployment command clearly without printing configured credentials.
  // RU: Явно завершает deployment-команду с ошибкой, не выводя настроенные учётные данные.
  console.error("FlowDesk seed failed", error);
  process.exitCode = 1;
});
