import { TechnicianApp } from "@/src/modules/technician/presentation/technician-app";
import { requireTenantPageContext } from "@/src/server/auth/tenant";
import { listWorkOrders } from "@/src/server/work-orders/service";
import { canAccessMobileWorkspace } from "@/src/server/auth/permissions";
import { notFound } from "next/navigation";

export default async function TechnicianPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  // EN: Serve the dedicated mobile-first technician workspace.
  // RU: Отдаёт отдельное mobile-first рабочее пространство мастера.
  const { orgSlug } = await params;
  const context = await requireTenantPageContext(orgSlug, `/m/${orgSlug}`);
  if (!canAccessMobileWorkspace(context.role)) notFound();
  const initialWorkOrders = await listWorkOrders(context);
  return <TechnicianApp orgSlug={orgSlug} displayName={context.session.displayName} initialWorkOrders={initialWorkOrders} />;
}
