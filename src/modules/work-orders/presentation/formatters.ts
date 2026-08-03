import type { Locale } from "@/src/shared/i18n/messages";
import type {
  WorkOrderPriority,
  WorkOrderStatus,
} from "../domain/work-order";

const statusLabels: Record<Locale, Record<WorkOrderStatus, string>> = {
  ru: {
    NEW: "Новая",
    TRIAGED: "Квалификация",
    READY_TO_SCHEDULE: "Готова к планированию",
    SCHEDULED: "Запланирована",
    DISPATCHED: "Назначена",
    EN_ROUTE: "В пути",
    ON_SITE: "На месте",
    IN_PROGRESS: "В работе",
    PAUSED: "Пауза",
    WAITING_FOR_CLIENT: "Ждём клиента",
    WAITING_FOR_PARTS: "Ждём запчасти",
    WORK_COMPLETED: "Работа завершена",
    CLOSED: "Закрыта",
    CANCELED: "Отменена",
  },
  en: {
    NEW: "New",
    TRIAGED: "Triaged",
    READY_TO_SCHEDULE: "Ready to schedule",
    SCHEDULED: "Scheduled",
    DISPATCHED: "Dispatched",
    EN_ROUTE: "En route",
    ON_SITE: "On site",
    IN_PROGRESS: "In progress",
    PAUSED: "Paused",
    WAITING_FOR_CLIENT: "Waiting for client",
    WAITING_FOR_PARTS: "Waiting for parts",
    WORK_COMPLETED: "Work completed",
    CLOSED: "Closed",
    CANCELED: "Canceled",
  },
};

const priorityLabels: Record<Locale, Record<WorkOrderPriority, string>> = {
  ru: { LOW: "Низкий", NORMAL: "Обычный", HIGH: "Высокий", URGENT: "Срочно" },
  en: { LOW: "Low", NORMAL: "Normal", HIGH: "High", URGENT: "Urgent" },
};

export function getStatusLabel(status: WorkOrderStatus, locale: Locale): string {
  // EN: Translate a stable machine status without changing the domain value.
  // RU: Переводит стабильный машинный статус без изменения доменного значения.
  return statusLabels[locale][status];
}

export function getPriorityLabel(priority: WorkOrderPriority, locale: Locale): string {
  // EN: Translate a stable priority value for presentation.
  // RU: Переводит стабильное значение приоритета для интерфейса.
  return priorityLabels[locale][priority];
}

export function getStatusTone(status: WorkOrderStatus): string {
  // EN: Map status semantics to a visual tone while preserving a text label.
  // RU: Сопоставляет статус с визуальным тоном, сохраняя текстовую метку.
  if (["CLOSED", "WORK_COMPLETED"].includes(status)) return "success";
  if (["CANCELED"].includes(status)) return "danger";
  if (["NEW", "PAUSED", "WAITING_FOR_CLIENT", "WAITING_FOR_PARTS"].includes(status)) {
    return "warning";
  }
  if (["EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(status)) return "primary";
  return "neutral";
}
