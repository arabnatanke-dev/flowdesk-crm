import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import { canUpdateSettings } from "@/src/server/auth/permissions";
import type { TenantContext } from "@/src/server/auth/tenant";
import { ApiError } from "@/src/server/http/api";

export type OrganizationSettings = {
  name: string;
  defaultLocale: "ru" | "en";
  timezone: string;
  currency: string;
  taxRateBps: number;
  version: number;
};

export type UpdateOrganizationSettings = Omit<OrganizationSettings, "version"> & { expectedVersion: number };

export async function updateOrganizationSettings(
  context: TenantContext,
  input: UpdateOrganizationSettings,
  ipHash: string | null,
): Promise<OrganizationSettings> {
  // EN: Persist authorized tenant defaults with optimistic concurrency and a complete audit snapshot.
  // RU: Сохраняет разрешённые tenant-настройки с optimistic concurrency и полным audit-снимком.
  if (!canUpdateSettings(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot update organization settings.");
  return getDb().transaction(async (transaction) => {
    // EN: Commit the settings version and its audit snapshot together.
    // RU: Фиксирует версию настроек и её audit-снимок в одной транзакции.
    const [updated] = await transaction.update(organizations).set({
      name: input.name.trim(),
      defaultLocale: input.defaultLocale,
      timezone: input.timezone,
      currency: input.currency,
      taxRateBps: input.taxRateBps,
      settingsVersion: input.expectedVersion + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(organizations.id, context.organization.id),
      eq(organizations.settingsVersion, input.expectedVersion),
    )).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "Settings changed. Refresh and try again.");

    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "organization.settings_updated",
      entityType: "organization",
      entityId: context.organization.id,
      before: {
        name: context.organization.name,
        defaultLocale: context.organization.defaultLocale,
        timezone: context.organization.timezone,
        currency: context.organization.currency,
        taxRateBps: context.organization.taxRateBps,
        version: context.organization.settingsVersion,
      },
      after: {
        name: updated.name,
        defaultLocale: updated.defaultLocale,
        timezone: updated.timezone,
        currency: updated.currency,
        taxRateBps: updated.taxRateBps,
        version: updated.settingsVersion,
      },
      ipHash,
    });
    return {
      name: updated.name,
      defaultLocale: updated.defaultLocale as "ru" | "en",
      timezone: updated.timezone,
      currency: updated.currency,
      taxRateBps: updated.taxRateBps,
      version: updated.settingsVersion,
    };
  });
}
