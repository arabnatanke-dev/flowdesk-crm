import type { WorkOrderStatus } from "@/src/modules/work-orders/domain/work-order";

export type MembershipRole = "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "ACCOUNTANT" | "VIEWER";

const workOrderWriters = new Set<MembershipRole>(["OWNER", "ADMIN", "DISPATCHER"]);
const settingsWriters = new Set<MembershipRole>(["OWNER", "ADMIN"]);
const technicianStatuses = new Set<WorkOrderStatus>([
  "EN_ROUTE",
  "ON_SITE",
  "IN_PROGRESS",
  "PAUSED",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_PARTS",
  "WORK_COMPLETED",
]);

export function canCreateWorkOrder(role: MembershipRole): boolean {
  // EN: Restrict work-order creation to office roles responsible for operations.
  // RU: Разрешает создание заявок только офисным ролям, отвечающим за операции.
  return workOrderWriters.has(role);
}

export function canTransitionWorkOrder(role: MembershipRole, nextStatus: WorkOrderStatus): boolean {
  // EN: Allow office operators all domain transitions and technicians only field execution states.
  // RU: Разрешает офисным операторам все доменные переходы, а мастерам — только выездные состояния.
  return workOrderWriters.has(role) || (role === "TECHNICIAN" && technicianStatuses.has(nextStatus));
}

export function canUpdateSettings(role: MembershipRole): boolean {
  // EN: Limit organization-wide configuration changes to owner and administrator roles.
  // RU: Ограничивает изменение настроек организации ролями владельца и администратора.
  return settingsWriters.has(role);
}
