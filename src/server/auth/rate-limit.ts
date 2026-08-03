import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authRateLimits } from "@/db/schema";
import { ApiError, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";

const WINDOW_MILLISECONDS = 15 * 60 * 1000;
const BLOCK_MILLISECONDS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

async function rateLimitKey(email: string, request: Request): Promise<string> {
  // EN: Combine normalized account and network identifiers without storing either value directly.
  // RU: Объединяет нормализованный аккаунт и сетевой идентификатор без хранения исходных значений.
  return hashPrivateIdentifier(`${email.trim().toLowerCase()}|${getClientAddress(request)}`);
}

export async function assertLoginAllowed(email: string, request: Request): Promise<void> {
  // EN: Stop credential attempts while the account-and-address bucket is temporarily blocked.
  // RU: Останавливает попытки входа, пока bucket аккаунта и адреса временно заблокирован.
  const keyHash = await rateLimitKey(email, request);
  const [record] = await getDb().select().from(authRateLimits).where(eq(authRateLimits.keyHash, keyHash)).limit(1);
  if (record?.blockedUntil && record.blockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil.getTime() - Date.now()) / 1000);
    throw new ApiError(429, "LOGIN_RATE_LIMITED", "Too many sign-in attempts. Try again later.", { retryAfterSeconds });
  }
}

export async function recordLoginFailure(email: string, request: Request): Promise<void> {
  // EN: Increment a bounded failure window and introduce a temporary block after repeated failures.
  // RU: Увеличивает счётчик в ограниченном окне и включает временную блокировку после повторных ошибок.
  const keyHash = await rateLimitKey(email, request);
  const now = new Date();
  const [record] = await getDb().select().from(authRateLimits).where(eq(authRateLimits.keyHash, keyHash)).limit(1);
  const withinWindow = record && now.getTime() - record.windowStartedAt.getTime() < WINDOW_MILLISECONDS;
  const failures = withinWindow ? record.failures + 1 : 1;
  const values = {
    failures,
    windowStartedAt: withinWindow ? record.windowStartedAt : now,
    blockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + BLOCK_MILLISECONDS) : null,
    updatedAt: now,
  };
  await getDb().insert(authRateLimits).values({ keyHash, ...values }).onConflictDoUpdate({
    target: authRateLimits.keyHash,
    set: values,
  });
}

export async function clearLoginFailures(email: string, request: Request): Promise<void> {
  // EN: Clear the throttling bucket after a successful credential verification.
  // RU: Очищает throttling-bucket после успешной проверки учётных данных.
  await getDb().delete(authRateLimits).where(eq(authRateLimits.keyHash, await rateLimitKey(email, request)));
}
