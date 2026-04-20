import React from "react";

export default function TTSControls({ steps, activeStep, setActiveStep }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
  }

  function playText(text) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    window.speechSynthesis.speak(u);
  }

  function playActive() {
    const step = (steps || []).find((s) => s.n === activeStep);
    if (!step) return;
    playText(step.tts || `${step.title}. ${step.details}`);
  }

  function playAll() {
    const all = (steps || []).map((s) => `Step ${s.n}. ${s.tts || s.title}`).join(" ");
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
      <h3 className="text-lg font-semibold">Audio Guidance</h3>
      <p className="text-sm text-white/70 mt-1">Play the selected step only (good for repeating step 8).</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={!supported} className="px-3 py-2 rounded bg-emerald-600 disabled:opacity-50" onClick={playActive}>
          Play Step {activeStep}
        </button>
        <button disabled={!supported} className="px-3 py-2 rounded bg-slate-200 text-black disabled:opacity-50" onClick={playAll}>
          Play All
        </button>
        <button disabled={!supported} className="px-3 py-2 rounded border border-white/20 disabled:opacity-50" onClick={stop}>
          Stop
        </button>
        <button className="px-3 py-2 rounded border border-white/20" onClick={prevStep}>
          Prev
        </button>
        <button className="px-3 py-2 rounded border border-white/20" onClick={nextStep}>
          Next
        </button>
      </div>

      {!supported && (
        <div className="text-xs text-white/60 mt-2">
          Speech Synthesis not supported in this browser.
        </div>
      )}
    </div>
  );
}