import { NextResponse } from "next/server";
import { withRequestDatabase } from "@/db";
import { destroySession } from "@/src/server/auth/session";
import { apiErrorResponse, assertSameOrigin } from "@/src/server/http/api";

export async function POST(request: Request): Promise<NextResponse> {
  // EN: Revoke the active session and confirm a safe public redirect destination.
  // RU: Отзывает активную сессию и подтверждает безопасный публичный адрес перенаправления.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);
      await destroySession(database);
      return NextResponse.json({ redirectTo: "/" });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
