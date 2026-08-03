"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Plus,
  ReceiptText,
  UserPlus,
  UsersRound,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { useWorkOrders } from "@/src/modules/work-orders/application/work-order-store";
import { getStatusLabel, getStatusTone } from "@/src/modules/work-orders/presentation/formatters";
import { localizeText } from "@/src/modules/work-orders/domain/work-order";

type DashboardViewProps = {
  orgSlug: string;
  onOpenCreate: () => void;
};

export function DashboardView({ orgSlug, onOpenCreate }: DashboardViewProps) {
  // EN: Build a role-oriented operational dashboard from the current work-order snapshot.
  // RU: Формирует роль-ориентированный дашборд из текущего снимка заявок.
  const { locale, messages: t } = useLocale();
  const { workOrders } = useWorkOrders();

  const newCount = workOrders.filter((order) => order.status === "NEW").length;
  const unassignedCount = workOrders.filter((order) => !order.technician && order.status !== "CLOSED").length;
  const todayCount = workOrders.filter((order) => Boolean(order.appointment)).length;
  const slaRiskCount = workOrders.filter((order) => order.slaMinutes !== null && order.slaMinutes < 60).length;

  const metrics = [
    { label: t.newCount, value: String(newCount), note: "+2", icon: ReceiptText, tone: "primary" },
    { label: t.unassigned, value: String(unassignedCount), note: "2 urgent", icon: UsersRound, tone: "warning" },
    { label: t.todayVisits, value: String(todayCount), note: "7 / 11", icon: CalendarDays, tone: "neutral" },
    { label: t.slaRisk, value: String(slaRiskCount), note: "< 60 min", icon: AlertTriangle, tone: "danger" },
    { label: t.outstanding, value: "AED 18.4k", note: "12 invoices", icon: CircleDollarSign, tone: "warning" },
    { label: t.revenue, value: "AED 84.2k", note: "+12.8%", icon: Banknote, tone: "success" },
    { label: t.teamLoad, value: "76%", note: "5 active", icon: Wrench, tone: "neutral" },
  ];

  const appointments = workOrders
    .filter((order) => order.appointment && order.technician)
    .slice(0, 4);

  return (
    <div className="view-stack">
      <header className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">{t.today} · ASIA/DUBAI</span>
          <h1>{t.welcome}</h1>
          <p>{t.dashboardSubtitle}</p>
        </div>
        <div className="page-actions">
          <button className="secondary-button" type="button" disabled><UserPlus size={17} />{t.newClient}</button>
          <button className="primary-button" type="button" onClick={onOpenCreate}><Plus size={18} />{t.newWorkOrder}</button>
        </div>
      </header>

      <section className="metric-grid" aria-label="Operational metrics">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => (
          <Link className={`metric-card metric-${tone}`} href={`/app/${orgSlug}/work-orders`} key={label}>
            <div className="metric-topline">
              <span className="metric-icon"><Icon size={18} /></span>
              <ArrowUpRight size={16} className="metric-arrow" />
            </div>
            <strong>{value}</strong>
            <span className="metric-label">{label}</span>
            <small>{note}</small>
          </Link>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">LIVE QUEUE</span>
              <h2>{t.requiresAttention}</h2>
            </div>
            <Link href={`/app/${orgSlug}/work-orders`}>{t.viewAll}<ArrowUpRight size={15} /></Link>
          </div>
          <div className="attention-list">
            {workOrders.slice(0, 4).map((order) => (
              <Link className="attention-row" href={`/app/${orgSlug}/work-orders?selected=${order.id}`} key={order.id}>
                <span className={`priority-dot priority-${order.priority.toLowerCase()}`} aria-label={order.priority} />
                <span className="attention-main">
                  <strong>{order.number} · {localizeText(order.title, locale)}</strong>
                  <small>{order.client} · {localizeText(order.address, locale)}</small>
                </span>
                <span className={`status-badge status-${getStatusTone(order.status)}`}>
                  {getStatusLabel(order.status, locale)}
                </span>
                <span className="attention-meta">
                  {order.slaMinutes !== null ? <><Clock3 size={14} />{order.slaMinutes} min</> : order.amount}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel visits-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">SCHEDULE</span>
              <h2>{t.nextVisits}</h2>
            </div>
            <Link href={`/app/${orgSlug}/dispatch`}>{t.schedule}<ArrowUpRight size={15} /></Link>
          </div>
          <div className="timeline-list">
            {appointments.map((order, index) => (
              <div className="timeline-row" key={order.id}>
                <div className="timeline-time"><strong>{order.appointment?.split("–")[0]}</strong><span>GST</span></div>
                <div className={`timeline-line ${index === 0 ? "is-live" : ""}`}><span /></div>
                <div className="timeline-content">
                  <strong>{localizeText(order.title, locale)}</strong>
                  <span>{order.technician}</span>
                  <small>{localizeText(order.address, locale)}</small>
                </div>
                {index === 0 && <span className="live-pill">LIVE</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">AUDIT-AWARE</span>
              <h2>{t.latestActivity}</h2>
            </div>
          </div>
          <div className="activity-list">
            <div className="activity-item"><span className="activity-icon success"><CheckCircle2 size={16} /></span><div><strong>WO-1043</strong> · {locale === "ru" ? "работа принята менеджером" : "work approved by manager"}<small>09:42 · Elena Petrova</small></div></div>
            <div className="activity-item"><span className="activity-icon primary"><ReceiptText size={16} /></span><div><strong>INV-0821</strong> · {locale === "ru" ? "счёт отправлен клиенту" : "invoice sent to client"}<small>09:28 · System</small></div></div>
            <div className="activity-item"><span className="activity-icon warning"><Clock3 size={16} /></span><div><strong>WO-1048</strong> · {locale === "ru" ? "осталось 18 минут SLA" : "18 minutes left on SLA"}<small>09:18 · SLA evaluator</small></div></div>
          </div>
        </section>
      </div>

      <div className="freshness-note"><span />{t.updated}</div>
    </div>
  );
}
