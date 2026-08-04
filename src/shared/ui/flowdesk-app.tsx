"use client";

import { WorkOrderProvider } from "@/src/modules/work-orders/application/work-order-store";
import type { TechnicianOption, WorkOrder } from "@/src/modules/work-orders/domain/work-order";
import type { MembershipRole } from "@/src/server/auth/permissions";
import type { OrganizationSettings } from "@/src/server/settings/service";
import { FlowDeskShell, type OfficeSection } from "./flowdesk-shell";

type FlowDeskAppProps = {
  orgSlug: string;
  organizationName: string;
  displayName: string;
  role: MembershipRole;
  initialSettings: OrganizationSettings;
  section: OfficeSection;
  initialWorkOrders: WorkOrder[];
  initialTechnicians: TechnicianOption[];
  nowIso: string;
};

export function FlowDeskApp({ orgSlug, organizationName, displayName, role, initialSettings, section, initialWorkOrders, initialTechnicians, nowIso }: FlowDeskAppProps) {
  // EN: Install application-level module providers around the requested office section.
  // RU: Подключает прикладные провайдеры модулей вокруг выбранного office-раздела.
  return (
    <WorkOrderProvider orgSlug={orgSlug} initialWorkOrders={initialWorkOrders} initialTechnicians={initialTechnicians}>
      <FlowDeskShell orgSlug={orgSlug} organizationName={organizationName} displayName={displayName} role={role} initialSettings={initialSettings} section={section} nowIso={nowIso} />
    </WorkOrderProvider>
  );
}
