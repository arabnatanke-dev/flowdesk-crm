import type { WorkOrderStatus } from "./work-order";

const transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  NEW: ["TRIAGED", "READY_TO_SCHEDULE", "SCHEDULED", "CANCELED"],
  TRIAGED: ["READY_TO_SCHEDULE", "SCHEDULED", "WAITING_FOR_CLIENT", "CANCELED"],
  READY_TO_SCHEDULE: ["SCHEDULED", "CANCELED"],
  SCHEDULED: ["DISPATCHED", "CANCELED"],
  DISPATCHED: ["EN_ROUTE", "SCHEDULED", "CANCELED"],
  EN_ROUTE: ["ON_SITE", "PAUSED", "CANCELED"],
  ON_SITE: ["IN_PROGRESS", "PAUSED"],
  IN_PROGRESS: ["PAUSED", "WAITING_FOR_CLIENT", "WAITING_FOR_PARTS", "WORK_COMPLETED"],
  PAUSED: ["IN_PROGRESS", "SCHEDULED", "CANCELED"],
  WAITING_FOR_CLIENT: ["IN_PROGRESS", "SCHEDULED", "CANCELED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "SCHEDULED", "CANCELED"],
  WORK_COMPLETED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
  CANCELED: [],
};

export function getAvailableTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
  // EN: Return only state transitions allowed by the FlowDesk domain policy.
  // RU: Возвращает только переходы, разрешённые доменной политикой FlowDesk.
  return transitions[status];
}

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  // EN: Validate a status command independently from the presentation layer.
  // RU: Проверяет статусную команду независимо от слоя интерфейса.
  return transitions[from].includes(to);
}
