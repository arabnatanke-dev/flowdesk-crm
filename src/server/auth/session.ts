import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { createOpaqueToken, hashPrivateIdentifier, sha256Hex } from "@/src/server/security/crypto";
import { getClientAddress } from "@/src/server/http/api";

export const SESSION_COOKIE_NAME = "flowdesk_session";
const SHORT_SESSION_MILLISECONDS = 12 * 60 * 60 * 1000;
const REMEMBERED_SESSION_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;

export type SessionIdentity = {
  userId: string;
  email: string;
  displayName: string;
  expiresAt: Date;
};

export async function createSession(userId: string, remember: boolean, request: Request): Promise<void> {
  // EN: Persist an opaque session digest and send the raw token only through a protected cookie.
  // RU: Сохраняет digest непрозрачной сессии, а исходный токен передаёт только в защищённой cookie.
  const token = createOpaqueToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + (remember ? REMEMBERED_SESSION_MILLISECONDS : SHORT_SESSION_MILLISECONDS));
  const ipHash = await hashPrivateIdentifier(getClientAddress(request));
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (previousToken) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256Hex(previousToken)));
  await getDb().insert(sessions).values({
    tokenHash,
    userId,
    expiresAt,
    ipHash,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  // EN: Resolve the current active user from a non-expired server-side session.
  // RU: Определяет текущего активного пользователя по неистёкшей серверной сессии.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const [record] = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()), eq(users.isActive, true)))
    .limit(1);
  if (!record) return null;
  await getDb().update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
  return record;
}

export async function destroySession(): Promise<void> {
  // EN: Revoke the current server session before clearing its browser cookie.
  // RU: Отзывает текущую серверную сессию до удаления её browser-cookie.
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256Hex(token)));
  cookieStore.delete(SESSION_COOKIE_NAME);
}
