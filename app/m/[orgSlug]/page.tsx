import { TechnicianApp } from "@/src/modules/technician/presentation/technician-app";

export default async function TechnicianPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  // EN: Serve the dedicated mobile-first technician workspace.
  // RU: Отдаёт отдельное mobile-first рабочее пространство мастера.
  const { orgSlug } = await params;
  return <TechnicianApp orgSlug={orgSlug} />;
}
