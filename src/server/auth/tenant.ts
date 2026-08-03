import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { memberships, organizations } from "@/db/schema";
import { getSessionIdentity, type SessionIdentity } from "./session";
import type { MembershipRole } from "./permissions";
import { ApiError } from "@/src/server/http/api";

export type TenantContext = {
  session: SessionIdentity;
  organization: {
    id: string;
    slug: string;
    name: string;
    defaultLocale: string;
    timezone: string;
    currency: string;
    taxRateBps: number;
    settingsVersion: number;
  };
  role: MembershipRole;
};

export async function resolveTenantMembership(orgSlug: string, session: SessionIdentity): Promise<TenantContext | null> {
  // EN: Query an active membership using both the authenticated user and requested organization slug.
  // RU: Ищет активное членство одновременно по пользователю сессии и запрошенному slug организации.
  const [membership] = await getDb()
    .select({
      organization: {
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        defaultLocale: organizations.defaultLocale,
        timezone: organizations.timezone,
        currency: organizations.currency,
        taxRateBps: organizations.taxRateBps,
        settingsVersion: organizations.settingsVersion,
      },
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(
      eq(memberships.userId, session.userId),
      eq(memberships.isActive, true),
      eq(organizations.slug, orgSlug),
      eq(organizations.isActive, true),
    ))
    .limit(1);
  return membership ? { session, organization: membership.organization, role: membership.role } : null;
}

export async function resolveTenantContext(orgSlug: string): Promise<TenantContext | null> {
  // EN: Prove the session user has an active membership in the requested active organization.
  // RU: Подтверждает активное членство пользователя сессии в запрошенной активной организации.
  const session = await getSessionIdentity();
  return session ? resolveTenantMembership(orgSlug, session) : null;
}

export async function requireTenantPageContext(orgSlug: string, returnTo = `/app/${orgSlug}/dashboard`): Promise<TenantContext> {
  // EN: Redirect anonymous visitors and conceal organizations from non-members on protected pages.
  // RU: Перенаправляет анонимных посетителей и скрывает организации от посторонних на защищённых страницах.
  const session = await getSessionIdentity();
  if (!session) redirect(`/?returnTo=${encodeURIComponent(returnTo)}`);
  const context = await resolveTenantMembership(orgSlug, session);
  if (!context) notFound();
  return context;
}

export async function requireTenantApiContext(orgSlug: string): Promise<TenantContext> {
  // EN: Return explicit API errors without revealing whether another tenant exists.
  // RU: Возвращает явные API-ошибки, не раскрывая существование чужой организации.
  const session = await getSessionIdentity();
  if (!session) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  const context = await resolveTenantMembership(orgSlug, session);
  if (!context) throw new ApiError(404, "TENANT_NOT_FOUND", "Organization not found.");
  return context;
}

export async function getDefaultTenantSlug(): Promise<string | null> {
  // EN: Find one active organization for an already authenticated user without exposing other memberships.
  // RU: Находит одну активную организацию уже авторизованного пользователя, не раскрывая другие memberships.
  const session = await getSessionIdentity();
  if (!session) return null;
  const [tenant] = await getDb()
    .select({ slug: organizations.slug })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(and(
      eq(memberships.userId, session.userId),
      eq(memberships.isActive, true),
      eq(organizations.isActive, true),
    ))
    .limit(1);
  return tenant?.slug ?? null;
}
