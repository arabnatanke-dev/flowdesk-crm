"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { canTransition } from "../domain/state-machine";
import {
  initialWorkOrders,
  type NewWorkOrderInput,
  type WorkOrder,
  type WorkOrderStatus,
} from "../domain/work-order";

type WorkOrderStoreValue = {
  workOrders: WorkOrder[];
  createWorkOrder: (input: NewWorkOrderInput) => WorkOrder;
  transitionWorkOrder: (id: string, to: WorkOrderStatus) => void;
};

const WorkOrderStore = createContext<WorkOrderStoreValue | null>(null);

export function WorkOrderProvider({ children }: { children: ReactNode }) {
  // EN: Own the demo aggregate state behind a module-level application boundary.
  // RU: Хранит демонстрационное состояние агрегата за границей прикладного модуля.
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const nextSequence = useRef(1049);

  function createWorkOrder(input: NewWorkOrderInput): WorkOrder {
    // EN: Create a normalized NEW aggregate with an independent optimistic version.
    // RU: Создаёт нормализованный агрегат NEW с отдельной оптимистической версией.
    const allocatedSequence = nextSequence.current;
    nextSequence.current += 1;
    const created: WorkOrder = {
      id: `wo-${allocatedSequence}`,
      number: `WO-${allocatedSequence}`,
      client: input.client.trim(),
      phone: input.phone.trim(),
      title: { ru: input.title.trim(), en: input.title.trim() },
      address: { ru: input.address.trim(), en: input.address.trim() },
      status: input.appointment ? "SCHEDULED" : "NEW",
      priority: input.priority,
      appointment: input.appointment || null,
      technician: null,
      amount: "AED 0.00",
      slaMinutes: 120,
      version: 1,
    };
    setWorkOrders((current) => [created, ...current]);
    return created;
  }

  function transitionWorkOrder(id: string, to: WorkOrderStatus): void {
    // EN: Apply a domain-approved transition and bump the aggregate version.
    // RU: Применяет разрешённый доменом переход и увеличивает версию агрегата.
    setWorkOrders((current) =>
      current.map((workOrder) => {
        if (workOrder.id !== id || !canTransition(workOrder.status, to)) {
          return workOrder;
        }
        return { ...workOrder, status: to, version: workOrder.version + 1 };
      }),
    );
  }

  const value = { workOrders, createWorkOrder, transitionWorkOrder };

  return (
    <WorkOrderStore.Provider value={value}>{children}</WorkOrderStore.Provider>
  );
}

export function useWorkOrders(): WorkOrderStoreValue {
  // EN: Give presentation code access to the module's public application API.
  // RU: Даёт интерфейсу доступ к публичному прикладному API модуля.
  const context = useContext(WorkOrderStore);
  if (!context) {
    throw new Error("useWorkOrders must be used within WorkOrderProvider");
  }
  return context;
}
