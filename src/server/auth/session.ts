import { and, eq, gt, lt, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { createOpaqueToken, hashPrivateIdentifier, sha256Hex } from "@/src/server/security/crypto";
import { ApiError, getClientAddress } from "@/src/server/http/api";

export const SESSION_COOKIE_NAME = "__Host-flowdesk_session";
const SHORT_SESSION_MILLISECONDS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MILLISECONDS = 30 * 60 * 1000;
const ROTATION_INTERVAL_MILLISECONDS = 15 * 60 * 1000;

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

export async function createSession(userId: string, remember: boolean, request: Request): Promise<void> {
  // EN: Persist an opaque session digest and send the raw token only through a protected host cookie.
  // RU: Сохраняет digest непрозрачной сессии, а исходный токен передаёт только в защищённой host-cookie.
  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (remember ? REMEMBERED_SESSION_MILLISECONDS : SHORT_SESSION_MILLISECONDS));
  const ipHash = await hashPrivateIdentifier(getClientAddress(request));
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (previousToken) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256Hex(previousToken)));
  await getDb().insert(sessions).values({
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

export async function resolveSessionToken(token: string, allowRotation = true): Promise<ResolvedSession | null> {
  // EN: Enforce absolute and idle expiry, clean stale records, and rotate long-lived opaque tokens.
  // RU: Проверяет абсолютный и idle expiry, очищает устаревшие записи и ротирует долгоживущие opaque-токены.
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_TIMEOUT_MILLISECONDS);
  const tokenHash = await sha256Hex(token);
  await getDb().delete(sessions).where(or(lt(sessions.expiresAt, now), lt(sessions.lastSeenAt, idleCutoff)));
  const [record] = await getDb()
    .select({
      sessionId: sessions.id,
      tokenHash: sessions.tokenHash,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
      rotatedAt: sessions.rotatedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(
      eq(sessions.tokenHash, tokenHash),
      gt(sessions.expiresAt, now),
      gt(sessions.lastSeenAt, idleCutoff),
      eq(users.isActive, true),
    ))
    .limit(1);
  if (!record) return null;

  let rotatedToken: string | null = null;
  const shouldRotate = allowRotation && now.getTime() - record.rotatedAt.getTime() >= ROTATION_INTERVAL_MILLISECONDS;
  if (shouldRotate) {
    const candidateToken = createOpaqueToken();
    const [rotated] = await getDb().update(sessions).set({
      tokenHash: await sha256Hex(candidateToken),
      rotatedAt: now,
      lastSeenAt: now,
    }).where(and(eq(sessions.id, record.sessionId), eq(sessions.tokenHash, record.tokenHash))).returning({ id: sessions.id });
    if (rotated) rotatedToken = candidateToken;
  } else {
    await getDb().update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, record.sessionId));
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

export async function requireSessionToken(token: string): Promise<SessionIdentity> {
  // EN: Convert an expired or revoked opaque token to the same non-enumerating 401 contract.
  // RU: Преобразует expired или revoked opaque-токен в единый нераскрывающий 401-контракт.
  const resolved = await resolveSessionToken(token, false);
  if (!resolved) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  return resolved.identity;
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  // EN: Resolve the current browser cookie and persist a rotated token when required.
  // RU: Проверяет текущую browser-cookie и сохраняет ротированный токен при необходимости.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const resolved = await resolveSessionToken(token);
  if (!resolved) {
    await clearSessionCookie();
    return null;
  }
  if (resolved.rotatedToken) await setSessionCookie(resolved.rotatedToken, resolved.identity.expiresAt);
  return resolved.identity;
}

export async function listActiveSessions(): Promise<ActiveSession[]> {
  // EN: List non-expired sessions for the authenticated user without exposing token digests.
  // RU: Возвращает неистёкшие сессии авторизованного пользователя без раскрытия token digests.
  const identity = await getSessionIdentity();
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!identity || !currentToken) return [];
  const currentHash = await sha256Hex(currentToken);
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - IDLE_TIMEOUT_MILLISECONDS);
  const records = await getDb().select({
    id: sessions.id,
    tokenHash: sessions.tokenHash,
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
    isCurrent: record.tokenHash === currentHash,
  }));
}

export async function destroySession(): Promise<void> {
  // EN: Revoke the current server session before clearing its browser cookie.
  // RU: Отзывает текущую серверную сессию до удаления её browser-cookie.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256Hex(token)));
  await clearSessionCookie();
}

export async function destroyAllSessions(): Promise<boolean> {
  // EN: Revoke every session owned by the current authenticated user and clear the current cookie.
  // RU: Отзывает все сессии текущего авторизованного пользователя и удаляет текущую cookie.
  const identity = await getSessionIdentity();
  if (!identity) return false;
  await getDb().delete(sessions).where(eq(sessions.userId, identity.userId));
  await clearSessionCookie();
  return true;
}
