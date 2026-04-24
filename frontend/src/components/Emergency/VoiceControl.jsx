import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function getRecognitionLocale(locale) {
  if (locale === "hi") return "hi-IN";
  if (locale === "ar") return "ar";
  return "en-IN";
}

export default function VoiceControl({
  enabled,
  setEnabled,
  steps,
  activeStep,
  setActiveStep,
  onPlayActive,
  onPlayAll,
  onStop,
}) {
  const { t, i18n } = useTranslation();

  const SpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const supported = !!SpeechRecognition;
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setListening(false);
    }
  }, [enabled]);

  function parseCommand(text) {
    const value = (text || "").toLowerCase();

    if (value.includes("stop")) return { type: "stop" };
    if (value.includes("play all")) return { type: "playAll" };
    if (value.includes("next")) return { type: "next" };
    if (value.includes("previous") || value.includes("back")) return { type: "prev" };

    const m = value.match(/step\s+(\d+)/);
    if (m) return { type: "step", n: parseInt(m[1], 10) };

    if (value.includes("repeat")) return { type: "repeat" };
    return { type: "unknown" };
  }

  function start() {
    if (!supported) return;

    const recog = new SpeechRecognition();
    recog.lang = getRecognitionLocale((i18n.resolvedLanguage || i18n.language || "en").split("-")[0]);
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    setListening(true);

    recog.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      const cmd = parseCommand(text);

      if (cmd.type === "stop") onStop();
      if (cmd.type === "playAll") onPlayAll();
      if (cmd.type === "next") setActiveStep((s) => Math.min(s + 1, steps.length || s));
      if (cmd.type === "prev") setActiveStep((s) => Math.max(s - 1, 1));
      if (cmd.type === "step" && Number.isFinite(cmd.n)) {
        const max = Math.max(...(steps || []).map((x) => x.n), cmd.n);
        const clamped = Math.max(1, Math.min(cmd.n, max));
        setActiveStep(clamped);
        onPlayActive(clamped);
      }
      if (cmd.type === "repeat") onPlayActive(activeStep);
    };

    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recog.start();
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("voice.title")}</h3>
          <p className="text-sm text-white/70">{t("voice.subtitle")}</p>
        </div>

        <button
          className={`px-3 py-2 rounded border ${enabled ? "bg-white text-black border-white" : "border-white/20"}`}
          onClick={() => setEnabled((v) => !v)}
          disabled={!supported}
          title={!supported ? t("voice.unsupportedTitle") : ""}
        >
          {enabled ? t("common.on") : t("common.off")}
        </button>
      </div>

      {enabled && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={start} disabled={listening || !supported}>
            {listening ? t("voice.listening") : t("voice.startListening")}
          </button>
          <div className="text-xs text-white/60 self-center">{t("voice.commandHint")}</div>
        </div>
      )}

      {!supported && <div className="text-xs text-white/60 mt-2">{t("voice.unsupported")}</div>}
    </div>
  );
}
