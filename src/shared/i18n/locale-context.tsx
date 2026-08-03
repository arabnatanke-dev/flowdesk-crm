"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMessages, type Locale, type Messages } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // EN: Keep the interface locale as a device-local user preference.
  // RU: Хранит язык интерфейса как локальную пользовательскую настройку устройства.
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    // EN: Restore the last explicit language choice after hydration.
    // RU: Восстанавливает последний явно выбранный язык после гидратации.
    const storedLocale = window.localStorage.getItem("flowdesk.locale");
    if (storedLocale === "ru" || storedLocale === "en") {
      const restoreTimer = window.setTimeout(() => setLocaleState(storedLocale), 0);
      return () => window.clearTimeout(restoreTimer);
    }
  }, []);

  function setLocale(nextLocale: Locale) {
    // EN: Persist only the harmless UI preference, never business data.
    // RU: Сохраняет только безопасную UI-настройку, но не бизнес-данные.
    setLocaleState(nextLocale);
    window.localStorage.setItem("flowdesk.locale", nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = "ltr";
  }

  const value = useMemo(
    () => ({ locale, messages: getMessages(locale), setLocale }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  // EN: Expose the active locale and dictionary to presentation components.
  // RU: Предоставляет активный язык и словарь компонентам интерфейса.
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
