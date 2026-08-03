import { LoginView } from "@/src/modules/identity/presentation/login-view";

export default function Home() {
  // EN: Serve the public AUTH-01 login route at the product root.
  // RU: Отдаёт публичный экран входа AUTH-01 в корне продукта.
  return <LoginView />;
}
