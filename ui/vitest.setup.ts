import { readFileSync } from "fs";
import { resolve } from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// ---------------------------------------------------------------------------
// i18n — load English translations synchronously so t() calls in components
// return real strings (not raw keys) during tests. Tests don't run an HTTP
// server so the production HttpBackend can't fetch locale files.
// ---------------------------------------------------------------------------
const LOCALES_DIR = resolve(__dirname, "public/locales/en");
const NS_NAMES = [
  "activity", "agents", "approvals", "auth", "common", "costs", "dashboard",
  "errors", "goals", "inbox", "issues", "navigation", "projects", "routines",
  "settings",
] as const;

function loadNs(ns: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(resolve(LOCALES_DIR, `${ns}.json`), "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    defaultNS: "common",
    ns: NS_NAMES as unknown as string[],
    resources: {
      en: Object.fromEntries(NS_NAMES.map((ns) => [ns, loadNs(ns)])),
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

const storageEntries = new Map<string, string>();

function installStorageMock(target: Record<string, unknown>) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageEntries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageEntries.set(key, String(value));
      },
      removeItem: (key: string) => {
        storageEntries.delete(key);
      },
      clear: () => {
        storageEntries.clear();
      },
    },
  });
}

if (
  typeof globalThis.localStorage?.getItem !== "function"
  || typeof globalThis.localStorage?.setItem !== "function"
  || typeof globalThis.localStorage?.removeItem !== "function"
  || typeof globalThis.localStorage?.clear !== "function"
) {
  installStorageMock(globalThis);
}

if (typeof window !== "undefined" && window.localStorage !== globalThis.localStorage) {
  installStorageMock(window as unknown as Record<string, unknown>);
}
