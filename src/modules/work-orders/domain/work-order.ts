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
  appointment: string | null;
  technician: string | null;
  amount: string;
  slaMinutes: number | null;
  version: number;
};

export type NewWorkOrderInput = {
  client: string;
  phone: string;
  title: string;
  address: string;
  priority: WorkOrderPriority;
  scheduledStart: string | null;
};

export const initialWorkOrders: WorkOrder[] = [
  {
    id: "wo-1048",
    number: "WO-1048",
    client: "Layla Hassan",
    phone: "+971 50 441 2048",
    title: { ru: "Кондиционер не охлаждает", en: "AC is not cooling" },
    address: { ru: "Dubai Marina · Marina Gate", en: "Dubai Marina · Marina Gate" },
    status: "NEW",
    priority: "URGENT",
    appointment: null,
    technician: null,
    amount: "AED 0.00",
    slaMinutes: 18,
    version: 1,
  },
  {
    id: "wo-1047",
    number: "WO-1047",
    client: "Omar Al Mansoori",
    phone: "+971 55 820 7142",
    title: { ru: "Протечка под мойкой", en: "Leak under kitchen sink" },
    address: { ru: "JVC · District 12", en: "JVC · District 12" },
    status: "SCHEDULED",
    priority: "HIGH",
    appointment: "09:00–10:30",
    technician: "Илья Волков",
    amount: "AED 420.00",
    slaMinutes: 52,
    version: 3,
  },
  {
    id: "wo-1046",
    number: "WO-1046",
    client: "Nadia Karim",
    phone: "+971 52 110 9230",
    title: { ru: "Диагностика стиральной машины", en: "Washing machine diagnostics" },
    address: { ru: "Business Bay · Merano Tower", en: "Business Bay · Merano Tower" },
    status: "EN_ROUTE",
    priority: "NORMAL",
    appointment: "10:30–12:00",
    technician: "Марк Орлов",
    amount: "AED 210.00",
    slaMinutes: null,
    version: 5,
  },
  {
    id: "wo-1045",
    number: "WO-1045",
    client: "Cedar Café LLC",
    phone: "+971 4 338 9051",
    title: { ru: "Плановое обслуживание кофемашины", en: "Coffee machine maintenance" },
    address: { ru: "DIFC · Gate Avenue", en: "DIFC · Gate Avenue" },
    status: "IN_PROGRESS",
    priority: "NORMAL",
    appointment: "08:30–11:00",
    technician: "Самир Хан",
    amount: "AED 780.00",
    slaMinutes: null,
    version: 7,
  },
  {
    id: "wo-1044",
    number: "WO-1044",
    client: "Maya Petrova",
    phone: "+971 58 932 4461",
    title: { ru: "Замена смесителя", en: "Faucet replacement" },
    address: { ru: "Palm Jumeirah · Shoreline", en: "Palm Jumeirah · Shoreline" },
    status: "WAITING_FOR_CLIENT",
    priority: "LOW",
    appointment: "13:00–14:00",
    technician: "Илья Волков",
    amount: "AED 365.00",
    slaMinutes: 96,
    version: 4,
  },
  {
    id: "wo-1043",
    number: "WO-1043",
    client: "Aster Medical Center",
    phone: "+971 4 552 3009",
    title: { ru: "Сервис системы вентиляции", en: "Ventilation system service" },
    address: { ru: "Al Barsha · Al Murad Tower", en: "Al Barsha · Al Murad Tower" },
    status: "WORK_COMPLETED",
    priority: "HIGH",
    appointment: "07:30–09:30",
    technician: "Марк Орлов",
    amount: "AED 1,940.00",
    slaMinutes: null,
    version: 9,
  },
  {
    id: "wo-1042",
    number: "WO-1042",
    client: "Rami Haddad",
    phone: "+971 56 608 1304",
    title: { ru: "Ремонт электрического щита", en: "Electrical panel repair" },
    address: { ru: "Arabian Ranches 2", en: "Arabian Ranches 2" },
    status: "CLOSED",
    priority: "HIGH",
    appointment: "02 Aug · 15:00",
    technician: "Самир Хан",
    amount: "AED 1,280.00",
    slaMinutes: null,
    version: 12,
  },
];

export function localizeText(text: LocalizedText, locale: Locale): string {
  // EN: Resolve tenant content using the active interface locale.
  // RU: Возвращает контент организации на активном языке интерфейса.
  return text[locale];
}
