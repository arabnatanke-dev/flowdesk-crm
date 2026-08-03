import type { Locale } from "@/src/shared/i18n/messages";

export type WorkOrderStatus =
  | "NEW"
  | "TRIAGED"
  | "READY_TO_SCHEDULE"
  | "SCHEDULED"
  | "DISPATCHED"
  | "EN_ROUTE"
  | "ON_SITE"
  | "IN_PROGRESS"
  | "PAUSED"
  | "WAITING_FOR_CLIENT"
  | "WAITING_FOR_PARTS"
  | "WORK_COMPLETED"
  | "CLOSED"
  | "CANCELED";

export type WorkOrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type LocalizedText = Record<Locale, string>;

export type WorkOrder = {
  id: string;
  number: string;
  client: string;
  phone: string;
  title: LocalizedText;
  address: LocalizedText;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timezone: string;
  appointment: string | null;
  technician: { id: string; displayName: string } | null;
  amountMinor: number;
  currency: string;
  amount: string;
  slaMinutes: number | null;
  version: number;
};

export type TechnicianOption = {
  id: string;
  displayName: string;
};

export type UpdateWorkOrderInput = {
  client: string;
  phone: string;
  title: string;
  address: string;
  priority: WorkOrderPriority;
};

export type ScheduleWorkOrderInput = {
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
};

export type NewWorkOrderInput = {
  client: string;
  phone: string;
  title: string;
  address: string;
  priority: WorkOrderPriority;
  scheduledStart: string | null;
};

export function localizeText(text: LocalizedText, locale: Locale): string {
  // EN: Resolve tenant content using the active interface locale.
  // RU: Возвращает контент организации на активном языке интерфейса.
  return text[locale];
}
