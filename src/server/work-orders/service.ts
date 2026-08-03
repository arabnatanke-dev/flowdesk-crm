import { and, desc, eq, sql } from "drizzle-orm";
import type { FlowDeskDatabase } from "@/db";
import { auditLogs, memberships, organizationSequences, users, workOrders } from "@/db/schema";
import { canTransition } from "@/src/modules/work-orders/domain/state-machine";
import type {
  NewWorkOrderInput,
  ScheduleWorkOrderInput,
  TechnicianOption,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/src/modules/work-orders/domain/work-order";
import {
  canCreateWorkOrder,
  canReadAllWorkOrders,
  canReadWorkOrders,
  canTransitionWorkOrder,
  type MembershipRole,
} from "@/src/server/auth/permissions";
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

export function serializeWorkOrder(row: WorkOrderRow, technician: TechnicianOption | null = null): WorkOrder {
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
    scheduledStart: row.scheduledStart?.toISOString() ?? null,
    scheduledEnd: row.scheduledEnd?.toISOString() ?? null,
    timezone: row.timezone,
    appointment: formatAppointment(row.scheduledStart, row.scheduledEnd, row.timezone),
    technician,
    amountMinor: row.amountMinor,
    currency: row.currency,
    amount: formatAmount(row.amountMinor, row.currency),
    slaMinutes: row.slaMinutes,
    version: row.version,
  };
}

export async function listWorkOrders(database: FlowDeskDatabase, context: TenantContext): Promise<WorkOrder[]> {
  // EN: Read work orders only by the organization id proven by the current membership.
  // RU: Читает заявки только по organization id, подтверждённому текущим членством.
  if (!canReadWorkOrders(context.role)) throw new ApiError(403, "READ_FORBIDDEN", "Your role cannot read operational work orders.");
  const scope = canReadAllWorkOrders(context.role)
    ? eq(workOrders.organizationId, context.organization.id)
    : and(eq(workOrders.organizationId, context.organization.id), eq(workOrders.technicianId, context.session.userId));
  const rows = await database
    .select({ workOrder: workOrders, technicianId: users.id, technicianName: users.displayName })
    .from(workOrders)
    .leftJoin(users, eq(users.id, workOrders.technicianId))
    .where(scope)
    .orderBy(desc(workOrders.number));
  return rows.map((record) => serializeWorkOrder(
    record.workOrder,
    record.technicianId && record.technicianName
      ? { id: record.technicianId, displayName: record.technicianName }
      : null,
  ));
}

export async function listAssignableTechnicians(database: FlowDeskDatabase, context: TenantContext): Promise<TechnicianOption[]> {
  // EN: List active technician memberships only inside the already authorized organization.
  // RU: Возвращает только активные technician-memberships внутри уже авторизованной организации.
  if (!canReadAllWorkOrders(context.role)) return [];
  return database
    .select({ id: users.id, displayName: users.displayName })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(
      eq(memberships.organizationId, context.organization.id),
      eq(memberships.role, "TECHNICIAN"),
      eq(memberships.isActive, true),
      eq(users.isActive, true),
    ))
    .orderBy(users.displayName);
}

export async function createWorkOrder(
  database: FlowDeskDatabase,
  context: TenantContext,
  input: NewWorkOrderInput,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Allocate a collision-free tenant sequence and persist the new aggregate plus audit record.
  // RU: Выделяет tenant-последовательность без коллизий и сохраняет агрегат вместе с audit-записью.
  if (!canCreateWorkOrder(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot create work orders.");
  const scheduledStart = input.scheduledStart ? new Date(input.scheduledStart) : null;
  const scheduledEnd = scheduledStart ? new Date(scheduledStart.getTime() + 90 * 60 * 1000) : null;
  return database.transaction(async (transaction) => {
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
  if (row.version !== expectedVersion) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
  if (!canTransition(row.status, nextStatus)) throw new ApiError(409, "INVALID_TRANSITION", `Cannot move ${row.status} to ${nextStatus}.`);
  assertTransitionRequirements(row, nextStatus);
}

export async function transitionWorkOrder(
  database: FlowDeskDatabase,
  context: TenantContext,
  workOrderId: string,
  nextStatus: WorkOrderStatus,
  expectedVersion: number,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Validate tenant, role, state, prerequisites and optimistic version before the atomic update.
  // RU: Проверяет tenant, роль, состояние, prerequisites и optimistic version до атомарного обновления.
  return database.transaction(async (transaction) => {
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
    const [technician] = updated.technicianId
      ? await transaction.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, updated.technicianId)).limit(1)
      : [];
    return serializeWorkOrder(updated, technician ?? null);
  });
}

export async function updateWorkOrder(
  database: FlowDeskDatabase,
  context: TenantContext,
  workOrderId: string,
  input: UpdateWorkOrderInput,
  expectedVersion: number,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Update editable work-order content with tenant scope, role policy, version control and audit.
  // RU: Обновляет содержимое заявки с tenant-scope, role-policy, version control и audit.
  if (!canCreateWorkOrder(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot edit work orders.");
  return database.transaction(async (transaction) => {
    // EN: Keep the content update and its audit record in one transaction.
    // RU: Выполняет обновление содержимого и audit-запись в одной транзакции.
    const [current] = await transaction.select().from(workOrders).where(and(
      eq(workOrders.id, workOrderId),
      eq(workOrders.organizationId, context.organization.id),
    )).limit(1);
    if (!current) throw new ApiError(404, "WORK_ORDER_NOT_FOUND", "Work order not found.");
    if (current.version !== expectedVersion) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    const [updated] = await transaction.update(workOrders).set({
      clientName: input.client.trim(),
      clientPhone: input.phone.trim(),
      titleRu: input.title.trim(),
      titleEn: input.title.trim(),
      addressRu: input.address.trim(),
      addressEn: input.address.trim(),
      priority: input.priority,
      version: current.version + 1,
      updatedBy: context.session.userId,
      updatedAt: new Date(),
    }).where(and(
      eq(workOrders.id, current.id),
      eq(workOrders.organizationId, context.organization.id),
      eq(workOrders.version, expectedVersion),
    )).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "work_order.updated",
      entityType: "work_order",
      entityId: current.id,
      before: current,
      after: updated,
      ipHash,
    });
    const [technician] = updated.technicianId
      ? await transaction.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, updated.technicianId)).limit(1)
      : [];
    return serializeWorkOrder(updated, technician ?? null);
  });
}

