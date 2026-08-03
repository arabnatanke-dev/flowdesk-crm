"use client";

import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Command,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { LanguageSwitch } from "./language-switch";
import { DashboardView } from "@/src/modules/dashboard/presentation/dashboard-view";
import { WorkOrdersView } from "@/src/modules/work-orders/presentation/work-orders-view";
import { DispatchView } from "@/src/modules/dispatch/presentation/dispatch-view";
import { CatalogView, ClientsView, FinanceView, ReportsView, SettingsView, TeamView } from "@/src/modules/overview/presentation/business-views";
import { useWorkOrders } from "@/src/modules/work-orders/application/work-order-store";
import type { NewWorkOrderInput, WorkOrderPriority } from "@/src/modules/work-orders/domain/work-order";

export type OfficeSection = "dashboard" | "work-orders" | "dispatch" | "clients" | "team" | "catalog" | "finance" | "reports" | "settings";

type FlowDeskShellProps = {
  section: OfficeSection;
};

export function FlowDeskShell({ section }: FlowDeskShellProps) {
  // EN: Compose the role-aware office shell around independently bounded module views.
  // RU: Собирает роль-ориентированную office-оболочку вокруг независимых модулей.
  const { locale, messages: t } = useLocale();
  const { workOrders } = useWorkOrders();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [toast, setToast] = useState("");

  const navigation = [
    { key: "dashboard" as const, label: t.dashboard, href: "/app/horizon/dashboard", icon: LayoutDashboard },
    { key: "work-orders" as const, label: t.workOrders, href: "/app/horizon/work-orders", icon: BriefcaseBusiness, badge: workOrders.filter((order) => order.status === "NEW").length },
    { key: "dispatch" as const, label: t.dispatch, href: "/app/horizon/dispatch", icon: CalendarDays },
    { key: "clients" as const, label: t.clients, href: "/app/horizon/clients", icon: UsersRound },
    { key: "team" as const, label: t.team, href: "/app/horizon/team", icon: Wrench },
    { key: "catalog" as const, label: t.catalog, href: "/app/horizon/catalog", icon: Package },
    { key: "finance" as const, label: t.finance, href: "/app/horizon/finance", icon: WalletCards },
    { key: "reports" as const, label: t.reports, href: "/app/horizon/reports", icon: FileBarChart },
  ];

  useEffect(() => {
    // EN: Open the authorized global search from the shared keyboard shortcut.
    // RU: Открывает авторизованный глобальный поиск общей горячей клавишей.
    function handleShortcut(event: KeyboardEvent) {
      // EN: Ignore regular typing and react only to Cmd/Ctrl + K or Escape.
      // RU: Игнорирует обычный ввод и реагирует только на Cmd/Ctrl + K или Escape.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCreateOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const searchResults = useMemo(() => {
    // EN: Search only resources already available inside the active tenant context.
    // RU: Ищет только ресурсы, доступные в активном tenant-контексте.
    const normalized = commandQuery.trim().toLowerCase();
    if (!normalized) return workOrders.slice(0, 4);
    return workOrders.filter((order) => `${order.number} ${order.client} ${order.phone} ${order.title.ru} ${order.title.en}`.toLowerCase().includes(normalized)).slice(0, 6);
  }, [commandQuery, workOrders]);

  function openCreateDrawer() {
    // EN: Open the focused work-order creation flow without losing the active route.
    // RU: Открывает форму новой заявки без потери контекста текущего раздела.
    setCreateOpen(true);
  }

  function showCreatedToast() {
    // EN: Confirm the completed mutation in a temporary, non-exclusive status message.
    // RU: Подтверждает завершённую мутацию временным, не единственным сообщением.
    setToast(t.createdSuccess);
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`app-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand-row">
          <Link className="brand-lockup" href="/app/horizon/dashboard" aria-label="FlowDesk CRM">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <strong>FlowDesk</strong>
          </Link>
          <button className="mobile-close" type="button" onClick={() => setMobileMenuOpen(false)} aria-label={t.close}><X size={20} /></button>
        </div>

        <button className="tenant-switcher" type="button">
          <span className="tenant-logo">HS</span>
          <span><small>{t.organization}</small><strong>{t.demoCompany}</strong></span>
          <ChevronDown size={15} />
        </button>

        <nav className="sidebar-nav" aria-label="Primary">
          <span className="nav-group-label">WORKSPACE</span>
          {navigation.map(({ key, label, href, icon: Icon, badge }) => (
            <Link className={section === key ? "is-active" : ""} href={href} key={key}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{badge ? <em>{badge}</em> : null}
            </Link>
          ))}
        </nav>

        <nav className="sidebar-nav sidebar-nav-bottom" aria-label="Secondary">
          <Link className={section === "settings" ? "is-active" : ""} href="/app/horizon/settings"><Settings size={19} strokeWidth={1.8} /><span>{t.settings}</span></Link>
          <a href="#help"><BookOpen size={19} strokeWidth={1.8} /><span>{t.help}</span></a>
        </nav>

        <div className="sidebar-user">
          <span className="avatar avatar-blue">АС</span>
          <span><strong>{t.userName}</strong><small>{t.userRole}</small></span>
          <ChevronDown size={15} />
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-menu-backdrop" type="button" onClick={() => setMobileMenuOpen(false)} aria-label={t.close} />}

      <div className="app-main-column">
        <header className="app-topbar">
          <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Menu"><Menu size={21} /></button>
          <button className="global-search-trigger" type="button" onClick={() => setSearchOpen(true)}>
            <Search size={17} /><span>{t.searchHint}</span><kbd>{t.commandHint}</kbd>
          </button>
          <div className="topbar-actions">
            <LanguageSwitch compact />
            <button className="icon-button topbar-icon" type="button" aria-label={t.help}><CircleHelp size={19} /></button>
            <button className="icon-button topbar-icon notification-button" type="button" aria-label={t.notifications}><Bell size={19} /><span /></button>
            <button className="quick-create-button" type="button" onClick={openCreateDrawer}><Plus size={19} /><span>{t.create}</span></button>
          </div>
        </header>

        <main id="main-content" className="app-content">
          <CurrentSection section={section} onOpenCreate={openCreateDrawer} />
        </main>
      </div>

      {createOpen && <CreateWorkOrderDrawer onClose={() => setCreateOpen(false)} onCreated={showCreatedToast} />}

      {searchOpen && (
        <div className="command-overlay" role="dialog" aria-modal="true" aria-label={t.search}>
          <button className="command-backdrop" type="button" onClick={() => setSearchOpen(false)} aria-label={t.close} />
          <div className="command-panel">
            <label><Search size={20} /><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder={t.searchHint} /><kbd>ESC</kbd></label>
            <div className="command-results">
              <span className="command-group-label">{t.workOrders}</span>
              {searchResults.map((order) => <Link href={`/app/horizon/work-orders?selected=${order.id}`} key={order.id}><span className="command-result-icon"><BriefcaseBusiness size={17} /></span><span><strong>{order.number} · {order.client}</strong><small>{order.title[locale]}</small></span><span className="command-open"><Command size={13} /> ↵</span></Link>)}
              <span className="command-group-label">{locale === "ru" ? "Быстрые действия" : "Quick actions"}</span>
              <button type="button" onClick={() => { setSearchOpen(false); openCreateDrawer(); }}><span className="command-result-icon"><Plus size={17} /></span><span><strong>{t.newWorkOrder}</strong><small>{locale === "ru" ? "Создать новый операционный aggregate" : "Create a new operational aggregate"}</small></span></button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-message" role="status"><span className="toast-check">✓</span>{toast}<button type="button" onClick={() => setToast("")} aria-label={t.close}><X size={15} /></button></div>}
    </div>
  );
}

function CurrentSection({ section, onOpenCreate }: { section: OfficeSection; onOpenCreate: () => void }) {
  // EN: Route the office shell to one bounded presentation module.
  // RU: Направляет office-оболочку к одному ограниченному presentation-модулю.
  switch (section) {
    case "work-orders": return <WorkOrdersView onOpenCreate={onOpenCreate} />;
    case "dispatch": return <DispatchView onOpenCreate={onOpenCreate} />;
    case "clients": return <ClientsView />;
    case "team": return <TeamView />;
    case "catalog": return <CatalogView />;
    case "finance": return <FinanceView />;
    case "reports": return <ReportsView />;
    case "settings": return <SettingsView />;
    default: return <DashboardView onOpenCreate={onOpenCreate} />;
  }
}

function CreateWorkOrderDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  // EN: Capture the minimum safe inputs for a NEW work-order command.
  // RU: Собирает минимально безопасные данные для команды создания NEW-заявки.
  const { messages: t } = useLocale();
  const { createWorkOrder } = useWorkOrders();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    // EN: Validate the client boundary before passing normalized data to the application module.
    // RU: Валидирует клиентскую границу перед передачей нормализованных данных в прикладной модуль.
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: NewWorkOrderInput = {
      client: String(form.get("client") ?? ""),
      phone: String(form.get("phone") ?? ""),
      title: String(form.get("title") ?? ""),
      address: String(form.get("address") ?? ""),
      priority: String(form.get("priority") ?? "NORMAL") as WorkOrderPriority,
      appointment: String(form.get("appointment") ?? ""),
    };
    const nextErrors: Record<string, string> = {};
    if (!input.client.trim()) nextErrors.client = t.required;
    if (!input.title.trim()) nextErrors.title = t.required;
    if (!input.address.trim()) nextErrors.address = t.required;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    createWorkOrder(input);
    onCreated();
    onClose();
  }

  return (
    <aside className="detail-drawer create-drawer" aria-label={t.createWorkOrder}>
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label={t.close} />
      <form className="drawer-panel" onSubmit={handleCreate} noValidate>
        <div className="drawer-heading"><div><span className="eyebrow">WO-02 · NEW</span><h2>{t.createWorkOrder}</h2><p>{t.createWorkOrderHint}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label={t.close}><X size={19} /></button></div>
        <div className="form-stack">
          <label className={`field-label ${errors.client ? "has-error" : ""}`}><span>{t.clientName} *</span><input name="client" placeholder="Layla Hassan" aria-describedby={errors.client ? "client-error" : undefined} />{errors.client && <small id="client-error">{errors.client}</small>}</label>
          <label className="field-label"><span>{t.phone}</span><input name="phone" type="tel" placeholder="+971 50 000 0000" /></label>
          <label className={`field-label ${errors.title ? "has-error" : ""}`}><span>{t.jobTitle} *</span><input name="title" placeholder="AC is not cooling" />{errors.title && <small>{errors.title}</small>}</label>
          <label className={`field-label ${errors.address ? "has-error" : ""}`}><span>{t.serviceAddress} *</span><input name="address" placeholder="Dubai Marina · Marina Gate" />{errors.address && <small>{errors.address}</small>}</label>
          <div className="form-grid two-columns">
            <label className="field-label"><span>{t.priorityLabel}</span><select name="priority" defaultValue="NORMAL"><option value="LOW">LOW</option><option value="NORMAL">NORMAL</option><option value="HIGH">HIGH</option><option value="URGENT">URGENT</option></select></label>
            <label className="field-label"><span>{t.preferredWindow}</span><select name="appointment" defaultValue=""><option value="">—</option><option value="09:00–10:30">09:00–10:30</option><option value="13:00–14:30">13:00–14:30</option><option value="15:00–16:30">15:00–16:30</option></select></label>
          </div>
        </div>
        <footer className="drawer-footer"><button className="secondary-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit"><Plus size={17} />{t.create}</button></footer>
      </form>
    </aside>
  );
}
