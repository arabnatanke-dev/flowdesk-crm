import { NextResponse } from "next/server";
import { z } from "zod";
import { withRequestDatabase } from "@/db";
import { requireTenantApiContext } from "@/src/server/auth/tenant";
import { apiErrorResponse, assertSameOrigin, getClientAddress } from "@/src/server/http/api";
import { hashPrivateIdentifier } from "@/src/server/security/crypto";
import { assignWorkOrder } from "@/src/server/work-orders/service";

const assignmentSchema = z.object({
  technicianId: z.uuid().nullable(),
  expectedVersion: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgSlug: string; workOrderId: string }> },
): Promise<NextResponse> {
  // EN: Assign a tenant technician through a role- and version-checked server command.
  // RU: Назначает tenant-техника через серверную команду с проверкой роли и версии.
  try {
    return await withRequestDatabase(async (database) => {
      assertSameOrigin(request);
      const { orgSlug, workOrderId } = await params;
      const context = await requireTenantApiContext(database, orgSlug);
      const parsed = assignmentSchema.safeParse(await request.json());
      if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_ASSIGNMENT", message: "Check the assignment fields.", details: parsed.error.flatten() } }, { status: 400 });
      return NextResponse.json({
        workOrder: await assignWorkOrder(
          database,
          context,
          workOrderId,
          parsed.data.technicianId,
          parsed.data.expectedVersion,
          await hashPrivateIdentifier(getClientAddress(request)),
        ),
      });
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
