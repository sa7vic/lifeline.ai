import React from "react";

export default function VoiceGuidance({ incident }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const sev = incident?.severity?.reasoning || null;
  const voiceScriptRaw = sev?.voice_script || "";
  const steps = sev?.first_aid_steps || [];

  function buildText() {
    const safety = "Safety reminder: If this is life-threatening or you are unsure, call emergency services in India: 112.";
    const script = (voiceScriptRaw || "").trim();

    if (script) {
      return script.includes("112") ? script : `${script} ${safety}`;
    }
    if (steps.length) {
      const stepText = steps.map((s, i) => `Step ${i + 1}. ${s.text}`).join(" ");
      return `${safety} ${stepText}`;
    }
    return safety;
  }

  function play() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(buildText());
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h3 className="text-lg font-semibold">Voice Guidance (TTS)</h3>
      <p className="text-sm text-white/70 mt-1">Plays AI voice script when available; otherwise reads steps.</p>
      <div className="mt-3 flex gap-2">
        <button disabled={!supported} className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50" onClick={play}>
          Play
        </button>
        <button disabled={!supported} className="px-3 py-2 rounded border border-white/20 disabled:opacity-50" onClick={stop}>
          Stop
        </button>
      </div>

      {sev?.voice_script ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-white/80">View voice script</summary>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-white/70 bg-black/30 border border-white/10 rounded p-3">
            {sev.voice_script}
          </pre>
        </details>
      ) : null}
    </div>
  );
}