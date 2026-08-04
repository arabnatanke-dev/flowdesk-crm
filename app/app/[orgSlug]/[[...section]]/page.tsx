import { FlowDeskApp } from "@/src/shared/ui/flowdesk-app";
import type { OfficeSection } from "@/src/shared/ui/flowdesk-shell";
import { withRequestDatabase } from "@/db";
import { requireTenantPageContext } from "@/src/server/auth/tenant";
import { listAssignableTechnicians, listWorkOrders } from "@/src/server/work-orders/service";
import { redirect } from "next/navigation";
import { canAccessOfficeSection, canReadWorkOrders, getDefaultOfficeSection } from "@/src/server/auth/permissions";

const officeSections = new Set<OfficeSection>([
  "dashboard",
  "work-orders",
  "dispatch",
  "clients",
  "team",
  "catalog",
  "finance",
  "reports",
  "settings",
]);

export const dynamic = "force-dynamic";

function resolveSection(value: string | undefined): OfficeSection {
  // EN: Safely map a URL segment to an authorized office presentation module.
  // RU: Безопасно сопоставляет URL-сегмент с разрешённым office-модулем.
  return value && officeSections.has(value as OfficeSection) ? (value as OfficeSection) : "dashboard";
}

export default async function OfficePage({ params }: { params: Promise<{ orgSlug: string; section?: string[] }> }) {
  // EN: Render one module inside the shared tenant workspace route.
  // RU: Отображает один модуль внутри общей tenant-route рабочего пространства.
  return withRequestDatabase(async (database) => {
    const resolvedParams = await params;
    const activeSection = resolveSection(resolvedParams.section?.[0]);
    const context = await requireTenantPageContext(database, resolvedParams.orgSlug, `/app/${resolvedParams.orgSlug}/${activeSection}`);
    if (!canAccessOfficeSection(context.role, activeSection)) {
      const defaultSection = getDefaultOfficeSection(context.role);
      redirect(defaultSection ? `/app/${context.organization.slug}/${defaultSection}` : `/m/${context.organization.slug}`);
    }
    const [initialWorkOrders, initialTechnicians] = await Promise.all([
      canReadWorkOrders(context.role) ? listWorkOrders(database, context) : Promise.resolve([]),
      listAssignableTechnicians(database, context),
    ]);
    return (
      <FlowDeskApp
        orgSlug={context.organization.slug}
        organizationName={context.organization.name}
        displayName={context.session.displayName}
        role={context.role}
        initialSettings={{
          name: context.organization.name,
          defaultLocale: context.organization.defaultLocale as "ru" | "en",
          timezone: context.organization.timezone,
          currency: context.organization.currency,
          taxRateBps: context.organization.taxRateBps,
          version: context.organization.settingsVersion,
        }}
        section={activeSection}
        initialWorkOrders={initialWorkOrders}
        initialTechnicians={initialTechnicians}
        nowIso={new Date().toISOString()}
      />
    );
  });
}
