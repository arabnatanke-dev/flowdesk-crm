"use client";

import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, SlidersHorizontal, UsersRound } from "lucide-react";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { useWorkOrders } from "@/src/modules/work-orders/application/work-order-store";
import { localizeText } from "@/src/modules/work-orders/domain/work-order";
import { getStatusLabel, getStatusTone } from "@/src/modules/work-orders/presentation/formatters";

type DispatchViewProps = {
  onOpenCreate: () => void;
};

const technicians = [
  { name: "Илья Волков", initials: "ИВ", color: "blue", load: "82%" },
  { name: "Марк Орлов", initials: "МО", color: "green", load: "68%" },
  { name: "Самир Хан", initials: "СХ", color: "amber", load: "76%" },
];

export function DispatchView({ onOpenCreate }: DispatchViewProps) {
  // EN: Render the resource calendar and explicit unscheduled queue for dispatchers.
  // RU: Отображает ресурсный календарь и явную очередь неназначенных заявок.
  const { locale, messages: t } = useLocale();
  const { workOrders } = useWorkOrders();
  const unscheduled = workOrders.filter((order) => !order.appointment && order.status !== "CLOSED");

  return (
    <div className="view-stack dispatch-view">
      <header className="page-heading">
        <div>
          <span className="eyebrow">DISPATCH · GST (UTC+4)</span>
          <h1>{t.dispatch}</h1>
          <p>{t.dispatchHint}</p>
        </div>
        <div className="page-actions">
          <button className="secondary-button" type="button"><SlidersHorizontal size={17} />{t.filter}</button>
          <button className="primary-button" type="button" onClick={onOpenCreate}><Plus size={18} />{t.newWorkOrder}</button>
        </div>
      </header>

      <section className="dispatch-toolbar panel">
        <div className="date-navigation">
          <button className="icon-button" type="button" aria-label="Previous day"><ChevronLeft size={18} /></button>
          <button type="button" className="date-button"><CalendarDays size={17} /><strong>03 Aug 2026</strong><span>{t.today}</span></button>
          <button className="icon-button" type="button" aria-label="Next day"><ChevronRight size={18} /></button>
        </div>
        <div className="dispatch-summary"><span><UsersRound size={16} />3 {t.technicians}</span><span><Clock3 size={16} />7 {t.jobsToday}</span><span className="warning-text"><AlertTriangle size={16} />1 {t.conflict}</span></div>
      </section>

      <div className="dispatch-layout">
        <aside className="unscheduled-panel panel">
          <div className="panel-heading compact"><div><span className="panel-kicker">QUEUE</span><h2>{t.unscheduledQueue}</h2></div><span className="count-badge">{unscheduled.length}</span></div>
          <div className="unscheduled-list">
            {unscheduled.map((order) => (
              <article className="unscheduled-card" key={order.id} tabIndex={0}>
                <div><span className={`priority-dot priority-${order.priority.toLowerCase()}`} /><strong>{order.number}</strong><span className={`status-badge status-${getStatusTone(order.status)}`}>{getStatusLabel(order.status, locale)}</span></div>
                <h3>{localizeText(order.title, locale)}</h3>
                <p>{order.client}</p><small>{localizeText(order.address, locale)}</small>
              </article>
            ))}
            {unscheduled.length === 0 && <p className="empty-inline">{locale === "ru" ? "Все заявки запланированы." : "All work orders are scheduled."}</p>}
          </div>
        </aside>

        <section className="schedule-panel panel" aria-label={t.schedule}>
          <div className="schedule-grid schedule-header">
            <div className="schedule-time-title">GST</div>
            {technicians.map((technician) => (
              <div className="technician-header" key={technician.name}>
                <span className={`avatar avatar-${technician.color}`}>{technician.initials}</span>
                <div><strong>{technician.name}</strong><small>{technician.load} · {t.available}</small></div>
              </div>
            ))}
          </div>
          <div className="schedule-body">
            <div className="schedule-hours">
              {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map((time) => <span key={time}>{time}</span>)}
            </div>
            <div className="schedule-lanes">
              {technicians.map((technician, laneIndex) => (
                <div className="schedule-lane" key={technician.name}>
                  {workOrders.filter((order) => order.technician === technician.name).map((order, orderIndex) => (
                    <article className={`appointment-card slot-${laneIndex}-${orderIndex}`} key={order.id} tabIndex={0}>
                      <span>{order.appointment}</span><strong>{order.number}</strong><p>{localizeText(order.title, locale)}</p><small>{order.client}</small>
                    </article>
                  ))}
                </div>
              ))}
            </div>
            <div className="current-time-line"><span>10:12</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
