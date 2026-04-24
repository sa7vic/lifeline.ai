export const SUPPORTED_LOCALES = ["en", "hi", "ar"];
export const DEFAULT_LOCALE = "en";
export const RTL_LOCALES = new Set(["ar"]);
export const LOCALE_STORAGE_KEY = "lifeline_locale";

export function normalizeLocale(value) {
  if (!value || typeof value !== "string") return DEFAULT_LOCALE;
  const normalized = value.trim().replace(/_/g, "-").toLowerCase();
  const base = normalized.split("-")[0];
  return SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE;
}

export function isRtlLocale(locale) {
  return RTL_LOCALES.has(normalizeLocale(locale));
}

export function detectPreferredLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return normalizeLocale(stored);

  const browserLanguage =
    (Array.isArray(window.navigator?.languages) && window.navigator.languages[0]) ||
    window.navigator?.language ||
    DEFAULT_LOCALE;

  return normalizeLocale(browserLanguage);
}
