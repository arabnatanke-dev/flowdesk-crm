import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { createWorkOrder, listWorkOrders } from "@/src/server/work-orders/service";

const createWorkOrderSchema = z.object({
  client: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).default(""),
  title: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  scheduledStart: z.iso.datetime().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
): Promise<NextResponse> {
  // EN: Return only work orders belonging to the organization authorized by the current session.
  // RU: Возвращает только заявки организации, разрешённой текущей сессией.
  try {
    const { orgSlug } = await params;
    const context = await requireTenantApiContext(orgSlug);
    return NextResponse.json({ workOrders: await listWorkOrders(context) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
): Promise<NextResponse> {
  // EN: Validate and persist a tenant-scoped work-order creation command.
  // RU: Валидирует и сохраняет tenant-команду создания заявки.
  try {
    assertSameOrigin(request);
    const { orgSlug } = await params;
    const context = await requireTenantApiContext(orgSlug);
    const parsed = createWorkOrderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_WORK_ORDER", message: "Check the work-order fields.", details: parsed.error.flatten() } }, { status: 400 });
    const ipHash = await hashPrivateIdentifier(getClientAddress(request));
    return NextResponse.json({ workOrder: await createWorkOrder(context, parsed.data, ipHash) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
