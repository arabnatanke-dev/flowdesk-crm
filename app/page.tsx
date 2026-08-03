import { LoginView } from "@/src/modules/identity/presentation/login-view";
import { redirect } from "next/navigation";
import { getDefaultTenantSlug } from "@/src/server/auth/tenant";

export default async function Home() {
  // EN: Serve the public AUTH-01 login route at the product root.
  // RU: Отдаёт публичный экран входа AUTH-01 в корне продукта.
  const tenantSlug = await getDefaultTenantSlug();
  if (tenantSlug) redirect(`/app/${tenantSlug}/dashboard`);
  return <LoginView />;
}
