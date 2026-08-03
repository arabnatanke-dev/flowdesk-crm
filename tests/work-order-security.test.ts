import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, getAvailableTransitions } from "../src/modules/work-orders/domain/state-machine";
import { ApiError } from "../src/server/http/api";
import { assertWorkOrderTransitionAllowed } from "../src/server/work-orders/service";

test("state machine accepts defined paths and keeps terminal states closed", () => {
  assert.equal(canTransition("NEW", "TRIAGED"), true);
  assert.equal(canTransition("NEW", "CLOSED"), false);
  assert.deepEqual(getAvailableTransitions("CLOSED"), []);
  assert.deepEqual(getAvailableTransitions("CANCELED"), []);
});

test("rejects stale optimistic versions", () => {
  assert.throws(
    () => assertWorkOrderTransitionAllowed(
      { status: "IN_PROGRESS", version: 4, scheduledStart: new Date(), technicianId: "tech-1" },
      "ADMIN",
      "admin-1",
      "WORK_COMPLETED",
      3,
    ),
    (error: unknown) => error instanceof ApiError && error.code === "VERSION_CONFLICT",
  );
});
test("prevents technicians from changing another technician's work order", () => {
  assert.throws(
    () => assertWorkOrderTransitionAllowed(
      { status: "DISPATCHED", version: 2, scheduledStart: new Date(), technicianId: "tech-2" },
      "TECHNICIAN",
      "tech-1",
      "EN_ROUTE",
      2,
    ),
    (error: unknown) => error instanceof ApiError && error.code === "ASSIGNMENT_REQUIRED",
  );
});

test("requires scheduling and assignment data before protected transitions", () => {
  assert.throws(
    () => assertWorkOrderTransitionAllowed(
      { status: "READY_TO_SCHEDULE", version: 1, scheduledStart: null, technicianId: null },
      "DISPATCHER",
      "dispatcher-1",
      "SCHEDULED",
      1,
    ),
    (error: unknown) => error instanceof ApiError && error.code === "SCHEDULE_REQUIRED",
  );
  assert.throws(
    () => assertWorkOrderTransitionAllowed(
      { status: "SCHEDULED", version: 1, scheduledStart: new Date(), technicianId: null },
      "DISPATCHER",
      "dispatcher-1",
      "DISPATCHED",
      1,
    ),
    (error: unknown) => error instanceof ApiError && error.code === "TECHNICIAN_REQUIRED",
  );
});
