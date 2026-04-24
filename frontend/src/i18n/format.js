import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, isRtlLocale, normalizeLocale } from "./config";

function toDate(value) {
  if (value instanceof Date) return value;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  // Treat low epoch values as seconds and convert to milliseconds.
  const millis = n < 1_000_000_000_000 ? n * 1000 : n;
  const d = new Date(millis);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function createFormatters(localeInput) {
  const locale = normalizeLocale(localeInput || DEFAULT_LOCALE);

  function formatDate(value, options = { dateStyle: "medium" }) {
    const d = toDate(value);
    if (!d) return "";
    return new Intl.DateTimeFormat(locale, options).format(d);
  }

  function formatDateTime(value, options = { dateStyle: "medium", timeStyle: "short" }) {
    const d = toDate(value);
    if (!d) return "";
    return new Intl.DateTimeFormat(locale, options).format(d);
  }

  function formatNumber(value, options = {}) {
    const n = toNumber(value);
    if (n === null) return "";
    return new Intl.NumberFormat(locale, options).format(n);
  }

  function formatCurrency(value, currency = "USD", options = {}) {
    const n = toNumber(value);
    if (n === null) return "";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...options,
    }).format(n);
  }

  return {
    locale,
    isRtl: isRtlLocale(locale),
    formatDate,
    formatDateTime,
    formatNumber,
    formatCurrency,
  };
}

export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage || i18n.language || DEFAULT_LOCALE);

  return useMemo(() => createFormatters(locale), [locale]);
}
