import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ChatbotIcon from "../components/Emergency/ChatbotIcon.jsx";
import ChatbotOverlay from "../components/Emergency/ChatbotOverlay.jsx";
import VideoRecorder from "../components/Emergency/VideoRecorder.jsx";
import { api, toUserMessage } from "../lib/api";
import { ensureGuestId, getSession } from "../lib/session";

export default function EmergencyInput() {
  const nav = useNavigate();
  const { t } = useTranslation();

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  async function next() {
    setErr("");
    if (!file) return setErr(t("emergency.uploadRequiredError"));

    setBusy(true);
    try {
      const rawSession = getSession();
      const session = ensureGuestId(rawSession) || rawSession;
      const created = await api.createIncident(file, session);
      nav(`/questionnaire/${created.incident_id}`);
    } catch (e) {
      setErr(toUserMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen text-white p-6 bg-gradient-to-b from-black via-slate-950 to-slate-900">
      <div className="max-w-3xl mx-auto grid gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl">{t("emergency.title")}</h2>
            <p className="text-sm text-white/70">{t("emergency.subtitle")}</p>
          </div>
          <div className="hidden md:block text-xs text-white/60">{t("emergency.emergencyLine")}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{t("emergency.recordTitle")}</div>
                <div className="text-xs text-white/60">{t("emergency.recordHelp")}</div>
              </div>
              <span className="text-xs px-3 py-1 rounded-full border border-white/15">{t("emergency.fastest")}</span>
            </div>

            <VideoRecorder onRecordedFile={(f) => setFile(f)} />
            {file && <div className="text-xs text-white/60 mt-2">{t("emergency.readyFile", { name: file.name })}</div>}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 grid gap-4">
            <div>
              <div className="text-lg font-semibold">{t("emergency.uploadTitle")}</div>
              <div className="text-xs text-white/60">{t("emergency.uploadHelp")}</div>
            </div>
            <input
              className="block w-full text-sm"
              type="file"
              accept="video/webm,video/mp4"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <div className="mt-auto">
              {err && <div className="mt-2 text-sm text-red-300">{err}</div>}
              <button
                className="mt-3 w-full px-4 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-lg font-semibold disabled:opacity-50"
                onClick={next}
                disabled={busy || !file}
              >
                {busy ? t("emergency.sending") : t("emergency.send")}
              </button>
              <div className="mt-2 text-xs text-white/60">{t("emergency.chatbotHint")}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
          {t("emergency.responseFlow")}
        </div>
      </div>

      <ChatbotIcon onClick={() => setChatOpen(true)} />
      <ChatbotOverlay open={chatOpen} onClose={() => setChatOpen(false)} incidentId={null} />
    </div>
  );
}
