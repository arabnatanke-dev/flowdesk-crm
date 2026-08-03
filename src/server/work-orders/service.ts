import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, organizationSequences, workOrders } from "@/db/schema";
import { canTransition } from "@/src/modules/work-orders/domain/state-machine";
import type {
  NewWorkOrderInput,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/src/modules/work-orders/domain/work-order";
import { canCreateWorkOrder, canTransitionWorkOrder, type MembershipRole } from "@/src/server/auth/permissions";
import type { TenantContext } from "@/src/server/auth/tenant";
import { ApiError } from "@/src/server/http/api";

type WorkOrderRow = typeof workOrders.$inferSelect;

function formatAppointment(start: Date | null, end: Date | null, timezone: string): string | null {
  // EN: Convert persisted instants to a compact display window in the work order timezone.
  // RU: Преобразует сохранённые моменты времени в компактное окно в timezone заявки.
  if (!start) return null;
  const formatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone });
  const startText = formatter.format(start);
  return end ? `${startText}–${formatter.format(end)}` : startText;
}

function formatAmount(amountMinor: number, currency: string): string {
  // EN: Format integer minor units only at the presentation boundary.
  // RU: Форматирует целые minor units только на границе представления.
  return new Intl.NumberFormat("en-AE", { style: "currency", currency }).format(amountMinor / 100);
}

export function serializeWorkOrder(row: WorkOrderRow): WorkOrder {
  // EN: Expose a stable client DTO while keeping money and time strongly typed in persistence.
  // RU: Формирует стабильный client DTO, сохраняя строгие типы денег и времени в persistence-слое.
  return {
    id: row.id,
    number: `WO-${row.number}`,
    client: row.clientName,
    phone: row.clientPhone,
    title: { ru: row.titleRu, en: row.titleEn },
    address: { ru: row.addressRu, en: row.addressEn },
    status: row.status,
    priority: row.priority,
    appointment: formatAppointment(row.scheduledStart, row.scheduledEnd, row.timezone),
    technician: null,
    amount: formatAmount(row.amountMinor, row.currency),
    slaMinutes: row.slaMinutes,
    version: row.version,
  };
}

export async function listWorkOrders(context: TenantContext): Promise<WorkOrder[]> {
  // EN: Read work orders only by the organization id proven by the current membership.
  // RU: Читает заявки только по organization id, подтверждённому текущим членством.
  const rows = await getDb()
    .select()
    .from(workOrders)
    .where(eq(workOrders.organizationId, context.organization.id))
    .orderBy(desc(workOrders.number));
  return rows.map(serializeWorkOrder);
}

export async function createWorkOrder(
  context: TenantContext,
  input: NewWorkOrderInput,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Allocate a collision-free tenant sequence and persist the new aggregate plus audit record.
  // RU: Выделяет tenant-последовательность без коллизий и сохраняет агрегат вместе с audit-записью.
  if (!canCreateWorkOrder(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot create work orders.");
  const scheduledStart = input.scheduledStart ? new Date(input.scheduledStart) : null;
  const scheduledEnd = scheduledStart ? new Date(scheduledStart.getTime() + 90 * 60 * 1000) : null;
  return getDb().transaction(async (transaction) => {
    // EN: Keep sequence allocation, aggregate insertion and its audit record in one database transaction.
    // RU: Выполняет выдачу номера, вставку агрегата и audit-запись в одной транзакции БД.
    const [sequence] = await transaction
      .update(organizationSequences)
      .set({ nextWorkOrderNumber: sql`${organizationSequences.nextWorkOrderNumber} + 1`, updatedAt: new Date() })
      .where(eq(organizationSequences.organizationId, context.organization.id))
      .returning({ next: organizationSequences.nextWorkOrderNumber });
    if (!sequence) throw new ApiError(500, "SEQUENCE_NOT_CONFIGURED", "The organization work-order sequence is not configured.");

    const [created] = await transaction.insert(workOrders).values({
      organizationId: context.organization.id,
      number: sequence.next - 1,
      clientName: input.client.trim(),
      clientPhone: input.phone.trim(),
      titleRu: input.title.trim(),
      titleEn: input.title.trim(),
      addressRu: input.address.trim(),
      addressEn: input.address.trim(),
      status: scheduledStart ? "SCHEDULED" : "NEW",
      priority: input.priority as WorkOrderPriority,
      scheduledStart,
      scheduledEnd,
      timezone: context.organization.timezone,
      currency: context.organization.currency,
      createdBy: context.session.userId,
      updatedBy: context.session.userId,
    }).returning();

    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "work_order.created",
      entityType: "work_order",
      entityId: created.id,
      after: created,
      ipHash,
    });
    return serializeWorkOrder(created);
  });
}

