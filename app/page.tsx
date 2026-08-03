import { LoginView } from "@/src/modules/identity/presentation/login-view";
import { redirect } from "next/navigation";
import { withRequestDatabase } from "@/db";
import { getDefaultTenantSlug } from "@/src/server/auth/tenant";

export const dynamic = "force-dynamic";

export default async function Home() {
  // EN: Serve the public AUTH-01 login route at the product root.
  // RU: Отдаёт публичный экран входа AUTH-01 в корне продукта.
  return withRequestDatabase(async (database) => {
    const tenantSlug = await getDefaultTenantSlug(database);
    if (tenantSlug) redirect(`/app/${tenantSlug}/dashboard`);
    return <LoginView />;
  });
}
