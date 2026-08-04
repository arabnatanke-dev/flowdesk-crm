import { and, eq } from "drizzle-orm";
import type { FlowDeskDatabase } from "@/db";
import { auditLogs, technicianProfiles, users } from "@/db/schema";
import type { TenantContext } from "@/src/server/auth/tenant";
import { ApiError } from "@/src/server/http/api";

export type UserProfile = {
  displayName: string;
};

export type UpdateCurrentUserProfileInput = {
  displayName: string;
};

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function updateCurrentUserProfile(
  database: FlowDeskDatabase,
  context: TenantContext,
  input: UpdateCurrentUserProfileInput,
  ipHash: string | null,
): Promise<UserProfile> {
  // EN: Update only the authenticated user's profile and keep the tenant audit trail atomic.
  // RU: Обновляет только профиль авторизованного пользователя и атомарно сохраняет tenant-аудит.
  const displayName = normalizeDisplayName(input.displayName);

  if (displayName.length < 2 || displayName.length > 120) {
    throw new ApiError(
      400,
      "INVALID_DISPLAY_NAME",
      "Display name must contain between 2 and 120 characters.",
    );
  }

  return database.transaction(async (transaction) => {
    const [currentUser] = await transaction
      .select({
        id: users.id,
        displayName: users.displayName,
      })
      .from(users)
      .where(and(
        eq(users.id, context.session.userId),
        eq(users.isActive, true),
      ))
      .limit(1);

    if (!currentUser) {
      throw new ApiError(404, "USER_NOT_FOUND", "Active user not found.");
    }

    if (currentUser.displayName === displayName) {
      return { displayName };
    }

    const now = new Date();

    const [updatedUser] = await transaction
      .update(users)
      .set({
        displayName,
        updatedAt: now,
      })
      .where(and(
        eq(users.id, context.session.userId),
        eq(users.isActive, true),
      ))
      .returning({
        id: users.id,
        displayName: users.displayName,
      });

    if (!updatedUser) {
      throw new ApiError(409, "PROFILE_UPDATE_CONFLICT", "Profile changed. Refresh and try again.");
    }

    // EN: Keep a technician's operational display name synchronized with the account profile.
    // RU: Синхронизирует рабочее имя мастера с именем его пользовательского аккаунта.
    await transaction
      .update(technicianProfiles)
      .set({
        displayName,
        updatedAt: now,
      })
      .where(and(
        eq(technicianProfiles.organizationId, context.organization.id),
        eq(technicianProfiles.userId, context.session.userId),
      ));

    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "user.profile_updated",
      entityType: "user",
      entityId: updatedUser.id,
      before: {
        displayName: currentUser.displayName,
      },
      after: {
        displayName: updatedUser.displayName,
      },
      ipHash,
    });

    return {
      displayName: updatedUser.displayName,
    };
  });
}
