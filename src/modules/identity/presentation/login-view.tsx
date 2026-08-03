"use client";

import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/src/shared/i18n/locale-context";
import { LanguageSwitch } from "@/src/shared/ui/language-switch";

export function LoginView() {
  // EN: Render the public authentication entry point defined by AUTH-01.
  // RU: Отображает публичную точку входа, определённую экраном AUTH-01.
  const { messages: t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // EN: Submit credentials to the server and navigate only to its authorized tenant destination.
    // RU: Передаёт учётные данные серверу и открывает только разрешённый им tenant-адрес.
    event.preventDefault();
    setPending(true);
    setErrorMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          remember: form.get("remember") === "on",
          returnTo: searchParams.get("returnTo"),
        }),
      });
      const payload = await response.json() as { redirectTo?: string; error?: { message?: string } };
      if (!response.ok || !payload.redirectTo) throw new Error(payload.error?.message ?? "Sign-in failed.");
      router.replace(payload.redirectTo);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
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
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label className="field-label">
            <span>{t.password}</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          <div className="login-options">
            <label className="checkbox-label">
              <input name="remember" type="checkbox" />
              <span>{t.remember}</span>
            </label>
            <a href="#recovery">{t.forgot}</a>
          </div>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <button className="primary-button login-submit" type="submit" disabled={pending}>
            {pending ? "…" : t.signIn}<ArrowRight size={18} />
          </button>

          <p className="demo-note">FlowDesk CRM · RU / EN</p>
        </form>
      </section>
    </main>
  );
}
