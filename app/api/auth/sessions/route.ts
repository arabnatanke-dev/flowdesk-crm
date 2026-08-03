import { NextResponse } from "next/server";
import { withRequestDatabase } from "@/db";
import { destroyAllSessions, getRouteSessionIdentity, listActiveSessions } from "@/src/server/auth/session";
import { ApiError, apiErrorResponse, assertSameOrigin } from "@/src/server/http/api";

export async function GET(): Promise<NextResponse> {
  // EN: Return the authenticated user's active sessions without token material.
  // RU: Возвращает активные сессии пользователя без token-данных.
  try {
    return await withRequestDatabase(async (database) => {
      if (!await getRouteSessionIdentity(database)) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
      return NextResponse.json({ sessions: await listActiveSessions(database) });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  // EN: Revoke all sessions for the current user after a same-origin check.
  // RU: Отзывает все сессии текущего пользователя после same-origin проверки.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);
      if (!await destroyAllSessions(database)) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
      return NextResponse.json({ revoked: true });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
