import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import ChatbotIcon from "../components/Emergency/ChatbotIcon.jsx";
import ChatbotOverlay from "../components/Emergency/ChatbotOverlay.jsx";

function Questionnaire() {
  const nav = useNavigate();
  const { incidentId } = useParams();

  const [chatOpen, setChatOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [q, setQ] = useState({
    location_text: "",
    conscious: "unsure",
    breathing: "unsure",
    visible_injuries: "unsure",
    environment_hazards: []
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
    if (!loc) return setErr("Location is required.");

    setBusy(true);
    try {
      await api.saveQuestionnaire(incidentId, { ...q, location_text: loc });
      nav(`/guidance/${incidentId}`);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const ynu = ["yes", "no", "unsure"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-slate-900 text-white p-6">
      <div className="max-w-xl mx-auto grid gap-4">
        <h2 className="text-xl font-bold">Questionnaire</h2>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid gap-4">
          <div>
            <div className="text-sm text-white/80 mb-2">Your location (text) *</div>
            <input className="px-3 py-2 rounded bg-black/30 border border-white/10 w-full"
              placeholder="e.g., Andheri West, Mumbai"
              value={q.location_text}
              onChange={(e) => setField("location_text", e.target.value)}
            />
            <div className="text-xs text-white/60 mt-1">
              Required for responder matching. Health Officials see alerts first; Volunteers can opt in.
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">Conscious?</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button key={x} onClick={() => setField("conscious", x)}
                  className={`px-3 py-2 rounded border ${q.conscious === x ? "bg-white text-black" : "border-white/20"}`}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">Breathing?</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button key={x} onClick={() => setField("breathing", x)}
                  className={`px-3 py-2 rounded border ${q.breathing === x ? "bg-white text-black" : "border-white/20"}`}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">Visible injuries?</div>
            <div className="flex gap-2 flex-wrap">
              {ynu.map((x) => (
                <button key={x} onClick={() => setField("visible_injuries", x)}
                  className={`px-3 py-2 rounded border ${q.visible_injuries === x ? "bg-white text-black" : "border-white/20"}`}>
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-white/80 mb-2">Hazards</div>
            <div className="flex gap-2 flex-wrap">
              {["traffic", "fire", "none", "other"].map((h) => (
                <button key={h} onClick={() => toggleHazard(h)}
                  className={`px-3 py-2 rounded border ${(q.environment_hazards || []).includes(h) ? "bg-white text-black" : "border-white/20"}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {err && <div className="text-sm text-red-300">{err}</div>}

          <button className="w-full px-3 py-3 rounded bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-50"
            onClick={submit} disabled={busy}>
            {busy ? "Saving..." : "Submit"}
          </button>

          <div className="text-xs text-white/60">
            Safety: call 112 if life-threatening or unsure.
          </div>
        </div>
      </div>

      <ChatbotIcon onClick={() => setChatOpen(true)} />
      <ChatbotOverlay open={chatOpen} onClose={() => setChatOpen(false)} incidentId={incidentId} />
    </div>
  );
}

export default Questionnaire;