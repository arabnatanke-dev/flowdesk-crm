"use client";

import {
  ArrowRight,
  Banknote,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Gauge,
  Languages,
  MapPin,
  PackageCheck,
  Percent,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  TrendingUp,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocale } from "@/src/shared/i18n/locale-context";

const clients = [
  { name: "Layla Hassan", phone: "+971 50 441 2048", location: "Dubai Marina", jobs: 8, value: "AED 6,240", last: "03 Aug" },
  { name: "Cedar Café LLC", phone: "+971 4 338 9051", location: "DIFC", jobs: 14, value: "AED 18,760", last: "03 Aug" },
  { name: "Aster Medical Center", phone: "+971 4 552 3009", location: "Al Barsha", jobs: 11, value: "AED 24,900", last: "02 Aug" },
  { name: "Omar Al Mansoori", phone: "+971 55 820 7142", location: "JVC", jobs: 3, value: "AED 1,820", last: "03 Aug" },
  { name: "Maya Petrova", phone: "+971 58 932 4461", location: "Palm Jumeirah", jobs: 5, value: "AED 4,380", last: "01 Aug" },
];

const team = [
  { name: "Илья Волков", role: "Lead HVAC Technician", initials: "ИВ", skills: ["HVAC", "Electrical"], load: 82, jobs: 6, state: "job" },
  { name: "Марк Орлов", role: "Appliance Technician", initials: "МО", skills: ["Appliances", "Plumbing"], load: 68, jobs: 5, state: "available" },
  { name: "Самир Хан", role: "Senior Electrician", initials: "СХ", skills: ["Electrical", "Safety"], load: 76, jobs: 4, state: "job" },
  { name: "Елена Петрова", role: "Dispatcher", initials: "ЕП", skills: ["Dispatch", "QA"], load: 54, jobs: 0, state: "available" },
];

const services = [
  { code: "HVAC-DIAG", nameRu: "Диагностика кондиционера", nameEn: "AC diagnostics", category: "HVAC", duration: "60 min", price: "AED 210", active: true },
  { code: "HVAC-SRV", nameRu: "Полное обслуживание кондиционера", nameEn: "Full AC service", category: "HVAC", duration: "120 min", price: "AED 480", active: true },
  { code: "PLB-LEAK", nameRu: "Устранение протечки", nameEn: "Leak repair", category: "Plumbing", duration: "90 min", price: "AED 350", active: true },
  { code: "ELC-PANEL", nameRu: "Диагностика электрощита", nameEn: "Electrical panel diagnostics", category: "Electrical", duration: "90 min", price: "AED 390", active: true },
  { code: "APP-WASH", nameRu: "Ремонт стиральной машины", nameEn: "Washing machine repair", category: "Appliances", duration: "120 min", price: "AED 320", active: true },
];

const invoices = [
  { id: "INV-0821", client: "Aster Medical Center", issued: "30 Jul", due: "06 Aug", total: "AED 1,940", balance: "AED 1,940", status: "SENT" },
  { id: "INV-0819", client: "Cedar Café LLC", issued: "28 Jul", due: "04 Aug", total: "AED 2,780", balance: "AED 780", status: "PARTIAL" },
  { id: "INV-0814", client: "Maya Petrova", issued: "24 Jul", due: "31 Jul", total: "AED 1,265", balance: "AED 1,265", status: "OVERDUE" },
  { id: "INV-0808", client: "Rami Haddad", issued: "19 Jul", due: "26 Jul", total: "AED 1,280", balance: "AED 0", status: "PAID" },
];

