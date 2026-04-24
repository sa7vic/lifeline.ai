import React from "react";
import { useTranslation } from "react-i18next";

export default function EmergencyCallButton() {
  const { t } = useTranslation();

  return (
    <a
      className="w-full inline-flex justify-center px-3 py-3 rounded bg-red-600 hover:bg-red-500 font-semibold"
      href="tel:112"
    >
      {t("callButton.label")}
    </a>
  );
}