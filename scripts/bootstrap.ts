import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index";
import { memberships, organizations, organizationSequences, users } from "../db/schema";
import { hashPassword } from "../src/server/security/crypto";
import { bootstrapEnvironmentSchema } from "./environment";

async function bootstrap(): Promise<void> {
  // EN: Create the initial tenant and owner only when absent, without modifying existing credentials or activation state.
  // RU: Создаёт первый tenant и owner только при отсутствии, не меняя существующие credentials или activation state.
  const environment = bootstrapEnvironmentSchema.parse(process.env);
  const db = getDb();
  let [organization] = await db.select().from(organizations).where(eq(organizations.slug, environment.SEED_ORG_SLUG)).limit(1);
  if (!organization) {
    [organization] = await db.insert(organizations).values({ slug: environment.SEED_ORG_SLUG, name: environment.SEED_ORG_NAME }).returning();
  }

  let [owner] = await db.select().from(users).where(eq(users.email, environment.SEED_ADMIN_EMAIL)).limit(1);
  if (!owner) {
    [owner] = await db.insert(users).values({
      email: environment.SEED_ADMIN_EMAIL,
      displayName: environment.SEED_ADMIN_NAME,
      passwordHash: await hashPassword(environment.SEED_ADMIN_PASSWORD),
    }).returning();
  }

  await db.insert(memberships).values({ organizationId: organization.id, userId: owner.id, role: "OWNER" }).onConflictDoNothing();
  await db.insert(organizationSequences).values({ organizationId: organization.id, nextWorkOrderNumber: 1001 }).onConflictDoNothing();
  console.info(`Bootstrap complete for ${organization.slug}; owner: ${owner.email}`);
}

bootstrap().catch((error: unknown) => {
  // EN: Fail provisioning clearly without printing configured passwords.
  // RU: Явно завершает provisioning с ошибкой, не выводя настроенные пароли.
  console.error("FlowDesk bootstrap failed", error);
  process.exitCode = 1;
});
