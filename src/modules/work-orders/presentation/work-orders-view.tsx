"use client";

import {
  ArrowRight,
  ChevronDown,
  Download,
  Filter,
  LayoutGrid,
  List,
  Map,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { useWorkOrders } from "../application/work-order-store";
import { getAvailableTransitions } from "../domain/state-machine";
import { localizeText, type WorkOrder, type WorkOrderStatus } from "../domain/work-order";
import { getPriorityLabel, getStatusLabel, getStatusTone } from "./formatters";

type WorkOrdersViewProps = {
  onOpenCreate: () => void;
};

export function WorkOrdersView({ onOpenCreate }: WorkOrdersViewProps) {
  // EN: Present searchable work orders with status-safe commands and responsive list patterns.
  // RU: Показывает реестр заявок с поиском, безопасными переходами и адаптивным списком.
  const { locale, messages: t } = useLocale();
  const { workOrders, technicians, transitionWorkOrder, updateWorkOrder, assignWorkOrder, scheduleWorkOrder } = useWorkOrders();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<WorkOrderStatus | "ALL">("ALL");
  const [view, setView] = useState<"list" | "kanban" | "map">("list");
  const deepLinkedId = searchParams.get("selected");
  const [selectionOverride, setSelectionOverride] = useState<{ urlValue: string | null; selectedId: string | null } | null>(null);
  const selectedId = selectionOverride?.urlValue === deepLinkedId ? selectionOverride.selectedId : deepLinkedId;
  const [pendingTransition, setPendingTransition] = useState(false);
  const [transitionError, setTransitionError] = useState("");
  const [pendingCommand, setPendingCommand] = useState(false);
  const [commandError, setCommandError] = useState("");
  const selected = useMemo(() => {
    // EN: Resolve deep-linked selection from the latest tenant-scoped work-order snapshot.
    // RU: Находит заявку из deep-link в актуальном tenant-снимке реестра.
    return workOrders.find((workOrder) => workOrder.id === selectedId) ?? null;
  }, [selectedId, workOrders]);

  function selectWorkOrder(id: string | null) {
    // EN: Override selection for the current URL while allowing a later deep-link change to take precedence.
    // RU: Переопределяет выбор для текущего URL, но отдаёт приоритет последующему изменению deep-link.
    setSelectionOverride({ urlValue: deepLinkedId, selectedId: id });
  }

  const filteredWorkOrders = useMemo(() => {
    // EN: Keep filtering deterministic and scoped to the current tenant snapshot.
    // RU: Выполняет детерминированную фильтрацию в текущем tenant-снимке.
    const normalizedQuery = query.trim().toLowerCase();
    return workOrders.filter((order) => {
      const matchesStatus = status === "ALL" || order.status === status;
      const searchable = `${order.number} ${order.client} ${order.phone} ${order.title.ru} ${order.title.en}`.toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, status, workOrders]);

  async function handleTransition(order: WorkOrder, nextStatus: WorkOrderStatus) {
    // EN: Wait for server authorization and optimistic-version validation before confirming the transition.
    // RU: Ожидает серверную авторизацию и проверку optimistic version до подтверждения перехода.
    setPendingTransition(true);
    setTransitionError("");
    try {
      await transitionWorkOrder(order.id, nextStatus, order.version);
    } catch (error) {
      setTransitionError(error instanceof Error ? error.message : "Transition failed.");
    } finally {
      setPendingTransition(false);
    }
  }

  async function runWorkOrderCommand(command: () => Promise<WorkOrder>): Promise<void> {
    // EN: Share pending and error behavior across edit, assignment and scheduling commands.
    // RU: Объединяет pending- и error-поведение команд редактирования, назначения и расписания.
    setPendingCommand(true);
    setCommandError("");
    try {
      await command();
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Work-order command failed.");
    } finally {
      setPendingCommand(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, order: WorkOrder): Promise<void> {
    // EN: Submit editable customer and job fields with the currently displayed aggregate version.
    // RU: Отправляет редактируемые данные клиента и работы с текущей версией агрегата.
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runWorkOrderCommand(() => updateWorkOrder(order.id, {
      client: String(form.get("client") ?? ""),
      phone: String(form.get("phone") ?? ""),
      title: String(form.get("title") ?? ""),
      address: String(form.get("address") ?? ""),
      priority: String(form.get("priority") ?? "NORMAL") as WorkOrder["priority"],
    }, order.version));
  }

  async function handleAssignment(event: FormEvent<HTMLFormElement>, order: WorkOrder): Promise<void> {
    // EN: Submit an explicit tenant technician or null assignment with optimistic concurrency.
    // RU: Отправляет явное назначение tenant-техника или null с optimistic concurrency.
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const technicianId = String(form.get("technicianId") ?? "") || null;
    await runWorkOrderCommand(() => assignWorkOrder(order.id, technicianId, order.version));
  }

  async function handleSchedule(event: FormEvent<HTMLFormElement>, order: WorkOrder): Promise<void> {
    // EN: Convert local form values to absolute instants before the versioned schedule command.
    // RU: Преобразует локальные значения формы в абсолютные моменты до versioned schedule-команды.
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const start = new Date(String(form.get("scheduledStart") ?? ""));
    const end = new Date(String(form.get("scheduledEnd") ?? ""));
    await runWorkOrderCommand(() => scheduleWorkOrder(order.id, {
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      timezone: String(form.get("timezone") ?? order.timezone),
    }, order.version));
  }

  function clearFilters() {
    // EN: Restore the role-default work-order view.
    // RU: Восстанавливает представление заявок по умолчанию для роли.
    setQuery("");
    setStatus("ALL");
  }

  return (
    <div className="view-stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">OPERATIONS · {workOrders.length} TOTAL</span>
          <h1>{t.workOrdersTitle}</h1>
          <p>{t.workOrdersSubtitle}</p>
        </div>
        <div className="page-actions">
          <button className="secondary-button" type="button" disabled><Download size={17} />{t.export}</button>
          <button className="primary-button" type="button" onClick={onOpenCreate}><Plus size={18} />{t.newWorkOrder}</button>
        </div>
      </header>

      <section className="list-toolbar panel">
        <div className="view-tabs" role="tablist" aria-label="Work order view">
          <button className={view === "list" ? "is-active" : ""} type="button" onClick={() => setView("list")}><List size={16} />{t.list}</button>
          <button className={view === "kanban" ? "is-active" : ""} type="button" onClick={() => setView("kanban")}><LayoutGrid size={16} />{t.kanban}</button>
          <button className={view === "map" ? "is-active" : ""} type="button" onClick={() => setView("map")}><Map size={16} />{t.map}</button>
        </div>
        <div className="list-filters">
          <label className="toolbar-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">{t.search}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchHint} />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={t.clearFilters}><X size={15} /></button>}
          </label>
          <label className="select-control">
            <span className="sr-only">{t.status}</span>
            <Filter size={15} />
            <select value={status} onChange={(event) => setStatus(event.target.value as WorkOrderStatus | "ALL")}>
              <option value="ALL">{t.allStatuses}</option>
              {Array.from(new Set(workOrders.map((order) => order.status))).map((value) => (
                <option value={value} key={value}>{getStatusLabel(value, locale)}</option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
          <button className="icon-button" type="button" aria-label={t.filter} disabled><SlidersHorizontal size={18} /></button>
        </div>
      </section>

      {view === "list" && (
        <section className="data-panel panel">
          <div className="desktop-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th><span className="sr-only">Select</span><input type="checkbox" aria-label="Select all visible work orders" /></th>
                  <th>{t.number}</th>
                  <th>{t.client}</th>
                  <th>{t.job}</th>
                  <th>{t.status}</th>
                  <th>{t.priority}</th>
                  <th>{t.appointment}</th>
                  <th>{t.technician}</th>
                  <th>{t.amount}</th>
                  <th><span className="sr-only">{t.actions}</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkOrders.map((order) => (
                  <tr key={order.id} onClick={() => selectWorkOrder(order.id)}>
                    <td onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`${t.selected} ${order.number}`} /></td>
                    <td><strong className="order-number">{order.number}</strong><small>v{order.version}</small></td>
                    <td><strong>{order.client}</strong><small>{order.phone}</small></td>
                    <td><strong>{localizeText(order.title, locale)}</strong><small>{localizeText(order.address, locale)}</small></td>
                    <td><span className={`status-badge status-${getStatusTone(order.status)}`}>{getStatusLabel(order.status, locale)}</span></td>
                    <td><span className={`priority-label priority-${order.priority.toLowerCase()}`}><span />{getPriorityLabel(order.priority, locale)}</span></td>
                    <td>{order.appointment ?? "—"}</td>
                    <td>{order.technician?.displayName ?? <span className="muted">—</span>}</td>
                    <td className="money-cell">{order.amount}</td>
                    <td><button className="table-action" type="button" aria-label={`${t.actions} ${order.number}`} disabled><MoreHorizontal size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-record-list">
            {filteredWorkOrders.map((order) => (
              <button className="mobile-record-card" type="button" key={order.id} onClick={() => selectWorkOrder(order.id)}>
                <span className="record-card-top"><strong>{order.number}</strong><span className={`status-badge status-${getStatusTone(order.status)}`}>{getStatusLabel(order.status, locale)}</span></span>
                <strong>{localizeText(order.title, locale)}</strong>
                <span>{order.client} · {order.appointment ?? t.unscheduledQueue}</span>
                <small>{localizeText(order.address, locale)}</small>
              </button>
            ))}
          </div>

          {filteredWorkOrders.length === 0 && (
            <div className="empty-state"><Search size={26} /><strong>{t.noResults}</strong><button type="button" onClick={clearFilters}>{t.clearFilters}</button></div>
          )}

          <footer className="table-footer"><span>{filteredWorkOrders.length} / {workOrders.length}</span><div><button type="button" disabled>←</button><button type="button" className="is-active" disabled>1</button><button type="button" disabled>→</button></div></footer>
        </section>
      )}

      {view === "kanban" && <KanbanView workOrders={filteredWorkOrders} />}
      {view === "map" && <MapView workOrders={filteredWorkOrders} />}

      {selected && (
        <aside className="detail-drawer" aria-label={`${t.workOrders} ${selected.number}`}>
          <button className="drawer-backdrop" type="button" onClick={() => selectWorkOrder(null)} aria-label={t.close} />
          <div className="drawer-panel">
            <div className="drawer-heading">
              <div><span className="eyebrow">{selected.number} · v{selected.version}</span><h2>{localizeText(selected.title, locale)}</h2></div>
              <button className="icon-button" type="button" onClick={() => selectWorkOrder(null)} aria-label={t.close}><X size={19} /></button>
            </div>
            <div className="drawer-client"><strong>{selected.client}</strong><span>{selected.phone}</span><small>{localizeText(selected.address, locale)}</small></div>
            <dl className="detail-grid">
              <div><dt>{t.status}</dt><dd><span className={`status-badge status-${getStatusTone(selected.status)}`}>{getStatusLabel(selected.status, locale)}</span></dd></div>
              <div><dt>{t.priority}</dt><dd>{getPriorityLabel(selected.priority, locale)}</dd></div>
              <div><dt>{t.appointment}</dt><dd>{selected.appointment ?? t.unscheduledQueue}</dd></div>
              <div><dt>{t.technician}</dt><dd>{selected.technician?.displayName ?? "—"}</dd></div>
              <div><dt>{t.amount}</dt><dd className="money-cell">{selected.amount}</dd></div>
              <div><dt>SLA</dt><dd>{selected.slaMinutes ? `${selected.slaMinutes} min` : "—"}</dd></div>
            </dl>
            <div className="drawer-section">
              <span className="drawer-section-label">{locale === "ru" ? "РЕДАКТИРОВАНИЕ" : "EDIT DETAILS"}</span>
              {commandError && <p className="form-error" role="alert">{commandError}</p>}
              <form className="form-stack" key={`edit-${selected.id}-${selected.version}`} onSubmit={(event) => handleUpdate(event, selected)}>
                <label className="field-label"><span>{t.client}</span><input name="client" defaultValue={selected.client} required /></label>
                <label className="field-label"><span>{t.phone}</span><input name="phone" defaultValue={selected.phone} /></label>
                <label className="field-label"><span>{t.job}</span><input name="title" defaultValue={localizeText(selected.title, locale)} required /></label>
                <label className="field-label"><span>{t.serviceAddress}</span><input name="address" defaultValue={localizeText(selected.address, locale)} required /></label>
                <label className="field-label"><span>{t.priority}</span><select name="priority" defaultValue={selected.priority}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label>
                <button className="secondary-button" type="submit" disabled={pendingCommand}>{pendingCommand ? "…" : t.save}</button>
              </form>
            </div>
            <div className="drawer-section">
              <span className="drawer-section-label">{locale === "ru" ? "НАЗНАЧЕНИЕ" : "ASSIGNMENT"}</span>
              <form className="form-stack" key={`assign-${selected.id}-${selected.version}`} onSubmit={(event) => handleAssignment(event, selected)}>
                <label className="field-label"><span>{t.technician}</span><select name="technicianId" defaultValue={selected.technician?.id ?? ""}><option value="">—</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.displayName}</option>)}</select></label>
                <button className="secondary-button" type="submit" disabled={pendingCommand}>{pendingCommand ? "…" : (locale === "ru" ? "Назначить" : "Assign")}</button>
              </form>
            </div>
            <div className="drawer-section">
              <span className="drawer-section-label">{locale === "ru" ? "РАСПИСАНИЕ" : "SCHEDULE"}</span>
              <form className="form-stack" key={`schedule-${selected.id}-${selected.version}`} onSubmit={(event) => handleSchedule(event, selected)}>
                <label className="field-label"><span>{locale === "ru" ? "Начало" : "Start"}</span><input name="scheduledStart" type="datetime-local" required /></label>
                <label className="field-label"><span>{locale === "ru" ? "Окончание" : "End"}</span><input name="scheduledEnd" type="datetime-local" required /></label>
                <label className="field-label"><span>{t.timezone}</span><select name="timezone" defaultValue={selected.timezone}><option>Asia/Dubai</option><option>Europe/Moscow</option><option>UTC</option></select></label>
                <button className="secondary-button" type="submit" disabled={pendingCommand}>{pendingCommand ? "…" : (locale === "ru" ? "Сохранить расписание" : "Save schedule")}</button>
              </form>
            </div>
            <div className="drawer-section">
              <span className="drawer-section-label">NEXT ACTIONS</span>
              <div className="transition-list">
                {transitionError && <p className="form-error" role="alert">{transitionError}</p>}
                {getAvailableTransitions(selected.status).map((nextStatus) => (
                  <button type="button" key={nextStatus} disabled={pendingTransition} onClick={() => handleTransition(selected, nextStatus)}>
                    <span>{getStatusLabel(nextStatus, locale)}</span><ArrowRight size={16} />
                  </button>
                ))}
                {getAvailableTransitions(selected.status).length === 0 && <p>{locale === "ru" ? "Финальное состояние. Используйте отдельный reopen flow." : "Terminal state. Use the dedicated reopen flow."}</p>}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function KanbanView({ workOrders }: { workOrders: WorkOrder[] }) {
  // EN: Group work orders into a compact operational pipeline without changing their state.
  // RU: Группирует заявки в операционный pipeline без изменения их состояния.
  const { locale } = useLocale();
  const columns: WorkOrderStatus[] = ["NEW", "SCHEDULED", "IN_PROGRESS", "WORK_COMPLETED"];
  return (
    <section className="kanban-board">
      {columns.map((column) => (
        <div className="kanban-column" key={column}>
          <header><strong>{getStatusLabel(column, locale)}</strong><span>{workOrders.filter((order) => order.status === column).length}</span></header>
          <div>
            {workOrders.filter((order) => order.status === column).map((order) => (
              <article className="kanban-card" key={order.id}><span>{order.number}</span><strong>{localizeText(order.title, locale)}</strong><small>{order.client}</small><footer><span className={`priority-dot priority-${order.priority.toLowerCase()}`} />{order.appointment ?? "—"}</footer></article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function MapView({ workOrders }: { workOrders: WorkOrder[] }) {
  // EN: Provide a permission-safe schematic map with an accessible list alternative.
  // RU: Показывает безопасную схематичную карту с доступной списочной альтернативой.
  const { locale, messages: t } = useLocale();
  return (
    <section className="map-panel panel">
      <div className="map-canvas" aria-hidden="true">
        <span className="map-road road-a" /><span className="map-road road-b" /><span className="map-road road-c" />
        {workOrders.slice(0, 6).map((order, index) => <span className={`map-pin pin-${index + 1}`} key={order.id}>{index + 1}</span>)}
        <div className="map-label dubai-marina">Dubai Marina</div><div className="map-label business-bay">Business Bay</div><div className="map-label al-barsha">Al Barsha</div>
      </div>
      <div className="map-results">
        <h2>{t.workOrders} · {workOrders.length}</h2>
        {workOrders.slice(0, 6).map((order, index) => <div key={order.id}><span className="map-result-index">{index + 1}</span><div><strong>{order.number} · {localizeText(order.title, locale)}</strong><small>{localizeText(order.address, locale)}</small></div></div>)}
      </div>
    </section>
  );
}