function assertTransitionRequirements(row: Pick<WorkOrderRow, "scheduledStart" | "technicianId">, nextStatus: WorkOrderStatus): void {
  // EN: Enforce server-owned prerequisites that cannot be trusted to the browser state machine.
  // RU: Проверяет серверные prerequisites, которые нельзя доверять browser state machine.
  if (nextStatus === "SCHEDULED" && !row.scheduledStart) {
    throw new ApiError(422, "SCHEDULE_REQUIRED", "Set a schedule before moving the work order to SCHEDULED.");
  }
  if (nextStatus === "DISPATCHED" && !row.technicianId) {
    throw new ApiError(422, "TECHNICIAN_REQUIRED", "Assign a technician before dispatching the work order.");
  }
}

export function assertWorkOrderTransitionAllowed(
  row: Pick<WorkOrderRow, "status" | "version" | "scheduledStart" | "technicianId">,
  role: MembershipRole,
  actorUserId: string,
  nextStatus: WorkOrderStatus,
  expectedVersion: number,
): void {
  // EN: Centralize role, assignment, state, version and prerequisite checks for every transport.
  // RU: Централизует проверки роли, назначения, статуса, версии и prerequisites для любого транспорта.
  if (!canTransitionWorkOrder(role, nextStatus)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot perform this transition.");
  if (role === "TECHNICIAN" && row.technicianId !== actorUserId) {
    throw new ApiError(403, "ASSIGNMENT_REQUIRED", "This work order is not assigned to you.");
  }
  if (!canTransition(row.status, nextStatus)) throw new ApiError(409, "INVALID_TRANSITION", `Cannot move ${row.status} to ${nextStatus}.`);
  if (row.version !== expectedVersion) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
  assertTransitionRequirements(row, nextStatus);
}

export async function transitionWorkOrder(
  context: TenantContext,
  workOrderId: string,
  nextStatus: WorkOrderStatus,
  expectedVersion: number,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Validate tenant, role, state, prerequisites and optimistic version before the atomic update.
  // RU: Проверяет tenant, роль, состояние, prerequisites и optimistic version до атомарного обновления.
  return getDb().transaction(async (transaction) => {
    // EN: Commit the guarded state change and audit trail atomically.
    // RU: Атомарно фиксирует защищённый переход состояния и audit trail.
    const [current] = await transaction.select().from(workOrders).where(and(
      eq(workOrders.id, workOrderId),
      eq(workOrders.organizationId, context.organization.id),
    )).limit(1);
    if (!current) throw new ApiError(404, "WORK_ORDER_NOT_FOUND", "Work order not found.");
    assertWorkOrderTransitionAllowed(current, context.role, context.session.userId, nextStatus, expectedVersion);

    const [updated] = await transaction.update(workOrders).set({
      status: nextStatus,
      version: current.version + 1,
      updatedBy: context.session.userId,
      updatedAt: new Date(),
    }).where(and(
      eq(workOrders.id, current.id),
      eq(workOrders.organizationId, context.organization.id),
      eq(workOrders.status, current.status),
      eq(workOrders.version, expectedVersion),
    )).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");

    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "work_order.status_changed",
      entityType: "work_order",
      entityId: current.id,
      before: { status: current.status, version: current.version },
      after: { status: updated.status, version: updated.version },
      ipHash,
    });
    return serializeWorkOrder(updated);
  });
}
