import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  detectPreferredLocale,
  isRtlLocale,
  normalizeLocale,
} from "./config";

const localeModules = import.meta.glob("./locales/*/*.json");

function loadNamespace(language, namespace) {
  const locale = normalizeLocale(language);
  const key = `./locales/${locale}/${namespace}.json`;
  const loader = localeModules[key];
  if (loader) return loader();

  const fallbackKey = `./locales/${DEFAULT_LOCALE}/${namespace}.json`;
  const fallbackLoader = localeModules[fallbackKey];
  if (!fallbackLoader) {
    return Promise.reject(new Error(`Missing locale bundle: ${fallbackKey}`));
  }
  return fallbackLoader();
}

function syncHtmlLanguage(locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
}

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(resourcesToBackend(loadNamespace))
    .use(initReactI18next)
    .init({
      lng: detectPreferredLocale(),
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: SUPPORTED_LOCALES,
      defaultNS: "translation",
      ns: ["translation"],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator", "htmlTag"],
        lookupLocalStorage: LOCALE_STORAGE_KEY,
        caches: ["localStorage"],
      },
      load: "languageOnly",
      returnEmptyString: false,
      react: {
        useSuspense: false,
      },
    });
}

i18n.on("languageChanged", (rawLocale) => {
  const locale = normalizeLocale(rawLocale);
  syncHtmlLanguage(locale);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
});

syncHtmlLanguage(normalizeLocale(i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE));

export default i18n;

export function changeLanguage(locale) {
  return i18n.changeLanguage(normalizeLocale(locale));
}

export function getCurrentLocale() {
  return normalizeLocale(i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE);
}

export function getApiLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return normalizeLocale(stored);

  return normalizeLocale(i18n.resolvedLanguage || i18n.language || window.navigator?.language || DEFAULT_LOCALE);
}
