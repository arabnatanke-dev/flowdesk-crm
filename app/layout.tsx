import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/src/shared/i18n/locale-context";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  // EN: Derive absolute social metadata from the incoming request host.
  // RU: Формирует абсолютные social metadata на основе host входящего запроса.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "flowdesk.example";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const ogImage = new URL("/og.png", origin).toString();

  return {
    title: { default: "FlowDesk CRM", template: "%s · FlowDesk CRM" },
    description: "Commercial field service CRM for work orders, dispatch, clients and finance.",
    applicationName: "FlowDesk CRM",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      title: "FlowDesk CRM",
      description: "Сервис. Выезды. Оплата. Под контролем.",
      images: [{ url: ogImage, width: 1792, height: 896, alt: "FlowDesk CRM operational workspace" }],
    },
    twitter: { card: "summary_large_image", title: "FlowDesk CRM", description: "From first call to final payment.", images: [ogImage] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // EN: Install global localization while keeping the document light-theme and accessible.
  // RU: Подключает глобальную локализацию и сохраняет доступную светлую тему документа.
  return (
    <html lang="ru">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
