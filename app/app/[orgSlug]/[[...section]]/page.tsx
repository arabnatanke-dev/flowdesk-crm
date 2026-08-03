import { FlowDeskApp } from "@/src/shared/ui/flowdesk-app";
import type { OfficeSection } from "@/src/shared/ui/flowdesk-shell";

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

function resolveSection(value: string | undefined): OfficeSection {
  // EN: Safely map a URL segment to an authorized office presentation module.
  // RU: Безопасно сопоставляет URL-сегмент с разрешённым office-модулем.
  return value && officeSections.has(value as OfficeSection) ? (value as OfficeSection) : "dashboard";
}

export default async function OfficePage({ params }: { params: Promise<{ orgSlug: string; section?: string[] }> }) {
  // EN: Render one module inside the shared tenant workspace route.
  // RU: Отображает один модуль внутри общей tenant-route рабочего пространства.
  const resolvedParams = await params;
  return <FlowDeskApp section={resolveSection(resolvedParams.section?.[0])} />;
}
