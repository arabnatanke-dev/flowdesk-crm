"use client";

import { Globe2 } from "lucide-react";
import { useLocale } from "@/src/shared/i18n/locale-context";

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  // EN: Let the user switch between the two delivered interface languages.
  // RU: Позволяет пользователю переключаться между двумя реализованными языками.
  const { locale, setLocale } = useLocale();

  function selectRussian() {
    // EN: Activate the Russian interface dictionary.
    // RU: Включает русский словарь интерфейса.
    setLocale("ru");
  }

  function selectEnglish() {
    // EN: Activate the English interface dictionary.
    // RU: Включает английский словарь интерфейса.
    setLocale("en");
  }

  return (
    <div className={`language-switch ${compact ? "is-compact" : ""}`} aria-label="Language">
      <Globe2 size={16} aria-hidden="true" />
      <button
        type="button"
        className={locale === "ru" ? "is-active" : ""}
        onClick={selectRussian}
        aria-pressed={locale === "ru"}
      >
        RU
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === "en" ? "is-active" : ""}
        onClick={selectEnglish}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
