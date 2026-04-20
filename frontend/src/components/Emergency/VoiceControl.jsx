import React, { useEffect, useMemo, useState } from "react";

export default function VoiceControl({ enabled, setEnabled, steps, activeStep, setActiveStep, onPlayActive, onPlayAll, onStop }) {
  const SpeechRecognition = useMemo(() => {
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
    const t = (text || "").toLowerCase();

    if (t.includes("stop")) return { type: "stop" };
    if (t.includes("play all")) return { type: "playAll" };
    if (t.includes("next")) return { type: "next" };
    if (t.includes("previous") || t.includes("back")) return { type: "prev" };

    const m = t.match(/step\s+(\d+)/);
    if (m) return { type: "step", n: parseInt(m[1], 10) };

    if (t.includes("repeat")) return { type: "repeat" };
    return { type: "unknown" };
  }

  function start() {
    if (!supported) return;
    const recog = new SpeechRecognition();
    recog.lang = "en-IN";
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
          <h3 className="text-lg font-semibold">Voice Control</h3>
          <p className="text-sm text-white/70">Toggle voice commands like “next step” or “step 8”.</p>
        </div>

        <button
          className={`px-3 py-2 rounded border ${enabled ? "bg-white text-black border-white" : "border-white/20"}`}
          onClick={() => setEnabled((v) => !v)}
          disabled={!supported}
          title={!supported ? "Speech recognition not supported in this browser" : ""}
        >
          {enabled ? "ON" : "OFF"}
        </button>
      </div>

      {enabled && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={start} disabled={listening || !supported}>
            {listening ? "Listening..." : "Start Listening"}
          </button>
          <div className="text-xs text-white/60 self-center">
            Say: “next step”, “repeat step 8”, “play all”, “stop”
          </div>
        </div>
      )}

      {!supported && <div className="text-xs text-white/60 mt-2">Speech recognition not supported here.</div>}
    </div>
  );
}