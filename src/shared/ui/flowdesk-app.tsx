"use client";

import { WorkOrderProvider } from "@/src/modules/work-orders/application/work-order-store";
import { FlowDeskShell, type OfficeSection } from "./flowdesk-shell";

export function FlowDeskApp({ orgSlug, section }: { orgSlug: string; section: OfficeSection }) {
  // EN: Install application-level module providers around the requested office section.
  // RU: Подключает прикладные провайдеры модулей вокруг выбранного office-раздела.
  return (
    <WorkOrderProvider>
      <FlowDeskShell orgSlug={orgSlug} section={section} />
    </WorkOrderProvider>
  );
}
