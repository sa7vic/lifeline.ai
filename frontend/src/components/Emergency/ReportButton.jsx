import React, { useState } from "react";

const API_BASE = "http://localhost:5000";

export default function ReportButton({ incidentId }) {
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!incidentId) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/report`);
      if (!res.ok) throw new Error("Failed to download report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${incidentId}_report.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      className="w-full px-3 py-3 rounded bg-slate-200 text-black font-semibold disabled:opacity-50"
      onClick={download}
      disabled={!incidentId || downloading}
    >
      {downloading ? "Downloading..." : "Generate Report (.txt)"}
    </button>
  );
}