"use client";

import { WorkOrderProvider } from "@/src/modules/work-orders/application/work-order-store";
import { FlowDeskShell, type OfficeSection } from "./flowdesk-shell";

export function FlowDeskApp({ section }: { section: OfficeSection }) {
  // EN: Install application-level module providers around the requested office section.
  // RU: Подключает прикладные провайдеры модулей вокруг выбранного office-раздела.
  return (
    <WorkOrderProvider>
      <FlowDeskShell section={section} />
    </WorkOrderProvider>
  );
}
