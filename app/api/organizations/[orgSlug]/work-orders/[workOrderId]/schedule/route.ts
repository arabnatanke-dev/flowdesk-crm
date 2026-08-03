import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { scheduleWorkOrder } from "@/src/server/work-orders/service";

const scheduleSchema = z.object({
  scheduledStart: z.iso.datetime(),
  scheduledEnd: z.iso.datetime(),
  timezone: z.string().trim().min(1).max(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone"),
  expectedVersion: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; workOrderId: string }> },
): Promise<NextResponse> {
  // EN: Persist a versioned service window before status scheduling and dispatch.
  // RU: Сохраняет версионированное сервисное окно до scheduling и dispatch переходов.
  try {
    assertSameOrigin(request);
    const { orgSlug, workOrderId } = await params;
    const context = await requireTenantApiContext(orgSlug);
    const parsed = scheduleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_SCHEDULE", message: "Check the schedule fields.", details: parsed.error.flatten() } }, { status: 400 });
    const { expectedVersion, ...input } = parsed.data;
    return NextResponse.json({
      workOrder: await scheduleWorkOrder(
        context,
        workOrderId,
        input,
        expectedVersion,
        await hashPrivateIdentifier(getClientAddress(request)),
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
