import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { authRateLimits } from "@/db/schema";
import { ApiError, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";

const WINDOW_MILLISECONDS = 15 * 60 * 1000;
const BLOCK_MILLISECONDS = 15 * 60 * 1000;

type RateLimitBucket = {
  keyHash: string;
  maxFailures: number;
  kind: "account" | "network";
};

async function rateLimitBuckets(email: string, request: Request): Promise<RateLimitBucket[]> {
  // EN: Build independent privacy-protected account and trusted-network throttling buckets.
  // RU: Создаёт независимые защищённые buckets для аккаунта и доверенного сетевого адреса.
  const normalizedEmail = email.trim().toLowerCase();
  const address = getClientAddress(request);
  return [
    { keyHash: await hashPrivateIdentifier(`login-account|${normalizedEmail}`), maxFailures: 5, kind: "account" },
    { keyHash: await hashPrivateIdentifier(`login-network|${address}`), maxFailures: 20, kind: "network" },
  ];
}

export async function assertLoginAllowed(email: string, request: Request): Promise<void> {
  // EN: Reject login when either the account or network bucket is currently blocked.
  // RU: Отклоняет вход, если заблокирован account- или network-bucket.
  const buckets = await rateLimitBuckets(email, request);
  const records = await getDb().select().from(authRateLimits).where(inArray(authRateLimits.keyHash, buckets.map((bucket) => bucket.keyHash)));
  const blockedUntil = records.reduce<Date | null>((latest, record) => {
    if (!record.blockedUntil || record.blockedUntil <= new Date()) return latest;
    return !latest || record.blockedUntil > latest ? record.blockedUntil : latest;
  }, null);
  if (blockedUntil) {
    const retryAfterSeconds = Math.ceil((blockedUntil.getTime() - Date.now()) / 1000);
    throw new ApiError(429, "LOGIN_RATE_LIMITED", "Too many sign-in attempts. Try again later.", { retryAfterSeconds });
  }
}

export async function recordLoginFailure(email: string, request: Request): Promise<void> {
  // EN: Atomically increment both buckets so concurrent attempts cannot lose failure counts.
  // RU: Атомарно увеличивает оба bucket, чтобы параллельные попытки не теряли счётчик ошибок.
  const buckets = await rateLimitBuckets(email, request);
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - WINDOW_MILLISECONDS);
  const blockedUntil = new Date(now.getTime() + BLOCK_MILLISECONDS);
  await getDb().transaction(async (transaction) => {
    // EN: Commit account and network throttling changes together.
    // RU: Фиксирует изменения account- и network-throttling в одной транзакции.
    for (const bucket of buckets) {
      const nextFailures = sql<number>`case when ${authRateLimits.windowStartedAt} < ${windowCutoff} then 1 else ${authRateLimits.failures} + 1 end`;
      await transaction.insert(authRateLimits).values({
        keyHash: bucket.keyHash,
        failures: 1,
        windowStartedAt: now,
        blockedUntil: null,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: authRateLimits.keyHash,
        set: {
          failures: nextFailures,
          windowStartedAt: sql`case when ${authRateLimits.windowStartedAt} < ${windowCutoff} then ${now} else ${authRateLimits.windowStartedAt} end`,
          blockedUntil: sql`case when ${nextFailures} >= ${bucket.maxFailures} then ${blockedUntil} else ${authRateLimits.blockedUntil} end`,
          updatedAt: now,
        },
      });
    }
  });
}

export async function clearLoginFailures(email: string, request: Request): Promise<void> {
  // EN: Clear only the successful account bucket while preserving network abuse pressure.
  // RU: Очищает только успешный account-bucket, сохраняя защиту от сетевого abuse.
  const [accountBucket] = await rateLimitBuckets(email, request);
  await getDb().delete(authRateLimits).where(eq(authRateLimits.keyHash, accountBucket.keyHash));
}
