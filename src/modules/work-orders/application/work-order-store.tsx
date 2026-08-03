"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { NewWorkOrderInput, WorkOrder, WorkOrderStatus } from "../domain/work-order";

type WorkOrderStoreValue = {
  workOrders: WorkOrder[];
  createWorkOrder: (input: NewWorkOrderInput) => Promise<WorkOrder>;
  transitionWorkOrder: (id: string, to: WorkOrderStatus, expectedVersion: number) => Promise<WorkOrder>;
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
}: {
  children: ReactNode;
  orgSlug: string;
  initialWorkOrders: WorkOrder[];
}) {
  // EN: Synchronize the tenant work-order snapshot only with authenticated server commands.
  // RU: Синхронизирует tenant-снимок заявок только через авторизованные серверные команды.
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);

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
    const response = await fetch(
      `/api/organizations/${encodeURIComponent(orgSlug)}/work-orders/${encodeURIComponent(id)}/transition`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, expectedVersion }),
      },
    );
    const updated = await readWorkOrderResponse(response);
    setWorkOrders((current) => current.map((workOrder) => workOrder.id === id ? updated : workOrder));
    return updated;
  }

  return (
    <WorkOrderStore.Provider value={{ workOrders, createWorkOrder, transitionWorkOrder }}>
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
