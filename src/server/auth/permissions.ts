import type { WorkOrderStatus } from "@/src/modules/work-orders/domain/work-order";

export type MembershipRole = "OWNER" | "ADMIN" | "DISPATCHER" | "TECHNICIAN" | "ACCOUNTANT" | "VIEWER";
export type OfficeSectionKey = "dashboard" | "work-orders" | "dispatch" | "clients" | "team" | "catalog" | "finance" | "reports" | "settings";

const workOrderWriters = new Set<MembershipRole>(["OWNER", "ADMIN", "DISPATCHER"]);
const settingsWriters = new Set<MembershipRole>(["OWNER", "ADMIN"]);
const allWorkOrderReaders = new Set<MembershipRole>(["OWNER", "ADMIN", "DISPATCHER"]);
const workOrderReaders = new Set<MembershipRole>([...allWorkOrderReaders, "TECHNICIAN"]);
const mobileRoles = new Set<MembershipRole>(["OWNER", "ADMIN", "TECHNICIAN"]);
const officeSectionsByRole: Record<MembershipRole, OfficeSectionKey[]> = {
  OWNER: ["dashboard", "work-orders", "dispatch", "clients", "team", "catalog", "finance", "reports", "settings"],
  ADMIN: ["dashboard", "work-orders", "dispatch", "clients", "team", "catalog", "finance", "reports", "settings"],
  DISPATCHER: ["dashboard", "work-orders", "dispatch", "clients", "team"],
  TECHNICIAN: [],
  ACCOUNTANT: ["finance", "reports"],
  VIEWER: ["reports"],
};
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

export function canReadWorkOrders(role: MembershipRole): boolean {
  // EN: Permit operational work-order reads only to office operators and assigned technicians.
  // RU: Разрешает чтение операционных заявок только офисным операторам и назначенным техникам.
  return workOrderReaders.has(role);
}

export function canReadAllWorkOrders(role: MembershipRole): boolean {
  // EN: Distinguish organization-wide readers from technicians restricted to their assignments.
  // RU: Отличает читателей всей организации от техников, ограниченных своими назначениями.
  return allWorkOrderReaders.has(role);
}

export function canAccessOfficeSection(role: MembershipRole, section: OfficeSectionKey): boolean {
  // EN: Authorize each office module explicitly instead of relying on a shared membership gate.
  // RU: Явно авторизует каждый office-модуль вместо одной общей membership-проверки.
  return officeSectionsByRole[role].includes(section);
}

export function getDefaultOfficeSection(role: MembershipRole): OfficeSectionKey | null {
  // EN: Return the first safe office destination for a role or null for mobile-only technicians.
  // RU: Возвращает первый безопасный office-раздел роли или null для mobile-only техника.
  return officeSectionsByRole[role][0] ?? null;
}

export function canAccessMobileWorkspace(role: MembershipRole): boolean {
  // EN: Restrict the field workspace to technicians and supervisory roles.
  // RU: Ограничивает полевой интерфейс техниками и контролирующими ролями.
  return mobileRoles.has(role);
}
