import { and, eq, gt, lt, or } from "drizzle-orm";
import { cookies } from "next/headers";
import type { FlowDeskDatabase } from "@/db";
import { sessions, users } from "@/db/schema";
import { createOpaqueToken, hashPrivateIdentifier, sha256Hex } from "@/src/server/security/crypto";
import { ApiError, getClientAddress } from "@/src/server/http/api";

export const SESSION_COOKIE_NAME = "__Host-flowdesk_session";
const SHORT_SESSION_MILLISECONDS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MILLISECONDS = 30 * 60 * 1000;
const ROTATION_INTERVAL_MILLISECONDS = 15 * 60 * 1000;
const ROTATION_GRACE_MILLISECONDS = 60 * 1000;

export type SessionIdentity = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  expiresAt: Date;
};

export type ActiveSession = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  isCurrent: boolean;
};

type ResolvedSession = {
  identity: SessionIdentity;
  rotatedToken: string | null;
};

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  // EN: Set a host-only cookie that browsers accept only over secure connections and for the root path.
  // RU: Устанавливает host-only cookie, принимаемую браузером только по защищённому соединению и для root path.
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function clearSessionCookie(): Promise<void> {
  // EN: Expire the host-prefixed cookie with the same security attributes required for its creation.
  // RU: Удаляет host-prefixed cookie с теми же security attributes, которые обязательны при создании.
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function createSession(database: FlowDeskDatabase, userId: string, remember: boolean, request: Request): Promise<void> {
  // EN: Persist an opaque session digest and send the raw token only through a protected host cookie.
  // RU: Сохраняет digest непрозрачной сессии, а исходный токен передаёт только в защищённой host-cookie.
  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (remember ? REMEMBERED_SESSION_MILLISECONDS : SHORT_SESSION_MILLISECONDS));
  const ipHash = await hashPrivateIdentifier(getClientAddress(request));
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (previousToken) {
    const previousTokenHash = await sha256Hex(previousToken);
    await database.delete(sessions).where(or(
      eq(sessions.tokenHash, previousTokenHash),
      and(eq(sessions.previousTokenHash, previousTokenHash), gt(sessions.previousTokenValidUntil, now)),
    ));
  }
  await database.insert(sessions).values({
    tokenHash,
    userId,
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
    rotatedAt: now,
    ipHash,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });
  await setSessionCookie(token, expiresAt);
}

export async function resolveSessionToken(database: FlowDeskDatabase, token: string, allowRotation = true): Promise<ResolvedSession | null> {
  // EN: Enforce expiry and rotate tokens while accepting the previous digest briefly for concurrent requests.
  // RU: Проверяет expiry и ротирует токены, кратко принимая предыдущий digest для конкурентных запросов.
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_TIMEOUT_MILLISECONDS);
  const tokenHash = await sha256Hex(token);
  await database.delete(sessions).where(or(lt(sessions.expiresAt, now), lt(sessions.lastSeenAt, idleCutoff)));
  const [record] = await database
    .select({
      sessionId: sessions.id,
      tokenHash: sessions.tokenHash,
      previousTokenHash: sessions.previousTokenHash,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
      rotatedAt: sessions.rotatedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(
      or(
        eq(sessions.tokenHash, tokenHash),
        and(eq(sessions.previousTokenHash, tokenHash), gt(sessions.previousTokenValidUntil, now)),
      ),
      gt(sessions.expiresAt, now),
      gt(sessions.lastSeenAt, idleCutoff),
      eq(users.isActive, true),
    ))
    .limit(1);
  if (!record) return null;

  let rotatedToken: string | null = null;
  const matchedPreviousToken = record.tokenHash !== tokenHash && record.previousTokenHash === tokenHash;
  const shouldRotate = allowRotation
    && !matchedPreviousToken
    && now.getTime() - record.rotatedAt.getTime() >= ROTATION_INTERVAL_MILLISECONDS;
  if (shouldRotate) {
    const candidateToken = createOpaqueToken();
    const [rotated] = await database.update(sessions).set({
      tokenHash: await sha256Hex(candidateToken),
      previousTokenHash: record.tokenHash,
      previousTokenValidUntil: new Date(now.getTime() + ROTATION_GRACE_MILLISECONDS),
      rotatedAt: now,
      lastSeenAt: now,
    }).where(and(eq(sessions.id, record.sessionId), eq(sessions.tokenHash, record.tokenHash))).returning({ id: sessions.id });
    if (rotated) rotatedToken = candidateToken;
  } else {
    await database.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, record.sessionId));
  }
  return {
    identity: {
      sessionId: record.sessionId,
      userId: record.userId,
      email: record.email,
      displayName: record.displayName,
      expiresAt: record.expiresAt,
    },
    rotatedToken,
  };
}

