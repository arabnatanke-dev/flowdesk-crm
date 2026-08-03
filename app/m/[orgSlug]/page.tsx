import { TechnicianApp } from "@/src/modules/technician/presentation/technician-app";
import { requireTenantPageContext } from "@/src/server/auth/tenant";
import { listWorkOrders } from "@/src/server/work-orders/service";

export default async function TechnicianPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  // EN: Serve the dedicated mobile-first technician workspace.
  // RU: Отдаёт отдельное mobile-first рабочее пространство мастера.
  const { orgSlug } = await params;
  const context = await requireTenantPageContext(orgSlug, `/m/${orgSlug}`);
  const initialWorkOrders = await listWorkOrders(context);
  return <TechnicianApp orgSlug={orgSlug} displayName={context.session.displayName} initialWorkOrders={initialWorkOrders} />;
}
