import { NextResponse } from "next/server";
import { z } from "zod";
import { withRequestDatabase } from "@/db";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { updateCurrentUserProfile } from "@/src/server/profile/service";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";

const profileSchema = z.object({
  orgSlug: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(2).max(120),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  // EN: Validate and update only the authenticated user's profile.
  // RU: Валидирует и обновляет только профиль авторизованного пользователя.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);

      const parsed = profileSchema.safeParse(await request.json());

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_PROFILE",
              message: "Check the profile fields.",
              details: parsed.error.flatten(),
            },
          },
          { status: 400 },
        );
      }

      const context = await requireTenantApiContext(
        database,
        parsed.data.orgSlug,
      );

      const profile = await updateCurrentUserProfile(
        database,
        context,
        {
          displayName: parsed.data.displayName,
        },
        await hashPrivateIdentifier(getClientAddress(request)),
      );

      return NextResponse.json({ profile });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
