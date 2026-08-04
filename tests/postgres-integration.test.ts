import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import * as schema from "../db/schema";
import { installDatabaseForTests, resetDatabaseForTests, type FlowDeskDatabase } from "../db/index";
import { auditLogs, memberships, organizationSequences, organizations, sessions, users, workOrders } from "../db/schema";
import type { MembershipRole } from "../src/server/auth/permissions";
import type { TenantContext } from "../src/server/auth/tenant";
import { resolveTenantMembership } from "../src/server/auth/tenant";
import { requireSessionToken, resolveSessionToken } from "../src/server/auth/session";
import { assertLoginAllowed, recordLoginFailure } from "../src/server/auth/rate-limit";
import { sha256Hex } from "../src/server/security/crypto";
import { ApiError } from "../src/server/http/api";
import {
  assignWorkOrder,
  createWorkOrder,
  listWorkOrders,
  scheduleWorkOrder,
  transitionWorkOrder,
  updateWorkOrder,
} from "../src/server/work-orders/service";

const client = new PGlite();
const database = drizzle(client, { schema });
let serviceDatabase: FlowDeskDatabase;
const ids = {
  organizationA: crypto.randomUUID(),
  organizationB: crypto.randomUUID(),
  owner: crypto.randomUUID(),
  technician: crypto.randomUUID(),
  secondTechnician: crypto.randomUUID(),
  viewer: crypto.randomUUID(),
  accountant: crypto.randomUUID(),
  outsider: crypto.randomUUID(),
  assignedWorkOrder: crypto.randomUUID(),
  unassignedWorkOrder: crypto.randomUUID(),
  otherTechnicianWorkOrder: crypto.randomUUID(),
  foreignWorkOrder: crypto.randomUUID(),
};

function tenantContext(userId: string, role: MembershipRole, organizationId = ids.organizationA): TenantContext {
  // EN: Build a proven tenant context matching the memberships inserted for integration tests.
  // RU: Создаёт подтверждённый tenant context по memberships интеграционных тестов.
  return {
    session: { sessionId: crypto.randomUUID(), userId, email: `${role.toLowerCase()}@example.com`, displayName: role, expiresAt: new Date(Date.now() + 60_000) },
    organization: {
      id: organizationId,
      slug: organizationId === ids.organizationA ? "alpha" : "beta",
      name: organizationId === ids.organizationA ? "Alpha" : "Beta",
      defaultLocale: "en",
      timezone: "Asia/Dubai",
      currency: "AED",
      taxRateBps: 500,
      settingsVersion: 1,
    },
    role,
  };
}

async function seedIntegrationDatabase(): Promise<void> {
  // EN: Insert two tenants, representative roles and work orders with enforced foreign keys.
  // RU: Добавляет два tenant, основные роли и заявки с проверяемыми foreign keys.
  await database.insert(organizations).values([
    { id: ids.organizationA, slug: "alpha", name: "Alpha" },
    { id: ids.organizationB, slug: "beta", name: "Beta" },
  ]);
  await database.insert(users).values([
    { id: ids.owner, email: "owner@example.com", displayName: "Owner", passwordHash: "test" },
    { id: ids.technician, email: "tech@example.com", displayName: "Assigned Technician", passwordHash: "test" },
    { id: ids.secondTechnician, email: "tech2@example.com", displayName: "Second Technician", passwordHash: "test" },
    { id: ids.viewer, email: "viewer@example.com", displayName: "Viewer", passwordHash: "test" },
    { id: ids.accountant, email: "accountant@example.com", displayName: "Accountant", passwordHash: "test" },
    { id: ids.outsider, email: "outsider@example.com", displayName: "Outsider", passwordHash: "test" },
  ]);
  await database.insert(memberships).values([
    { organizationId: ids.organizationA, userId: ids.owner, role: "OWNER" },
    { organizationId: ids.organizationA, userId: ids.technician, role: "TECHNICIAN" },
    { organizationId: ids.organizationA, userId: ids.secondTechnician, role: "TECHNICIAN" },
    { organizationId: ids.organizationA, userId: ids.viewer, role: "VIEWER" },
    { organizationId: ids.organizationA, userId: ids.accountant, role: "ACCOUNTANT" },
    { organizationId: ids.organizationB, userId: ids.outsider, role: "OWNER" },
  ]);
  await database.insert(organizationSequences).values([
    { organizationId: ids.organizationA, nextWorkOrderNumber: 10 },
    { organizationId: ids.organizationB, nextWorkOrderNumber: 20 },
  ]);
  await database.insert(workOrders).values([
    {
      id: ids.assignedWorkOrder,
      organizationId: ids.organizationA,
      number: 1,
      clientName: "Assigned Client",
      clientPhone: "+971500000001",
      titleRu: "Назначенная заявка",
      titleEn: "Assigned work order",
      addressRu: "Dubai",
      addressEn: "Dubai",
      status: "IN_PROGRESS",
      technicianId: ids.technician,
      createdBy: ids.owner,
      updatedBy: ids.owner,
    },
    {
      id: ids.unassignedWorkOrder,
      organizationId: ids.organizationA,
      number: 2,
      clientName: "Unassigned Client",
      clientPhone: "+971500000002",
      titleRu: "Свободная заявка",
      titleEn: "Unassigned work order",
      addressRu: "Dubai",
      addressEn: "Dubai",
      status: "READY_TO_SCHEDULE",
      createdBy: ids.owner,
      updatedBy: ids.owner,
    },
    {
      id: ids.otherTechnicianWorkOrder,
      organizationId: ids.organizationA,
      number: 3,
      clientName: "Other Client",
      clientPhone: "+971500000003",
      titleRu: "Другая заявка",
      titleEn: "Other work order",
      addressRu: "Dubai",
      addressEn: "Dubai",
      status: "DISPATCHED",
      technicianId: ids.secondTechnician,
      scheduledStart: new Date(Date.now() + 3_600_000),
      scheduledEnd: new Date(Date.now() + 7_200_000),
      createdBy: ids.owner,
      updatedBy: ids.owner,
    },
    {
      id: ids.foreignWorkOrder,
      organizationId: ids.organizationB,
      number: 1,
      clientName: "Foreign Client",
      clientPhone: "+971500000004",
      titleRu: "Чужая заявка",
      titleEn: "Foreign work order",
      addressRu: "Abu Dhabi",
      addressEn: "Abu Dhabi",
      createdBy: ids.outsider,
      updatedBy: ids.outsider,
    },
  ]);
}

