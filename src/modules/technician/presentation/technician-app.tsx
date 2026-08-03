"use client";

import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  MapPin,
  Navigation,
  Package,
  Phone,
  Play,
  UserRound,
  Wifi,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { LanguageSwitch } from "@/src/shared/ui/language-switch";
import type { WorkOrder, WorkOrderStatus } from "@/src/modules/work-orders/domain/work-order";
import { getStatusLabel } from "@/src/modules/work-orders/presentation/formatters";

const fieldProgression: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  DISPATCHED: "EN_ROUTE",
  EN_ROUTE: "ON_SITE",
  ON_SITE: "IN_PROGRESS",
  IN_PROGRESS: "WORK_COMPLETED",
};

export function TechnicianApp({ orgSlug, displayName, initialWorkOrders }: { orgSlug: string; displayName: string; initialWorkOrders: WorkOrder[] }) {
  // EN: Render the mobile-first technician flow with explicit server-confirmed states.
  // RU: Отображает mobile-first сценарий мастера с явными подтверждёнными статусами.
  const { locale, messages: t } = useLocale();
  const [workOrders, setWorkOrders] = useState(initialWorkOrders);
  const [checked, setChecked] = useState([true, true, false, false]);
  const [pending, setPending] = useState(false);
  const [commandError, setCommandError] = useState("");
  const job = workOrders[0] ?? null;
  const nextStatus = job ? fieldProgression[job.status] ?? null : null;
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  async function advanceState() {
    // EN: Ask the server to validate assignment, role, transition and version before updating the mobile card.
    // RU: Просит сервер проверить назначение, роль, переход и версию до обновления мобильной карточки.
    if (!job || !nextStatus) return;
    setPending(true);
    setCommandError("");
    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(orgSlug)}/work-orders/${encodeURIComponent(job.id)}/transition`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: nextStatus, expectedVersion: job.version }),
      });
      const payload = await response.json() as { workOrder?: WorkOrder; error?: { message?: string } };
      if (!response.ok || !payload.workOrder) throw new Error(payload.error?.message ?? "Transition failed.");
      setWorkOrders((current) => current.map((workOrder) => workOrder.id === job.id ? payload.workOrder as WorkOrder : workOrder));
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Transition failed.");
    } finally {
      setPending(false);
    }
  }

  function toggleChecklist(index: number) {
    // EN: Save a local checklist draft while keeping final completion server-gated.
    // RU: Сохраняет локальный draft чек-листа, оставляя финальное завершение серверной командой.
    setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  return (
    <main className="technician-app">
      <header className="technician-header">
        <Link className="brand-lockup" href={`/m/${orgSlug}`}><span className="brand-mark"><span /><span /><span /></span><strong>FlowDesk</strong></Link>
        <div><LanguageSwitch compact /><button className="icon-button notification-button" type="button" disabled><Bell size={19} /><span /></button></div>
      </header>

      <section className="technician-content">
        <div className="mobile-welcome"><div><span>{t.today}</span><h1>{t.technicianToday}</h1><p>{workOrders.length} {t.jobsToday}</p></div><span className="avatar avatar-blue">{initials}</span></div>
        <div className="sync-banner"><Wifi size={16} /><span>{t.syncOnline}</span><Check size={15} /></div>

        {job ? <section className="next-job-card">
          <div className="next-job-top"><span>{t.nextJob}</span><strong>{job.appointment ?? "—"}</strong></div>
          <div className="job-status-line"><span className={`mobile-status state-${job.status.toLowerCase()}`}>{getStatusLabel(job.status, locale)}</span><span>{job.number}</span></div>
          <h2>{job.title[locale]}</h2>
          <p>{job.client}</p>
          <div className="job-address"><MapPin size={18} /><div><strong>{job.address[locale]}</strong></div></div>
          <div className="mobile-quick-actions"><a href={`tel:${job.phone}`}><Phone size={19} /><span>{t.callClient}</span></a><a href="https://maps.google.com" target="_blank" rel="noreferrer"><Navigation size={19} /><span>{t.route}</span></a></div>
          {commandError && <p className="form-error" role="alert">{commandError}</p>}
          <button className="mobile-primary-action" type="button" onClick={advanceState} disabled={!nextStatus || pending}>{job.status === "DISPATCHED" ? <Navigation size={20} /> : job.status === "ON_SITE" ? <Play size={20} /> : <CheckCircle2 size={20} />}{pending ? "…" : nextStatus ? getStatusLabel(nextStatus, locale) : (locale === "ru" ? "Нет доступного действия" : "No available action")}<ChevronRight size={18} /></button>
        </section> : <section className="next-job-card"><h2>{locale === "ru" ? "Нет доступных заявок" : "No work orders available"}</h2></section>}

        <section className="mobile-task-section">
          <div className="mobile-section-heading"><div><ClipboardCheck size={19} /><h2>{t.checklist}</h2></div><span>{checked.filter(Boolean).length}/4</span></div>
          <div className="mobile-checklist">
            {[locale === "ru" ? "Подтвердить доступ к оборудованию" : "Confirm equipment access", locale === "ru" ? "Отключить подачу воды" : "Shut off water supply", locale === "ru" ? "Сфотографировать состояние до работ" : "Capture before photo", locale === "ru" ? "Проверить герметичность после ремонта" : "Run leak test after repair"].map((label, index) => <button type="button" key={label} onClick={() => toggleChecklist(index)} className={checked[index] ? "is-checked" : ""}><span>{checked[index] && <Check size={16} />}</span>{label}</button>)}
          </div>
        </section>

        <section className="mobile-tool-grid">
          <button type="button" disabled><span><Package size={21} /></span><strong>{t.materials}</strong><small>2 items</small></button>
          <button type="button" disabled><span><Camera size={21} /></span><strong>{t.photos}</strong><small>2 / 4</small></button>
          <button type="button" disabled><span><Clock3 size={21} /></span><strong>{locale === "ru" ? "Время" : "Time"}</strong><small>00:46:18</small></button>
          <button type="button" disabled><span><Wrench size={21} /></span><strong>{locale === "ru" ? "Работа" : "Work"}</strong><small>{locale === "ru" ? "В процессе" : "In progress"}</small></button>
        </section>

        <section className="upcoming-mobile-list"><div className="mobile-section-heading"><h2>{t.upcoming}</h2><span>{Math.max(0, workOrders.length - 1)}</span></div>
          {workOrders.slice(1, 4).map((workOrder) => <article key={workOrder.id}><strong>{workOrder.appointment ?? "—"}</strong><div><h3>{workOrder.title[locale]}</h3><p>{workOrder.client} · {workOrder.address[locale]}</p></div><ChevronRight size={18} /></article>)}
        </section>
      </section>

      <nav className="technician-bottom-nav" aria-label="Technician navigation">
        <Link className="is-active" href={`/m/${orgSlug}`}><ClipboardCheck size={20} /><span>{t.today}</span></Link>
        <a href="#jobs"><Wrench size={20} /><span>{t.mobileJobs}</span></a>
        <a href="#notifications"><Bell size={20} /><span>{t.notifications}</span></a>
        <a href="#profile"><UserRound size={20} /><span>{t.profile}</span></a>
      </nav>
    </main>
  );
}
