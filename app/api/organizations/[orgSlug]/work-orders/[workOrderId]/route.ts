import { NextResponse } from "next/server";
import { z } from "zod";
import { withRequestDatabase } from "@/db";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { updateWorkOrder } from "@/src/server/work-orders/service";

const updateSchema = z.object({
  client: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40),
  title: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  expectedVersion: z.number().int().positive(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; workOrderId: string }> },
): Promise<NextResponse> {
  // EN: Validate and execute one tenant-scoped work-order content update.
  // RU: Валидирует и выполняет одно tenant-scoped обновление содержимого заявки.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);
      const { orgSlug, workOrderId } = await params;
      const context = await requireTenantApiContext(database, orgSlug);
      const parsed = updateSchema.safeParse(await request.json());
      if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_WORK_ORDER", message: "Check the work-order fields.", details: parsed.error.flatten() } }, { status: 400 });
      const { expectedVersion, ...input } = parsed.data;
      return NextResponse.json({
        workOrder: await updateWorkOrder(
          database,
          context,
          workOrderId,
          input,
          expectedVersion,
          await hashPrivateIdentifier(getClientAddress(request)),
        ),
      });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