before(async () => {
  // EN: Boot an isolated PostgreSQL-compatible engine and apply the committed migration chain.
  // RU: Запускает изолированный PostgreSQL-compatible engine и применяет committed migration chain.
  process.env.SECURITY_PEPPER = "integration-test-pepper-with-at-least-32-characters";
  await migrate(database, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  serviceDatabase = installDatabaseForTests(database);
  await seedIntegrationDatabase();
});

after(async () => {
  // EN: Release the injected database and close the isolated PostgreSQL engine.
  // RU: Освобождает внедрённую БД и закрывает изолированный PostgreSQL engine.
  resetDatabaseForTests();
  await client.close();
});

test("owner cannot read another organization through tenant-scoped service queries", async () => {
  const ownerContext = tenantContext(ids.owner, "OWNER");
  assert.equal(await resolveTenantMembership(serviceDatabase, "beta", ownerContext.session), null);
  const records = await listWorkOrders(serviceDatabase, ownerContext);
  assert.deepEqual(records.map((record) => record.id).sort(), [ids.assignedWorkOrder, ids.otherTechnicianWorkOrder, ids.unassignedWorkOrder].sort());
  assert.equal(records.some((record) => record.id === ids.foreignWorkOrder), false);
});

test("technician sees only assigned work orders and receives technician DTO", async () => {
  const records = await listWorkOrders(serviceDatabase, tenantContext(ids.technician, "TECHNICIAN"));
  assert.deepEqual(records.map((record) => record.id), [ids.assignedWorkOrder]);
  assert.deepEqual(records[0].technician, { id: ids.technician, displayName: "Assigned Technician" });
});

test("viewer cannot read or create operational work orders", async () => {
  await assert.rejects(() => listWorkOrders(serviceDatabase, tenantContext(ids.viewer, "VIEWER")), (error: unknown) => error instanceof ApiError && error.code === "READ_FORBIDDEN");
  await assert.rejects(
    () => createWorkOrder(serviceDatabase, tenantContext(ids.viewer, "VIEWER"), { client: "Blocked", phone: "", title: "Blocked", address: "Blocked", priority: "NORMAL", scheduledStart: null }, null),
    (error: unknown) => error instanceof ApiError && error.code === "ROLE_FORBIDDEN",
  );
});

test("accountant cannot change operational status", async () => {
  await assert.rejects(
    () => transitionWorkOrder(serviceDatabase, tenantContext(ids.accountant, "ACCOUNTANT"), ids.assignedWorkOrder, "WORK_COMPLETED", 1, null),
    (error: unknown) => error instanceof ApiError && error.code === "ROLE_FORBIDDEN",
  );
});

test("expired and revoked sessions both resolve as unauthenticated", async () => {
  const expiredToken = "expired-integration-token";
  await database.insert(sessions).values({
    tokenHash: await sha256Hex(expiredToken),
    userId: ids.owner,
    expiresAt: new Date(Date.now() - 1_000),
  });
  assert.equal(await resolveSessionToken(serviceDatabase, expiredToken, false), null);
  await assert.rejects(() => requireSessionToken(serviceDatabase, expiredToken), (error: unknown) => error instanceof ApiError && error.status === 401);

  const revokedToken = "revoked-integration-token";
  const revokedHash = await sha256Hex(revokedToken);
  await database.insert(sessions).values({ tokenHash: revokedHash, userId: ids.owner, expiresAt: new Date(Date.now() + 60_000) });
  await database.delete(sessions).where(eq(sessions.tokenHash, revokedHash));
  assert.equal(await resolveSessionToken(serviceDatabase, revokedToken, false), null);
  await assert.rejects(() => requireSessionToken(serviceDatabase, revokedToken), (error: unknown) => error instanceof ApiError && error.status === 401);
});

test("idle sessions expire and parallel rotation accepts the previous token only during grace", async () => {
  const idleToken = "idle-integration-token";
  await database.insert(sessions).values({
    tokenHash: await sha256Hex(idleToken),
    userId: ids.owner,
    expiresAt: new Date(Date.now() + 60_000),
    lastSeenAt: new Date(Date.now() - 31 * 60 * 1000),
  });
  await assert.rejects(() => requireSessionToken(serviceDatabase, idleToken), (error: unknown) => error instanceof ApiError && error.status === 401);

  const oldToken = "rotation-integration-token";
  await database.insert(sessions).values({
    tokenHash: await sha256Hex(oldToken),
    userId: ids.owner,
    expiresAt: new Date(Date.now() + 60_000),
    rotatedAt: new Date(Date.now() - 16 * 60 * 1000),
  });
  const parallelResults = await Promise.all([
    resolveSessionToken(serviceDatabase, oldToken, true),
    resolveSessionToken(serviceDatabase, oldToken, true),
  ]);
  assert.equal(parallelResults.every((result) => result?.identity.userId === ids.owner), true);
  const rotatedTokens = parallelResults.flatMap((result) => result?.rotatedToken ? [result.rotatedToken] : []);
  assert.equal(rotatedTokens.length, 1);

  const graceResult = await resolveSessionToken(serviceDatabase, oldToken, true);
  assert.equal(graceResult?.identity.userId, ids.owner);
  assert.equal(graceResult?.rotatedToken, null);
  assert.equal((await requireSessionToken(serviceDatabase, rotatedTokens[0])).userId, ids.owner);

  await database.update(sessions).set({ previousTokenValidUntil: new Date(Date.now() - 1_000) })
    .where(eq(sessions.tokenHash, await sha256Hex(rotatedTokens[0])));
  assert.equal(await resolveSessionToken(serviceDatabase, oldToken, false), null);
  assert.equal((await requireSessionToken(serviceDatabase, rotatedTokens[0])).userId, ids.owner);
});

test("parallel login failures atomically block the account bucket", async () => {
  const request = new Request("https://flowdesk.example/api/auth/login", { headers: { "cf-connecting-ip": "203.0.113.40" } });
  await Promise.all(Array.from({ length: 5 }, () => recordLoginFailure(serviceDatabase, "parallel@example.com", request)));
  await assert.rejects(
    () => assertLoginAllowed(serviceDatabase, "parallel@example.com", request),
    (error: unknown) => error instanceof ApiError && error.code === "LOGIN_RATE_LIMITED",
  );
});

test("schedule, assignment and content commands complete the pre-dispatch workflow", async () => {
  const ownerContext = tenantContext(ids.owner, "OWNER");
  const scheduled = await scheduleWorkOrder(serviceDatabase, ownerContext, ids.unassignedWorkOrder, {
    scheduledStart: new Date(Date.now() + 3_600_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 7_200_000).toISOString(),
    timezone: "Asia/Dubai",
  }, 1, null);
  const assigned = await assignWorkOrder(serviceDatabase, ownerContext, scheduled.id, ids.technician, scheduled.version, null);
  const edited = await updateWorkOrder(serviceDatabase, ownerContext, assigned.id, {
    client: "Updated Client",
    phone: "+971500000099",
    title: "Updated job",
    address: "Updated address",
    priority: "HIGH",
  }, assigned.version, null);
  const moved = await transitionWorkOrder(serviceDatabase, ownerContext, edited.id, "SCHEDULED", edited.version, null);
  const dispatched = await transitionWorkOrder(serviceDatabase, ownerContext, moved.id, "DISPATCHED", moved.version, null);
  assert.equal(dispatched.status, "DISPATCHED");
  assert.equal(dispatched.technician?.id, ids.technician);
});

test("stale update fails and successful mutation commits its audit record", async () => {
  const ownerContext = tenantContext(ids.owner, "OWNER");
  const updated = await transitionWorkOrder(serviceDatabase, ownerContext, ids.assignedWorkOrder, "WORK_COMPLETED", 1, "audit-ip");
  assert.equal(updated.version, 2);
  await assert.rejects(
    () => transitionWorkOrder(serviceDatabase, ownerContext, ids.assignedWorkOrder, "PAUSED", 1, null),
    (error: unknown) => error instanceof ApiError && error.code === "VERSION_CONFLICT",
  );
  const [audit] = await database.select().from(auditLogs).where(and(
    eq(auditLogs.organizationId, ids.organizationA),
    eq(auditLogs.entityId, ids.assignedWorkOrder),
    eq(auditLogs.action, "work_order.status_changed"),
  )).limit(1);
  assert.equal(audit.after && (audit.after as { version?: number }).version, 2);
});
