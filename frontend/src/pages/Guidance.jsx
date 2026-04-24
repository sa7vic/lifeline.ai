import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, toUserMessage } from "../lib/api";
import { useLocaleFormat } from "../i18n/format";
import { speakText, stopSpeech, warmSpeechVoices } from "../lib/tts";

import ChatbotIcon from "../components/Emergency/ChatbotIcon.jsx";
import ChatbotOverlay from "../components/Emergency/ChatbotOverlay.jsx";
import StepList from "../components/Emergency/StepList.jsx";
import TTSControls from "../components/Emergency/TTSControls.jsx";
import VoiceControl from "../components/Emergency/VoiceControl.jsx";
import EmergencyCallButton from "../components/Emergency/EmergencyCallButton.jsx";
import ReportButton from "../components/Emergency/ReportButton.jsx";

function toSeverityKey(level) {
  if (!level) return "unknown";
  const normalized = String(level).toLowerCase();
  if (["critical", "high", "moderate", "low"].includes(normalized)) return normalized;
  return "unknown";
}

export default function Guidance() {
  const { incidentId } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatNumber } = useLocaleFormat();
  const locale = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  const [chatOpen, setChatOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  const [incident, setIncident] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const analyzed = await api.analyzeIncident(incidentId);
      setIncident(analyzed.incident);

      const steps = analyzed.incident?.severity?.reasoning?.steps || [];
      if (steps.length) setActiveStep(steps[0].n || 1);
    } catch (e) {
      setErr(toUserMessage(e, t));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [incidentId]);

  useEffect(() => {
    warmSpeechVoices();
  }, []);

  const sev = incident?.severity?.reasoning || {};
  const steps = sev.steps || [];

  const level = sev.severity || incident?.severity?.level || "Unknown";
  const localizedLevel = t(`severity.${toSeverityKey(level)}`);

  const banner =
    level === "Critical"
      ? "bg-red-600"
      : level === "High"
        ? "bg-orange-500"
        : level === "Moderate"
          ? "bg-yellow-500 text-black"
          : "bg-green-600";

  const confidenceText =
    typeof sev.confidence === "number"
      ? t("guidance.confidence", {
          confidence: formatNumber(sev.confidence, { style: "percent", maximumFractionDigits: 0 }),
        })
      : "";

  const ttsHelpers = useMemo(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    const playText = (text) => {
      if (!supported) return;
      speakText(text, { locale, rate: 1.0 });
    };
    const stop = () => supported && stopSpeech();
    const playStepN = (n) => {
      const s = steps.find((x) => x.n === n);
      if (!s) return;
      playText(s.tts || `${s.title}. ${s.details}`);
    };
    const playAll = () => playText(steps.map((s) => s.tts || t("stepList.stepTitle", { n: s.n, title: s.title || "" })).join(" "));
    return { playStepN, playAll, stop };
  }, [locale, steps, t]);

  if (busy) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-xl mx-auto">{t("guidance.analyzing")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto grid gap-4">
        <div className="flex items-center justify-between">
          <button className="px-3 py-2 rounded border border-white/20" onClick={() => nav("/emergency")}>
            {t("guidance.back")}
          </button>
          <div className="text-xs text-white/60">{t("common.incidentLabel", { incidentId })}</div>
        </div>

        {err && <div className="text-sm text-red-300">{err}</div>}

        <div className={`p-4 rounded-xl ${banner} font-bold`}>
          {t("guidance.severity", { level: localizedLevel })}
          {confidenceText ? ` • ${confidenceText}` : ""}
        </div>

        {sev.summary && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="font-semibold">{t("guidance.summary")}</div>
            <div className="text-sm text-white/80 mt-1">{sev.summary}</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="font-semibold">{t("guidance.steps")}</div>
            <div className="text-xs text-white/60 mt-1">{t("guidance.stepsHelp")}</div>
            <div className="mt-3">
              <StepList steps={steps} activeStep={activeStep} onSelect={setActiveStep} />
            </div>
          </div>

          <div className="grid gap-4">
            <TTSControls steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} />

            <VoiceControl
              enabled={voiceEnabled}
              setEnabled={setVoiceEnabled}
              steps={steps}
              activeStep={activeStep}
              setActiveStep={setActiveStep}
              onPlayActive={(n) => ttsHelpers.playStepN(n)}
              onPlayAll={() => ttsHelpers.playAll()}
              onStop={() => ttsHelpers.stop()}
            />

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid gap-2">
              <div className="font-semibold">{t("guidance.emergencySupport")}</div>
              <div className="text-sm text-white/70">{t("guidance.emergencySupportText")}</div>
              <EmergencyCallButton />
              <ReportButton incidentId={incidentId} />
            </div>
          </div>
        </div>

        <div className="text-xs text-white/60">{t("guidance.routingNote")}</div>
      </div>

      <ChatbotIcon onClick={() => setChatOpen(true)} />
      <ChatbotOverlay
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        incidentId={incidentId}
        onSteps={(newSteps, recommended) => {
          if (Array.isArray(newSteps) && newSteps.length) {
            setIncident((prev) => {
              if (!prev) return prev;
              const next = structuredClone(prev);
              next.severity.reasoning.steps = newSteps;
              return next;
            });
            setActiveStep(recommended || newSteps[0].n || 1);
          }
        }}
      />
    </div>
  );
}
