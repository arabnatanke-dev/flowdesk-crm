import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withRequestDatabase } from "@/db";
import { memberships, organizations, users } from "@/db/schema";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "@/src/server/auth/rate-limit";
import { createSession } from "@/src/server/auth/session";
import { ApiError, apiErrorResponse, assertSameOrigin } from "@/src/server/http/api";
import { hashPassword, verifyPassword } from "@/src/server/security/crypto";

const loginSchema = z.object({
  email: z.email().max(320).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
  remember: z.boolean().default(false),
  returnTo: z.string().max(500).nullable().default(null),
});

function resolveAuthorizedRedirect(orgSlug: string, returnTo: string | null): string {
  // EN: Accept only relative destinations inside the organization proven during authentication.
  // RU: Принимает только относительные адреса внутри организации, подтверждённой при входе.
  if (returnTo?.startsWith(`/app/${orgSlug}/`) || returnTo === `/m/${orgSlug}` || returnTo?.startsWith(`/m/${orgSlug}/`)) {
    return returnTo;
  }
  return `/app/${orgSlug}/dashboard`;
}

export async function POST(request: Request): Promise<NextResponse> {
  // EN: Authenticate credentials, create a server session, and return only an authorized tenant route.
  // RU: Проверяет учётные данные, создаёт серверную сессию и возвращает только разрешённый tenant-route.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);
      const parsed = loginSchema.safeParse(await request.json());
      if (!parsed.success) throw new ApiError(400, "INVALID_LOGIN_INPUT", "Enter a valid email and password.");
      const { email, password, remember, returnTo } = parsed.data;
      await assertLoginAllowed(database, email, request);

      const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
      const passwordMatches = user?.isActive
        ? await verifyPassword(password, user.passwordHash)
        : (await hashPassword(password), false);
      if (!user || !passwordMatches) {
        await recordLoginFailure(database, email, request);
        throw new ApiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
      }

      const [tenant] = await database
        .select({ slug: organizations.slug })
        .from(memberships)
        .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
        .where(and(eq(memberships.userId, user.id), eq(memberships.isActive, true), eq(organizations.isActive, true)))
        .limit(1);
      if (!tenant) throw new ApiError(403, "NO_ACTIVE_TENANT", "This account has no active organization membership.");

      await clearLoginFailures(database, email, request);
      await createSession(database, user.id, remember, request);
      return NextResponse.json({ redirectTo: resolveAuthorizedRedirect(tenant.slug, returnTo) });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
