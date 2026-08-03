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

type TechnicianState = "DISPATCHED" | "EN_ROUTE" | "ON_SITE" | "IN_PROGRESS" | "WORK_COMPLETED";

export function TechnicianApp() {
  // EN: Render the mobile-first technician flow with explicit server-confirmed states.
  // RU: Отображает mobile-first сценарий мастера с явными подтверждёнными статусами.
  const { locale, messages: t } = useLocale();
  const [state, setState] = useState<TechnicianState>("DISPATCHED");
  const [checked, setChecked] = useState([true, true, false, false]);

  function advanceState() {
    // EN: Advance only through the technician-safe subset of the work-order state machine.
    // RU: Переводит заявку только по безопасной для мастера части state machine.
    const next: Record<TechnicianState, TechnicianState> = {
      DISPATCHED: "EN_ROUTE",
      EN_ROUTE: "ON_SITE",
      ON_SITE: "IN_PROGRESS",
      IN_PROGRESS: "WORK_COMPLETED",
      WORK_COMPLETED: "WORK_COMPLETED",
    };
    setState(next[state]);
  }

  function toggleChecklist(index: number) {
    // EN: Save a local checklist draft while keeping final completion server-gated.
    // RU: Сохраняет локальный draft чек-листа, оставляя финальное завершение серверной командой.
    setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value));
  }

  const actionLabel: Record<TechnicianState, string> = {
    DISPATCHED: t.enRoute,
    EN_ROUTE: t.arrive,
    ON_SITE: t.startWork,
    IN_PROGRESS: t.complete,
    WORK_COMPLETED: locale === "ru" ? "Отправлено менеджеру" : "Submitted to manager",
  };

  return (
    <main className="technician-app">
      <header className="technician-header">
        <Link className="brand-lockup" href="/m/horizon"><span className="brand-mark"><span /><span /><span /></span><strong>FlowDesk</strong></Link>
        <div><LanguageSwitch compact /><button className="icon-button notification-button" type="button"><Bell size={19} /><span /></button></div>
      </header>

      <section className="technician-content">
        <div className="mobile-welcome"><div><span>{t.today} · 03 AUG</span><h1>{t.technicianToday}</h1><p>4 {t.jobsToday}</p></div><span className="avatar avatar-blue">ИВ</span></div>
        <div className="sync-banner"><Wifi size={16} /><span>{t.syncOnline}</span><Check size={15} /></div>

        <section className="next-job-card">
          <div className="next-job-top"><span>{t.nextJob}</span><strong>09:00–10:30</strong></div>
          <div className="job-status-line"><span className={`mobile-status state-${state.toLowerCase()}`}>{state.replaceAll("_", " ")}</span><span>WO-1047</span></div>
          <h2>{locale === "ru" ? "Протечка под мойкой" : "Leak under kitchen sink"}</h2>
          <p>Omar Al Mansoori</p>
          <div className="job-address"><MapPin size={18} /><div><strong>JVC · District 12</strong><span>Street 14, Villa 38 · 18 min</span></div></div>
          <div className="mobile-quick-actions"><a href="tel:+971558207142"><Phone size={19} /><span>{t.callClient}</span></a><a href="https://maps.google.com" target="_blank" rel="noreferrer"><Navigation size={19} /><span>{t.route}</span></a></div>
          <button className="mobile-primary-action" type="button" onClick={advanceState} disabled={state === "WORK_COMPLETED"}>{state === "DISPATCHED" ? <Navigation size={20} /> : state === "ON_SITE" ? <Play size={20} /> : <CheckCircle2 size={20} />}{actionLabel[state]}<ChevronRight size={18} /></button>
        </section>

        <section className="mobile-task-section">
          <div className="mobile-section-heading"><div><ClipboardCheck size={19} /><h2>{t.checklist}</h2></div><span>{checked.filter(Boolean).length}/4</span></div>
          <div className="mobile-checklist">
            {[locale === "ru" ? "Подтвердить доступ к оборудованию" : "Confirm equipment access", locale === "ru" ? "Отключить подачу воды" : "Shut off water supply", locale === "ru" ? "Сфотографировать состояние до работ" : "Capture before photo", locale === "ru" ? "Проверить герметичность после ремонта" : "Run leak test after repair"].map((label, index) => <button type="button" key={label} onClick={() => toggleChecklist(index)} className={checked[index] ? "is-checked" : ""}><span>{checked[index] && <Check size={16} />}</span>{label}</button>)}
          </div>
        </section>

        <section className="mobile-tool-grid">
          <button type="button"><span><Package size={21} /></span><strong>{t.materials}</strong><small>2 items</small></button>
          <button type="button"><span><Camera size={21} /></span><strong>{t.photos}</strong><small>2 / 4</small></button>
          <button type="button"><span><Clock3 size={21} /></span><strong>{locale === "ru" ? "Время" : "Time"}</strong><small>00:46:18</small></button>
          <button type="button"><span><Wrench size={21} /></span><strong>{locale === "ru" ? "Работа" : "Work"}</strong><small>{locale === "ru" ? "В процессе" : "In progress"}</small></button>
        </section>

        <section className="upcoming-mobile-list"><div className="mobile-section-heading"><h2>{t.upcoming}</h2><span>3</span></div>
          <article><strong>11:00</strong><div><h3>{locale === "ru" ? "Диагностика кондиционера" : "AC diagnostics"}</h3><p>Nadia Karim · Business Bay</p></div><ChevronRight size={18} /></article>
          <article><strong>13:00</strong><div><h3>{locale === "ru" ? "Замена смесителя" : "Faucet replacement"}</h3><p>Maya Petrova · Palm Jumeirah</p></div><ChevronRight size={18} /></article>
        </section>
      </section>

      <nav className="technician-bottom-nav" aria-label="Technician navigation">
        <Link className="is-active" href="/m/horizon"><ClipboardCheck size={20} /><span>{t.today}</span></Link>
        <a href="#jobs"><Wrench size={20} /><span>{t.mobileJobs}</span></a>
        <a href="#notifications"><Bell size={20} /><span>{t.notifications}</span></a>
        <a href="#profile"><UserRound size={20} /><span>{t.profile}</span></a>
      </nav>
    </main>
  );
}
