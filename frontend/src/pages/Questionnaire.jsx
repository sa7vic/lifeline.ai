import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, toUserMessage } from "../lib/api";
import ChatbotIcon from "../components/Emergency/ChatbotIcon.jsx";
import ChatbotOverlay from "../components/Emergency/ChatbotOverlay.jsx";

function Questionnaire() {
  const nav = useNavigate();
  const { incidentId } = useParams();
  const { t } = useTranslation();

  const [chatOpen, setChatOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState({
    location_text: "",
    conscious: "unsure",
    breathing: "unsure",
    visible_injuries: "unsure",
    environment_hazards: [],
    description: "",
  });

  function setField(k, v) {
    setQ((x) => ({ ...x, [k]: v }));
  }

  function toggleHazard(h) {
    setQ((x) => {
      const cur = new Set(x.environment_hazards || []);
      if (cur.has(h)) cur.delete(h);
      else cur.add(h);
      return { ...x, environment_hazards: Array.from(cur) };
    });
  }

  async function submit() {
    setErr("");
    const loc = (q.location_text || "").trim();
    if (!loc) return setErr(t("questionnaire.locationRequiredError"));

    setBusy(true);
    try {
      await api.saveQuestionnaire(incidentId, { ...q, location_text: loc });
      nav(`/guidance/${incidentId}`);
    } catch (e) {
      setErr(toUserMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  const ynu = ["yes", "no", "unsure"];
  const hazardOptions = ["traffic", "fire", "none", "other"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-900 text-white p-6">
      <div className="max-w-xl mx-auto grid gap-4">
        <h2 className="text-xl font-bold">{t("questionnaire.title")}</h2>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid gap-4">
          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.locationLabel")}</div>
            <input
              className="px-3 py-2 rounded bg-black/30 border border-white/10 w-full"
              placeholder={t("questionnaire.locationPlaceholder")}
              value={q.location_text}
              onChange={(e) => setField("location_text", e.target.value)}
            />
            <div className="text-xs text-white/60 mt-1">{t("questionnaire.locationHelp")}</div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.conscious")}</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button
                  key={x}
                  onClick={() => setField("conscious", x)}
                  className={`px-3 py-2 rounded border ${q.conscious === x ? "bg-white text-black" : "border-white/20"}`}
                >
                  {t(`answers.${x}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.breathing")}</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button
                  key={x}
                  onClick={() => setField("breathing", x)}
                  className={`px-3 py-2 rounded border ${q.breathing === x ? "bg-white text-black" : "border-white/20"}`}
                >
                  {t(`answers.${x}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.visibleInjuries")}</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button
                  key={x}
                  onClick={() => setField("visible_injuries", x)}
                  className={`px-3 py-2 rounded border ${q.visible_injuries === x ? "bg-white text-black" : "border-white/20"}`}
                >
                  {t(`answers.${x}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.hazards")}</div>
            <div className="flex gap-2 flex-wrap">
              {hazardOptions.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleHazard(h)}
                  className={`px-3 py-2 rounded border ${(q.environment_hazards || []).includes(h) ? "bg-white text-black" : "border-white/20"}`}
                >
                  {t(`hazards.${h}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">{t("questionnaire.descriptionLabel")}</div>
            <textarea
              className="px-3 py-2 rounded bg-black/30 border border-white/10 w-full min-h-[90px]"
              placeholder={t("questionnaire.descriptionPlaceholder")}
              value={q.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </div>

          {err && <div className="text-sm text-red-300">{err}</div>}

          <button
            className="w-full px-3 py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-50"
            onClick={submit}
            disabled={busy}
          >
            {busy ? t("questionnaire.saving") : t("questionnaire.submit")}
          </button>

          <div className="text-xs text-white/60">{t("questionnaire.safety")}</div>
        </div>
      </div>

      <ChatbotIcon onClick={() => setChatOpen(true)} />
      <ChatbotOverlay open={chatOpen} onClose={() => setChatOpen(false)} incidentId={incidentId} />
    </div>
  );
}

export default Questionnaire;
