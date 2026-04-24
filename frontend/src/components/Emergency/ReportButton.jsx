import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiLocale } from "../../i18n";

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function ReportButton({ incidentId }) {
  const { t } = useTranslation();

  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState("");

  async function download() {
    if (!incidentId) return;
    setErr("");
    setDownloading(true);

    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/report`, {
        headers: {
          "Accept-Language": getApiLocale(),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("report.downloadFailed"));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${incidentId}_report.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || t("report.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        className="w-full px-3 py-3 rounded bg-slate-200 text-black font-semibold disabled:opacity-50"
        onClick={download}
        disabled={!incidentId || downloading}
      >
        {downloading ? t("report.downloading") : t("report.generate")}
      </button>
      {err && <div className="text-xs text-red-300">{err}</div>}
    </div>
  );
}