export async function assignWorkOrder(
  database: FlowDeskDatabase,
  context: TenantContext,
  workOrderId: string,
  technicianId: string | null,
  expectedVersion: number,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Assign only an active technician membership from the same tenant with optimistic concurrency.
  // RU: Назначает только активного техника того же tenant с optimistic concurrency.
  if (!canCreateWorkOrder(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot assign work orders.");
  return database.transaction(async (transaction) => {
    // EN: Validate membership and commit assignment plus audit atomically.
    // RU: Проверяет membership и атомарно фиксирует назначение вместе с audit.
    const [current] = await transaction.select().from(workOrders).where(and(
      eq(workOrders.id, workOrderId),
      eq(workOrders.organizationId, context.organization.id),
    )).limit(1);
    if (!current) throw new ApiError(404, "WORK_ORDER_NOT_FOUND", "Work order not found.");
    if (current.version !== expectedVersion) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    if (!technicianId && !["NEW", "TRIAGED", "READY_TO_SCHEDULE", "SCHEDULED"].includes(current.status)) {
      throw new ApiError(422, "ACTIVE_ASSIGNMENT_REQUIRED", "An active field work order cannot be unassigned.");
    }
    const [technician] = technicianId
      ? await transaction
        .select({ id: users.id, displayName: users.displayName })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(
          eq(memberships.organizationId, context.organization.id),
          eq(memberships.userId, technicianId),
          eq(memberships.role, "TECHNICIAN"),
          eq(memberships.isActive, true),
          eq(users.isActive, true),
        ))
        .limit(1)
      : [];
    if (technicianId && !technician) throw new ApiError(422, "INVALID_TECHNICIAN", "Select an active technician from this organization.");

    const [updated] = await transaction.update(workOrders).set({
      technicianId,
      version: current.version + 1,
      updatedBy: context.session.userId,
      updatedAt: new Date(),
    }).where(and(
      eq(workOrders.id, current.id),
      eq(workOrders.organizationId, context.organization.id),
      eq(workOrders.version, expectedVersion),
    )).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "work_order.assigned",
      entityType: "work_order",
      entityId: current.id,
      before: { technicianId: current.technicianId, version: current.version },
      after: { technicianId: updated.technicianId, version: updated.version },
      ipHash,
    });
    return serializeWorkOrder(updated, technician ?? null);
  });
}

export async function scheduleWorkOrder(
  database: FlowDeskDatabase,
  context: TenantContext,
  workOrderId: string,
  input: ScheduleWorkOrderInput,
  expectedVersion: number,
  ipHash: string | null,
): Promise<WorkOrder> {
  // EN: Persist an absolute service window and timezone before scheduling or dispatch transitions.
  // RU: Сохраняет абсолютное сервисное окно и timezone до переходов scheduling или dispatch.
  if (!canCreateWorkOrder(context.role)) throw new ApiError(403, "ROLE_FORBIDDEN", "Your role cannot schedule work orders.");
  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);
  if (scheduledEnd <= scheduledStart) throw new ApiError(422, "INVALID_SCHEDULE", "The schedule end must be after its start.");
  return database.transaction(async (transaction) => {
    // EN: Commit schedule, version increment and audit record atomically.
    // RU: Атомарно фиксирует расписание, увеличение версии и audit-запись.
    const [current] = await transaction.select().from(workOrders).where(and(
      eq(workOrders.id, workOrderId),
      eq(workOrders.organizationId, context.organization.id),
    )).limit(1);
    if (!current) throw new ApiError(404, "WORK_ORDER_NOT_FOUND", "Work order not found.");
    if (current.version !== expectedVersion) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    if (["CLOSED", "CANCELED"].includes(current.status)) throw new ApiError(422, "TERMINAL_WORK_ORDER", "A terminal work order cannot be scheduled.");
    const [updated] = await transaction.update(workOrders).set({
      scheduledStart,
      scheduledEnd,
      timezone: input.timezone,
      version: current.version + 1,
      updatedBy: context.session.userId,
      updatedAt: new Date(),
    }).where(and(
      eq(workOrders.id, current.id),
      eq(workOrders.organizationId, context.organization.id),
      eq(workOrders.version, expectedVersion),
    )).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "The work order changed. Refresh and try again.");
    await transaction.insert(auditLogs).values({
      organizationId: context.organization.id,
      actorUserId: context.session.userId,
      action: "work_order.scheduled",
      entityType: "work_order",
      entityId: current.id,
      before: { scheduledStart: current.scheduledStart, scheduledEnd: current.scheduledEnd, timezone: current.timezone, version: current.version },
      after: { scheduledStart: updated.scheduledStart, scheduledEnd: updated.scheduledEnd, timezone: updated.timezone, version: updated.version },
      ipHash,
    });
    const [technician] = updated.technicianId
      ? await transaction.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, updated.technicianId)).limit(1)
      : [];
    return serializeWorkOrder(updated, technician ?? null);
  });
}
