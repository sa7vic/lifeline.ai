import React from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES } from "../../i18n/config";
import { changeLanguage } from "../../i18n";

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const dir = i18n.dir(locale);

  return (
    <div className={`fixed top-4 z-50 ${dir === "rtl" ? "right-4" : "left-4"}`}>
      <label className="sr-only" htmlFor="lifeline-locale-switcher">
        {t("languageSwitcher.label")}
      </label>
      <select
        id="lifeline-locale-switcher"
        className="rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur"
        value={locale}
        onChange={(e) => changeLanguage(e.target.value)}
      >
        {SUPPORTED_LOCALES.map((lng) => (
          <option key={lng} value={lng}>
            {t(`languages.${lng}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
