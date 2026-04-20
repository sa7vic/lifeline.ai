import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

import ChatbotIcon from "../components/Emergency/ChatbotIcon.jsx";
import ChatbotOverlay from "../components/Emergency/ChatbotOverlay.jsx";
import StepList from "../components/Emergency/StepList.jsx";
import TTSControls from "../components/Emergency/TTSControls.jsx";
import VoiceControl from "../components/Emergency/VoiceControl.jsx";
import EmergencyCallButton from "../components/Emergency/EmergencyCallButton.jsx";
import ReportButton from "../components/Emergency/ReportButton.jsx";

export default function Guidance() {
  const { incidentId } = useParams();
  const nav = useNavigate();

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
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, [incidentId]);

  const sev = incident?.severity?.reasoning || {};
  const steps = sev.steps || [];

  const level = sev.severity || incident?.severity?.level || "Unknown";
  const banner =
    level === "Critical" ? "bg-red-600" :
    level === "High" ? "bg-orange-500" :
    level === "Moderate" ? "bg-yellow-500 text-black" :
    "bg-green-600";

  const ttsHelpers = useMemo(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    const playText = (text) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    };
    const stop = () => supported && window.speechSynthesis.cancel();
    const playStepN = (n) => {
      const s = steps.find((x) => x.n === n);
      if (!s) return;
      playText(s.tts || `${s.title}. ${s.details}`);
    };
    const playAll = () => playText(steps.map((s) => `Step ${s.n}. ${s.tts || s.title}`).join(" "));
    return { playStepN, playAll, stop };
  }, [steps]);

  if (busy) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-xl mx-auto">Analyzing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto grid gap-4">
        <div className="flex items-center justify-between">
          <button className="px-3 py-2 rounded border border-white/20" onClick={() => nav("/emergency")}>
            ← Retake / Back
          </button>
          <div className="text-xs text-white/60">Incident: {incidentId}</div>
        </div>

        {err && <div className="text-sm text-red-300">{err}</div>}

        <div className={`p-4 rounded-xl ${banner} font-bold`}>
          SEVERITY: {level}
          {typeof sev.confidence === "number" ? ` • ${Math.round(sev.confidence * 100)}%` : ""}
        </div>

        {sev.summary && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="font-semibold">Summary</div>
            <div className="text-sm text-white/80 mt-1">{sev.summary}</div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="font-semibold">Steps</div>
            <div className="text-xs text-white/60 mt-1">Tap any step (e.g., Step 8) then play that step only.</div>
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
              <div className="font-semibold">Emergency Support</div>
              <div className="text-sm text-white/70">AI guidance is supplemental. Call 112 if life-threatening.</div>
              <EmergencyCallButton />
              <ReportButton incidentId={incidentId} />
            </div>
          </div>
        </div>

        <div className="text-xs text-white/60">
          Alert routing: Health Officials receive priority alerts; Volunteers can also respond to High/Critical cases.
        </div>
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