"use client";

import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { LanguageSwitch } from "@/src/shared/ui/language-switch";

export function LoginView() {
  // EN: Render the public authentication entry point defined by AUTH-01.
  // RU: Отображает публичную точку входа, определённую экраном AUTH-01.
  const { messages: t } = useLocale();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // EN: Open the synthetic tenant used for the current foundation demo.
    // RU: Открывает синтетический tenant для текущей демонстрации фундамента.
    event.preventDefault();
    router.push("/app/horizon/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-labelledby="login-brand-title">
        <Link className="brand-lockup brand-lockup-light" href="/" aria-label="FlowDesk CRM">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <strong>FlowDesk</strong>
        </Link>

        <div className="login-brand-copy">
          <span className="eyebrow-light">FIELD SERVICE OPERATING SYSTEM</span>
          <h1 id="login-brand-title">{t.tagline}</h1>
          <p>{t.signInDescription}</p>
          <div className="login-benefits" aria-label="Product capabilities">
            <span><CheckCircle2 size={18} /> CRM &amp; work orders</span>
            <span><CheckCircle2 size={18} /> Dispatch &amp; field teams</span>
            <span><CheckCircle2 size={18} /> Estimates &amp; finance</span>
          </div>
        </div>

        <div className="login-trust-row">
          <ShieldCheck size={18} />
          <span>{t.secureSession}</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-toolbar">
          <LanguageSwitch />
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-heading">
            <span className="login-security-icon"><LockKeyhole size={22} /></span>
            <h2>{t.signIn}</h2>
            <p>{t.demoCompany}</p>
          </div>

          <label className="field-label">
            <span>{t.email}</span>
            <input type="email" defaultValue="owner@horizon.ae" autoComplete="email" />
          </label>

          <label className="field-label">
            <span>{t.password}</span>
            <input type="password" defaultValue="flowdesk-demo" autoComplete="current-password" />
          </label>

          <div className="login-options">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>{t.remember}</span>
            </label>
            <a href="#recovery">{t.forgot}</a>
          </div>

          <button className="primary-button login-submit" type="submit">
            {t.demoAccess}<ArrowRight size={18} />
          </button>

          <p className="demo-note">Demo · RU / EN · Asia/Dubai · AED</p>
        </form>
      </section>
    </main>
  );
}
