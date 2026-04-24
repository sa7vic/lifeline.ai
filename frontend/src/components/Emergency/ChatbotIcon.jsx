import React from "react";
import { useTranslation } from "react-i18next";

export default function ChatbotIcon({ onClick }) {
  const { t, i18n } = useTranslation();
  const sideClass = i18n.dir((i18n.resolvedLanguage || i18n.language || "en").split("-")[0]) === "rtl" ? "left-5" : "right-5";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-5 ${sideClass} z-50 rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center justify-center font-bold`}
      aria-label={t("chatbot.openAria")}
      title={t("chatbot.openTitle")}
    >
      AI
    </button>
  );
}