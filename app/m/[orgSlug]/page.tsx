import { TechnicianApp } from "@/src/modules/technician/presentation/technician-app";
import { withRequestDatabase } from "@/db";
import { requireTenantPageContext } from "@/src/server/auth/tenant";
import { listWorkOrders } from "@/src/server/work-orders/service";
import { canAccessMobileWorkspace } from "@/src/server/auth/permissions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TechnicianPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  // EN: Serve the dedicated mobile-first technician workspace.
  // RU: Отдаёт отдельное mobile-first рабочее пространство мастера.
  return withRequestDatabase(async (database) => {
    const { orgSlug } = await params;
    const context = await requireTenantPageContext(database, orgSlug, `/m/${orgSlug}`);
    if (!canAccessMobileWorkspace(context.role)) notFound();
    const initialWorkOrders = await listWorkOrders(database, context);
    return <TechnicianApp orgSlug={orgSlug} displayName={context.session.displayName} initialWorkOrders={initialWorkOrders} />;
  });
}