export async function requireSessionToken(database: FlowDeskDatabase, token: string): Promise<SessionIdentity> {
  // EN: Convert an expired or revoked opaque token to the same non-enumerating 401 contract.
  // RU: Преобразует expired или revoked opaque-токен в единый нераскрывающий 401-контракт.
  const resolved = await resolveSessionToken(database, token, false);
  if (!resolved) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  return resolved.identity;
}

export async function getSessionIdentity(database: FlowDeskDatabase): Promise<SessionIdentity | null> {
  // EN: Resolve a session during server rendering without rotating or clearing its browser cookie.
  // RU: Проверяет сессию во время server render без ротации или очистки browser-cookie.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const resolved = await resolveSessionToken(database, token, false);
  return resolved?.identity ?? null;
}

export async function getRouteSessionIdentity(database: FlowDeskDatabase): Promise<SessionIdentity | null> {
  // EN: Rotate or clear a session cookie only from a Route Handler mutation-capable context.
  // RU: Ротирует или очищает session-cookie только из Route Handler, где разрешена cookie mutation.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const resolved = await resolveSessionToken(database, token, true);
  if (!resolved) {
    await clearSessionCookie();
    return null;
  }
  if (resolved.rotatedToken) await setSessionCookie(resolved.rotatedToken, resolved.identity.expiresAt);
  return resolved.identity;
}

export async function listActiveSessions(database: FlowDeskDatabase): Promise<ActiveSession[]> {
  // EN: List non-expired sessions for the authenticated user without exposing token digests.
  // RU: Возвращает неистёкшие сессии авторизованного пользователя без раскрытия token digests.
  const identity = await getRouteSessionIdentity(database);
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!identity || !currentToken) return [];
  const currentHash = await sha256Hex(currentToken);
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_TIMEOUT_MILLISECONDS);
  const records = await database.select({
    id: sessions.id,
    tokenHash: sessions.tokenHash,
    previousTokenHash: sessions.previousTokenHash,
    previousTokenValidUntil: sessions.previousTokenValidUntil,
    createdAt: sessions.createdAt,
    lastSeenAt: sessions.lastSeenAt,
    expiresAt: sessions.expiresAt,
    userAgent: sessions.userAgent,
  }).from(sessions).where(and(
    eq(sessions.userId, identity.userId),
    gt(sessions.expiresAt, now),
    gt(sessions.lastSeenAt, idleCutoff),
  ));
  return records.map((record) => ({
    id: record.id,
    createdAt: record.createdAt,
    lastSeenAt: record.lastSeenAt,
    expiresAt: record.expiresAt,
    userAgent: record.userAgent,
    isCurrent: record.tokenHash === currentHash
      || (record.previousTokenHash === currentHash && Boolean(record.previousTokenValidUntil && record.previousTokenValidUntil > now)),
  }));
}

export async function destroySession(database: FlowDeskDatabase): Promise<void> {
  // EN: Revoke the current server session before clearing its browser cookie.
  // RU: Отзывает текущую серверную сессию до удаления её browser-cookie.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = await sha256Hex(token);
    const now = new Date();
    await database.delete(sessions).where(or(
      eq(sessions.tokenHash, tokenHash),
      and(eq(sessions.previousTokenHash, tokenHash), gt(sessions.previousTokenValidUntil, now)),
    ));
  }
  await clearSessionCookie();
}

export async function destroyAllSessions(database: FlowDeskDatabase): Promise<boolean> {
  // EN: Revoke every session owned by the current authenticated user and clear the current cookie.
  // RU: Отзывает все сессии текущего авторизованного пользователя и удаляет текущую cookie.
  const identity = await getRouteSessionIdentity(database);
  if (!identity) return false;
  await database.delete(sessions).where(eq(sessions.userId, identity.userId));
  await clearSessionCookie();
  return true;
}
