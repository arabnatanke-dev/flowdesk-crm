import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { withRequestDatabase } from "../db/index";
import { memberships, organizations, organizationSequences, users, workOrders } from "../db/schema";
import { hashPassword } from "../src/server/security/crypto";
import { demoEnvironmentSchema } from "./environment";

async function seedDemo(): Promise<void> {
  // EN: Add non-destructive demo technician and work-order fixtures after bootstrap provisioning.
  // RU: Добавляет неразрушающие demo-данные техника и заявок после bootstrap provisioning.
  const environment = demoEnvironmentSchema.parse(process.env);
  await withRequestDatabase(async (database) => {
  const [organization] = await database.select().from(organizations).where(eq(organizations.slug, environment.SEED_ORG_SLUG)).limit(1);
  const [owner] = await database.select().from(users).where(eq(users.email, environment.SEED_ADMIN_EMAIL)).limit(1);
  if (!organization || !owner) throw new Error("Run npm run db:bootstrap before db:seed-demo.");

  let [technician] = await database.select().from(users).where(eq(users.email, environment.DEMO_TECHNICIAN_EMAIL)).limit(1);
  if (!technician) {
    [technician] = await database.insert(users).values({
      email: environment.DEMO_TECHNICIAN_EMAIL,
      displayName: environment.DEMO_TECHNICIAN_NAME,
      passwordHash: await hashPassword(environment.DEMO_TECHNICIAN_PASSWORD),
    }).returning();
  }
  await database.insert(memberships).values({ organizationId: organization.id, userId: technician.id, role: "TECHNICIAN" }).onConflictDoNothing();
  await database.insert(organizationSequences).values({ organizationId: organization.id, nextWorkOrderNumber: 1049 }).onConflictDoUpdate({
    target: organizationSequences.organizationId,
    set: { nextWorkOrderNumber: sql`greatest(${organizationSequences.nextWorkOrderNumber}, 1049)`, updatedAt: new Date() },
  });

  const now = Date.now();
  await database.insert(workOrders).values([
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
      technicianId: technician.id,
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
      technicianId: technician.id,
      scheduledStart: new Date(now + 3 * 60 * 60 * 1000),
      scheduledEnd: new Date(now + 5 * 60 * 60 * 1000),
      amountMinor: 21_000,
      version: 5,
      createdBy: owner.id,
      updatedBy: owner.id,
    },
  ]).onConflictDoNothing({ target: [workOrders.organizationId, workOrders.number] });

  const [membership] = await database.select().from(memberships).where(and(
    eq(memberships.organizationId, organization.id),
    eq(memberships.userId, technician.id),
  )).limit(1);
  if (!membership || membership.role !== "TECHNICIAN" || !membership.isActive) {
    throw new Error("Demo user already has a conflicting or inactive membership; resolve it explicitly.");
  }
  console.info(`Demo seed complete for ${organization.slug}; technician: ${technician.email}`);
  });
}

seedDemo().catch((error: unknown) => {
  // EN: Fail demo seeding without modifying owner credentials.
  // RU: Завершает demo-seeding с ошибкой без изменения owner credentials.
  console.error("FlowDesk demo seed failed", error);
  process.exitCode = 1;
});
