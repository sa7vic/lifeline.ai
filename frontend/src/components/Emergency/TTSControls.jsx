import React from "react";
import { useTranslation } from "react-i18next";
import { speakText, stopSpeech, warmSpeechVoices } from "../../lib/tts";

export default function TTSControls({ steps, activeStep, setActiveStep }) {
  const { t, i18n } = useTranslation();
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const locale = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  React.useEffect(() => {
    warmSpeechVoices();
  }, []);

  function stop() {
    if (!supported) return;
    stopSpeech();
  }

  function playText(text) {
    if (!supported) return;
    speakText(text, { locale, rate: 1.0 });
  }

  function playActive() {
    const step = (steps || []).find((s) => s.n === activeStep);
    if (!step) return;
    playText(step.tts || `${step.title}. ${step.details}`);
  }

  function playAll() {
    const all = (steps || []).map((s) => s.tts || t("stepList.stepTitle", { n: s.n, title: s.title || "" })).join(" ");
    playText(all);
  }

  function nextStep() {
    const max = Math.max(...(steps || []).map((s) => s.n), 1);
    const next = Math.min(activeStep + 1, max);
    setActiveStep(next);
  }

  function prevStep() {
    const prev = Math.max(activeStep - 1, 1);
    setActiveStep(prev);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-lg font-semibold">{t("audio.title")}</h3>
      <p className="text-sm text-white/70 mt-1">{t("audio.subtitle")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!supported} className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50" onClick={playActive}>
          {t("audio.playStep", { step: activeStep })}
        </button>
        <button disabled={!supported} className="px-3 py-2 rounded bg-slate-200 text-black disabled:opacity-50" onClick={playAll}>
          {t("audio.playAll")}
        </button>
        <button disabled={!supported} className="px-3 py-2 rounded border border-white/20 disabled:opacity-50" onClick={stop}>
          {t("audio.stop")}
        </button>
        <button className="px-3 py-2 rounded border border-white/20" onClick={prevStep}>
          {t("audio.prev")}
        </button>
        <button className="px-3 py-2 rounded border border-white/20" onClick={nextStep}>
          {t("audio.next")}
        </button>
      </div>

      {!supported && <div className="text-xs text-white/60 mt-2">{t("audio.unsupported")}</div>}
    </div>
  );
}
