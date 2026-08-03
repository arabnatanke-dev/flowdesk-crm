"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  NewWorkOrderInput,
  ScheduleWorkOrderInput,
  TechnicianOption,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderStatus,
} from "../domain/work-order";

type WorkOrderStoreValue = {
  workOrders: WorkOrder[];
  technicians: TechnicianOption[];
  createWorkOrder: (input: NewWorkOrderInput) => Promise<WorkOrder>;
  transitionWorkOrder: (id: string, to: WorkOrderStatus, expectedVersion: number) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, input: UpdateWorkOrderInput, expectedVersion: number) => Promise<WorkOrder>;
  assignWorkOrder: (id: string, technicianId: string | null, expectedVersion: number) => Promise<WorkOrder>;
  scheduleWorkOrder: (id: string, input: ScheduleWorkOrderInput, expectedVersion: number) => Promise<WorkOrder>;
};

type ApiEnvelope = {
  workOrder?: WorkOrder;
  error?: { message?: string };
};

const WorkOrderStore = createContext<WorkOrderStoreValue | null>(null);

async function readWorkOrderResponse(response: Response): Promise<WorkOrder> {
  // EN: Convert the stable API envelope to a work order or a safe user-facing failure.
  // RU: Преобразует стабильный API-конверт в заявку или безопасную пользовательскую ошибку.
  const payload = await response.json() as ApiEnvelope;
  if (!response.ok || !payload.workOrder) throw new Error(payload.error?.message ?? "Work-order command failed.");
  return payload.workOrder;
}

export function WorkOrderProvider({
  children,
  orgSlug,
  initialWorkOrders,
  initialTechnicians,
}: {
  children: ReactNode;
  orgSlug: string;
  initialWorkOrders: WorkOrder[];
  initialTechnicians: TechnicianOption[];
}) {
  // EN: Synchronize the tenant work-order snapshot only with authenticated server commands.
  // RU: Синхронизирует tenant-снимок заявок только через авторизованные серверные команды.
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);

  function replaceWorkOrder(updated: WorkOrder): WorkOrder {
    // EN: Replace one aggregate with the server-confirmed version and return it to the caller.
    // RU: Заменяет один агрегат подтверждённой сервером версией и возвращает его вызывающему коду.
    setWorkOrders((current) => current.map((workOrder) => workOrder.id === updated.id ? updated : workOrder));
    return updated;
  }

  async function sendWorkOrderCommand(id: string, suffix: string, method: "POST" | "PATCH", body: unknown): Promise<WorkOrder> {
    // EN: Send a mutation to one encoded tenant work-order endpoint and normalize its response.
    // RU: Отправляет мутацию на кодированный tenant-endpoint заявки и нормализует ответ.
    const response = await fetch(
      `/api/organizations/${encodeURIComponent(orgSlug)}/work-orders/${encodeURIComponent(id)}${suffix}`,
      { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    );
    return replaceWorkOrder(await readWorkOrderResponse(response));
  }

  async function createWorkOrder(input: NewWorkOrderInput): Promise<WorkOrder> {
    // EN: Persist creation through the tenant API before adding the confirmed aggregate locally.
    // RU: Сохраняет создание через tenant API до добавления подтверждённого агрегата локально.
    const response = await fetch(`/api/organizations/${encodeURIComponent(orgSlug)}/work-orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const created = await readWorkOrderResponse(response);
    setWorkOrders((current) => [created, ...current]);
    return created;
  }

  async function transitionWorkOrder(id: string, to: WorkOrderStatus, expectedVersion: number): Promise<WorkOrder> {
    // EN: Replace local state only after the server validates role, transition and optimistic version.
    // RU: Обновляет локальное состояние только после проверки сервером роли, перехода и optimistic version.
    return sendWorkOrderCommand(id, "/transition", "POST", { to, expectedVersion });
  }

  async function updateWorkOrder(id: string, input: UpdateWorkOrderInput, expectedVersion: number): Promise<WorkOrder> {
    // EN: Persist editable work-order content before replacing the local aggregate.
    // RU: Сохраняет редактируемое содержимое заявки до замены локального агрегата.
    return sendWorkOrderCommand(id, "", "PATCH", { ...input, expectedVersion });
  }

  async function assignWorkOrder(id: string, technicianId: string | null, expectedVersion: number): Promise<WorkOrder> {
    // EN: Persist a tenant-safe technician assignment through the dedicated command endpoint.
    // RU: Сохраняет безопасное tenant-назначение техника через отдельный command-endpoint.
    return sendWorkOrderCommand(id, "/assign", "POST", { technicianId, expectedVersion });
  }

  async function scheduleWorkOrder(id: string, input: ScheduleWorkOrderInput, expectedVersion: number): Promise<WorkOrder> {
    // EN: Persist an absolute service window through the dedicated scheduling command.
    // RU: Сохраняет абсолютное сервисное окно через отдельную scheduling-команду.
    return sendWorkOrderCommand(id, "/schedule", "POST", { ...input, expectedVersion });
  }

  return (
    <WorkOrderStore.Provider value={{
      workOrders,
      technicians: initialTechnicians,
      createWorkOrder,
      transitionWorkOrder,
      updateWorkOrder,
      assignWorkOrder,
      scheduleWorkOrder,
    }}>
      {children}
    </WorkOrderStore.Provider>
  );
}

export function useWorkOrders(): WorkOrderStoreValue {
  // EN: Give presentation code access to the module's authenticated application API.
  // RU: Даёт интерфейсу доступ к авторизованному прикладному API модуля.
  const context = useContext(WorkOrderStore);
  if (!context) throw new Error("useWorkOrders must be used within WorkOrderProvider");
  return context;
}
