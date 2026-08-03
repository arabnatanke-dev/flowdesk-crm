import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index";
import { sessions, users } from "../db/schema";
import { hashPassword } from "../src/server/security/crypto";
import { resetPasswordEnvironmentSchema } from "./environment";

async function resetAdminPassword(): Promise<void> {
  // EN: Explicitly reset one existing administrator password and revoke all of that user's sessions.
  // RU: Явно сбрасывает пароль существующего администратора и отзывает все его сессии.
  const environment = resetPasswordEnvironmentSchema.parse(process.env);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, environment.SEED_ADMIN_EMAIL)).limit(1);
  if (!user) throw new Error("Administrator account not found; run db:bootstrap first.");
  await db.transaction(async (transaction) => {
    // EN: Commit password replacement and session revocation together.
    // RU: Атомарно фиксирует замену пароля и отзыв сессий.
    await transaction.update(users).set({
      passwordHash: await hashPassword(environment.SEED_ADMIN_PASSWORD),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    await transaction.delete(sessions).where(eq(sessions.userId, user.id));
  });
  console.info(`Password reset complete for ${user.email}; all sessions revoked.`);
}

resetAdminPassword().catch((error: unknown) => {
  // EN: Fail the explicit reset command without printing the replacement password.
  // RU: Завершает явную reset-команду с ошибкой, не выводя новый пароль.
  console.error("FlowDesk password reset failed", error);
  process.exitCode = 1;
});
