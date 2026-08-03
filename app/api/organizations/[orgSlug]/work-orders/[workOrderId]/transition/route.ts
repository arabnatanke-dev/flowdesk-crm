import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { transitionWorkOrder } from "@/src/server/work-orders/service";

const transitionSchema = z.object({
  to: z.enum([
    "NEW", "TRIAGED", "READY_TO_SCHEDULE", "SCHEDULED", "DISPATCHED", "EN_ROUTE", "ON_SITE",
    "IN_PROGRESS", "PAUSED", "WAITING_FOR_CLIENT", "WAITING_FOR_PARTS", "WORK_COMPLETED", "CLOSED", "CANCELED",
  ]),
  expectedVersion: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; workOrderId: string }> },
): Promise<NextResponse> {
  // EN: Execute one server-authorized and version-checked work-order state transition.
  // RU: Выполняет один серверно разрешённый и version-проверенный переход статуса заявки.
  try {
    assertSameOrigin(request);
    const { orgSlug, workOrderId } = await params;
    const context = await requireTenantApiContext(orgSlug);
    const parsed = transitionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_TRANSITION_INPUT", message: "Check the transition fields.", details: parsed.error.flatten() } }, { status: 400 });
    const ipHash = await hashPrivateIdentifier(getClientAddress(request));
    return NextResponse.json({
      workOrder: await transitionWorkOrder(context, workOrderId, parsed.data.to, parsed.data.expectedVersion, ipHash),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