export function ClientsView() {
  // EN: Present CRM accounts with search-ready identifiers and financial context.
  // RU: Показывает CRM-клиентов с поисковыми идентификаторами и финансовым контекстом.
  const { locale, messages: t } = useLocale();
  return (
    <div className="view-stack">
      <ViewHeading eyebrow="CRM · 1,284 RECORDS" title={t.clientBase} subtitle={locale === "ru" ? "Контакты, адреса, объекты и вся сервисная история клиента." : "Contacts, service addresses, assets and the complete client history."} action={t.newClient} />
      <section className="compact-metrics">
        <MiniMetric icon={UsersRound} label={t.activeClients} value="1,218" note="+38" />
        <MiniMetric icon={TrendingUp} label={t.repeatRate} value="42.8%" note="+3.1%" />
        <MiniMetric icon={CircleDollarSign} label={t.clientOutstanding} value="AED 18.4k" note="12 invoices" />
        <MiniMetric icon={Star} label="CSAT" value="4.8 / 5" note="146 reviews" />
      </section>
      <section className="panel data-panel">
        <div className="module-toolbar"><label className="toolbar-search"><Search size={17} /><input placeholder={t.searchHint} /></label><button className="secondary-button" type="button"><Download size={16} />{t.export}</button></div>
        <div className="desktop-table-wrap">
          <table className="data-table"><thead><tr><th>{t.client}</th><th>{t.phone}</th><th>{locale === "ru" ? "Район" : "Area"}</th><th>{t.workOrders}</th><th>{t.lifetimeValue}</th><th>{locale === "ru" ? "Последняя заявка" : "Last job"}</th><th /></tr></thead>
            <tbody>{clients.map((client) => <tr key={client.phone}><td><span className="entity-cell"><span className="avatar avatar-soft">{client.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><strong>{client.name}</strong></span></td><td>{client.phone}</td><td><MapPin size={14} /> {client.location}</td><td>{client.jobs}</td><td className="money-cell">{client.value}</td><td>{client.last}</td><td><button className="table-action" type="button"><ChevronRight size={18} /></button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function TeamView() {
  // EN: Show role, skills and capacity without turning the module into an HR system.
  // RU: Показывает роли, навыки и загрузку, не превращая модуль в HR-систему.
  const { locale, messages: t } = useLocale();
  return (
    <div className="view-stack">
      <ViewHeading eyebrow="PEOPLE · 8 / 20 SEATS" title={t.teamTitle} subtitle={t.teamSubtitle} action={locale === "ru" ? "Пригласить сотрудника" : "Invite member"} />
      <section className="team-grid">
        {team.map((member, index) => <article className="team-card panel" key={member.name}>
          <header><span className={`avatar avatar-${["blue", "green", "amber", "violet"][index]}`}>{member.initials}</span><span className={`availability-dot state-${member.state}`} aria-label={member.state} /></header>
          <h2>{member.name}</h2><p>{member.role}</p>
          <div className="skill-list">{member.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <div className="load-line"><span><strong>{member.load}%</strong> {locale === "ru" ? "загрузка" : "utilization"}</span><span>{member.jobs} {t.jobsToday}</span></div>
          <div className="progress-track"><span style={{ width: `${member.load}%` }} /></div>
          <button type="button">{locale === "ru" ? "Открыть профиль" : "View profile"}<ArrowRight size={15} /></button>
        </article>)}
      </section>
    </div>
  );
}

export function CatalogView() {
  // EN: Present deterministic catalog snapshots used by estimates and work orders.
  // RU: Показывает детерминированные снимки каталога для смет и заявок.
  const { locale, messages: t } = useLocale();
  return (
    <div className="view-stack">
      <ViewHeading eyebrow="CATALOG · AED · VAT 5%" title={t.catalogTitle} subtitle={t.catalogSubtitle} action={locale === "ru" ? "Добавить услугу" : "Add service"} />
      <section className="compact-metrics">
        <MiniMetric icon={Wrench} label={locale === "ru" ? "Активные услуги" : "Active services"} value="48" note="4 categories" />
        <MiniMetric icon={PackageCheck} label={locale === "ru" ? "Материалы" : "Materials"} value="312" note="9 low stock" />
        <MiniMetric icon={FileText} label={locale === "ru" ? "Прайс-листы" : "Price books"} value="3" note="AED" />
        <MiniMetric icon={Percent} label="VAT" value="5%" note="UAE seed" />
      </section>
      <section className="panel data-panel">
        <div className="module-toolbar"><label className="toolbar-search"><Search size={17} /><input placeholder={locale === "ru" ? "Поиск услуги, SKU или категории…" : "Search service, SKU or category…"} /></label><button className="secondary-button" type="button"><Download size={16} />{t.export}</button></div>
        <div className="desktop-table-wrap"><table className="data-table"><thead><tr><th>SKU</th><th>{locale === "ru" ? "Услуга" : "Service"}</th><th>{locale === "ru" ? "Категория" : "Category"}</th><th>{locale === "ru" ? "Длительность" : "Duration"}</th><th>{locale === "ru" ? "Базовая цена" : "Base price"}</th><th>{t.status}</th><th /></tr></thead><tbody>
          {services.map((service) => <tr key={service.code}><td><code>{service.code}</code></td><td><strong>{locale === "ru" ? service.nameRu : service.nameEn}</strong></td><td>{service.category}</td><td>{service.duration}</td><td className="money-cell">{service.price}</td><td><span className="status-badge status-success">{locale === "ru" ? "Активна" : "Active"}</span></td><td><button className="table-action" type="button"><ChevronRight size={18} /></button></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}

export function FinanceView() {
  // EN: Surface invoicing, collections and aging with explicit currency context.
  // RU: Показывает счета, поступления и aging с явным контекстом валюты.
  const { locale, messages: t } = useLocale();
  return (
    <div className="view-stack">
      <ViewHeading eyebrow="FINANCE · AED · AS OF 03 AUG" title={t.financeCenter} subtitle={locale === "ru" ? "Счета, платежи, возвраты, расходы и дебиторская задолженность." : "Invoices, payments, refunds, expenses and accounts receivable."} action={t.recordPayment} />
      <section className="finance-metric-grid">
        <article className="finance-hero-card"><span><FileText size={19} />{t.invoiced}</span><strong>AED 102,640</strong><small>01–03 Aug · +8.4%</small><div className="spark-bars"><i /><i /><i /><i /><i /><i /><i /></div></article>
        <MiniMetric icon={Banknote} label={t.collected} value="AED 84.2k" note="82.0%" />
        <MiniMetric icon={CircleDollarSign} label={t.outstanding} value="AED 18.4k" note="12 invoices" />
        <MiniMetric icon={Gauge} label={t.collectionRate} value="82.0%" note="+4.6%" />
        <MiniMetric icon={TrendingUp} label={locale === "ru" ? "Валовая маржа" : "Gross margin"} value="41.6%" note="estimated" />
      </section>
      <section className="panel data-panel">
        <div className="panel-heading"><div><span className="panel-kicker">AGING</span><h2>{t.receivables}</h2></div><a href="#aging">{t.viewAll}<ArrowRight size={15} /></a></div>
        <div className="desktop-table-wrap"><table className="data-table"><thead><tr><th>{t.invoice}</th><th>{t.client}</th><th>{locale === "ru" ? "Выставлен" : "Issued"}</th><th>{t.dueDate}</th><th>{locale === "ru" ? "Всего" : "Total"}</th><th>{t.balance}</th><th>{t.status}</th></tr></thead><tbody>
          {invoices.map((invoice) => <tr key={invoice.id}><td><strong className="order-number">{invoice.id}</strong></td><td><strong>{invoice.client}</strong></td><td>{invoice.issued}</td><td>{invoice.due}</td><td className="money-cell">{invoice.total}</td><td className="money-cell">{invoice.balance}</td><td><span className={`status-badge ${invoice.status === "PAID" ? "status-success" : invoice.status === "OVERDUE" ? "status-danger" : "status-warning"}`}>{invoice.status}</span></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}

export function ReportsView() {
  // EN: Expose shared metric definitions and drill-down report entry points.
  // RU: Предоставляет единые определения метрик и точки входа в детализацию отчётов.
  const { locale, messages: t } = useLocale();
  const reportCards = [
    { icon: Gauge, title: locale === "ru" ? "Операционная эффективность" : "Operational performance", body: "SLA · duration · first-time fix", accent: "blue" },
    { icon: Banknote, title: locale === "ru" ? "Финансовый обзор" : "Financial overview", body: "Invoiced · collected · outstanding", accent: "green" },
    { icon: UsersRound, title: locale === "ru" ? "Эффективность команды" : "Team performance", body: "Utilization · jobs · rating", accent: "amber" },
    { icon: Building2, title: locale === "ru" ? "Клиенты и удержание" : "Clients and retention", body: "Repeat rate · LTV · sources", accent: "violet" },
  ];
  return (
    <div className="view-stack"><ViewHeading eyebrow="ANALYTICS · LIVE DEFINITIONS" title={t.reportsTitle} subtitle={t.reportsSubtitle} action={t.export} />
      <section className="report-card-grid">{reportCards.map(({ icon: Icon, title, body, accent }) => <article className="report-card panel" key={title}><span className={`report-icon report-${accent}`}><Icon size={23} /></span><div><h2>{title}</h2><p>{body}</p></div><button type="button">{t.open}<ArrowRight size={16} /></button></article>)}</section>
      <section className="panel report-highlight"><div><span className="panel-kicker">METRIC DICTIONARY</span><h2>{locale === "ru" ? "Одна формула — один результат" : "One formula, one reproducible result"}</h2><p>{locale === "ru" ? "Каждый показатель связан с определением, фильтрами, временной зоной и исходными записями." : "Every metric is tied to its definition, filters, timezone and source records."}</p></div><div className="report-score"><strong>94.2%</strong><span>SLA compliance</span><small>1,104 eligible work orders</small></div></section>
    </div>
  );
}

export function SettingsView() {
  // EN: Edit tenant-level locale, timezone, currency and tax defaults in one bounded form.
  // RU: Редактирует locale, timezone, currency и налоговые defaults tenant в одной форме.
  const { locale, setLocale, messages: t } = useLocale();
  const [saved, setSaved] = useState(false);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    // EN: Confirm the settings command without optimistic financial side effects.
    // RU: Подтверждает команду настроек без оптимистичных финансовых эффектов.
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  }

  return (
    <div className="view-stack"><ViewHeading eyebrow="TENANT SETTINGS · v12" title={t.settingsTitle} subtitle={t.settingsSubtitle} />
      <form className="settings-layout" onSubmit={handleSave}>
        <nav className="settings-nav panel" aria-label={t.settings}><button type="button" className="is-active"><Building2 size={17} />{locale === "ru" ? "Профиль" : "Profile"}</button><button type="button"><Clock3 size={17} />{locale === "ru" ? "Время и график" : "Time & schedule"}</button><button type="button"><Percent size={17} />{locale === "ru" ? "Налоги" : "Taxes"}</button><button type="button"><Settings2 size={17} />SLA & workflow</button><button type="button"><ShieldCheck size={17} />{locale === "ru" ? "Безопасность" : "Security"}</button></nav>
        <section className="settings-form panel">
          <div className="panel-heading"><div><span className="panel-kicker">ORGANIZATION</span><h2>{locale === "ru" ? "Основные настройки" : "General settings"}</h2></div>{saved && <span className="saved-pill"><CheckCircle2 size={15} />{t.saved}</span>}</div>
          <div className="form-grid two-columns">
            <label className="field-label"><span>{locale === "ru" ? "Название организации" : "Organization name"}</span><input defaultValue="Horizon Service Co." /></label>
            <label className="field-label"><span>{locale === "ru" ? "Юридическое название" : "Legal name"}</span><input defaultValue="Horizon Technical Services LLC" /></label>
            <label className="field-label"><span>{t.language}</span><span className="input-with-icon"><Languages size={17} /><select value={locale} onChange={(event) => setLocale(event.target.value as "ru" | "en")}><option value="ru">Русский</option><option value="en">English</option></select></span></label>
            <label className="field-label"><span>{t.timezone}</span><select defaultValue="Asia/Dubai"><option>Asia/Dubai</option><option>Europe/Moscow</option><option>UTC</option></select></label>
            <label className="field-label"><span>{t.currency}</span><select defaultValue="AED"><option>AED — UAE Dirham</option><option>USD — US Dollar</option><option>EUR — Euro</option></select></label>
            <label className="field-label"><span>{t.tax}</span><select defaultValue="vat5"><option value="vat5">UAE VAT 5% · Exclusive</option><option value="none">No tax</option></select></label>
          </div>
          <div className="settings-note"><ShieldCheck size={19} /><div><strong>{locale === "ru" ? "Исторические данные не изменятся" : "Historical data will not change"}</strong><p>{locale === "ru" ? "Новая валюта и timezone применяются только к новым документам и отображению." : "New currency and timezone settings apply only to new documents and presentation."}</p></div></div>
          <footer className="form-footer"><span>expectedVersion: 12</span><button className="primary-button" type="submit">{t.save}</button></footer>
        </section>
      </form>
    </div>
  );
}

function ViewHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: string }) {
  // EN: Keep module title hierarchy and primary action consistent across the office app.
  // RU: Сохраняет единую иерархию заголовков и primary action во всём office-приложении.
  return <header className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="primary-button" type="button"><Plus size={18} />{action}</button>}</header>;
}

function MiniMetric({ icon: Icon, label, value, note }: { icon: typeof BarChart3; label: string; value: string; note: string }) {
  // EN: Display a compact metric with a semantic icon and a textual trend note.
  // RU: Показывает компактную метрику с семантической иконкой и текстовым пояснением.
  return <article className="mini-metric panel"><span className="mini-metric-icon"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
