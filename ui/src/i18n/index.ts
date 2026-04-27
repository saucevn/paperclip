import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import "./types";

export const SUPPORTED_LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "vi", nativeLabel: "Tiếng Việt" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export const LANGUAGE_STORAGE_KEY = "paperclip.language";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "vi"],
    defaultNS: "common",
    ns: [
      "common",
      "navigation",
      "dashboard",
      "issues",
      "agents",
      "goals",
      "projects",
      "routines",
      "inbox",
      "approvals",
      "costs",
      "activity",
      "settings",
      "auth",
      "errors",
    ],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
