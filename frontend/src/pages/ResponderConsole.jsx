import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getSession } from "../lib/session";
import { initRealtime } from "../lib/realtime";

const hazardOptions = ["traffic", "fire", "none", "other"];

function normalizeLocation(value) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export default function ResponderConsole() {
  const nav = useNavigate();
  const [session, setSession] = useState(() => getSession());
  const [active, setActive] = useState(true);
  const [locationText, setLocationText] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, ok: "", err: "" });

  const [scopeFilter, setScopeFilter] = useState("my");
  const [severityFilter, setSeverityFilter] = useState("high_critical");
  const [hazardFilter, setHazardFilter] = useState("");

  const socket = useMemo(() => initRealtime(), []);
  const [alerts, setAlerts] = useState({});

  const role = session?.role || session?.user?.role || "patient";
  const isResponder = role === "official" || role === "volunteer";
  const title = role === "official" ? "Health Official Console" : "Volunteer Console";
  const accentStyles = role === "official"
    ? {
        chipActive: "border bg-amber-500 text-black border-amber-300",
        toggle: "bg-amber-400 text-black border-amber-300",
        badge: "border-amber-300/40 text-amber-200",
        cta: "bg-amber-400 text-black",
      }
    : {
        chipActive: "border bg-emerald-500 text-black border-emerald-300",
        toggle: "bg-emerald-400 text-black border-emerald-300",
        badge: "border-emerald-300/40 text-emerald-200",
        cta: "bg-emerald-400 text-black",
      };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function syncSession() {
      setSession(getSession());
    }

    window.addEventListener("lifeline_session_changed", syncSession);
    return () => window.removeEventListener("lifeline_session_changed", syncSession);
  }, []);

  useEffect(() => {
    const profileLocation = session?.user?.profile?.locationText || "";
    if (profileLocation && !locationText) setLocationText(profileLocation);
  }, [session, locationText]);

  useEffect(() => {
    if (!socket) return undefined;

    function onEnter(payload) {
      setAlerts((prev) => ({
        ...prev,
        [payload.alert_id]: {
          ...payload,
          source: "priority",
          received_at: Date.now(),
        },
      }));
    }

    function onUpdate(payload) {
      setAlerts((prev) => ({
        ...prev,
        [payload.alert_id]: {
          ...prev[payload.alert_id],
          ...payload,
          source: "priority",
          received_at: Date.now(),
        },
      }));
    }

    function onExit(payload) {
      setAlerts((prev) => {
        const next = { ...prev };
        delete next[payload.alert_id];
        return next;
      });
    }

    function onVolunteerAlert(payload) {
      if (role !== "volunteer") return;
      const incoming = normalizeLocation(payload.location_text);
      if (locationText && incoming && normalizeLocation(locationText) !== incoming) return;
      const id = `vol_${payload.incident_id}`;
      setAlerts((prev) => ({
        ...prev,
        [id]: {
          ...payload,
          alert_id: id,
          source: "volunteer",
          received_at: Date.now(),
        },
      }));
    }

    socket.on("serious_alert", onEnter);
    socket.on("serious_alert_update", onUpdate);
    socket.on("serious_alert_exit", onExit);
    socket.on("volunteer_alert", onVolunteerAlert);

    return () => {
      socket.off("serious_alert", onEnter);
      socket.off("serious_alert_update", onUpdate);
      socket.off("serious_alert_exit", onExit);
      socket.off("volunteer_alert", onVolunteerAlert);
    };
  }, [socket, role, locationText]);

  const filteredAlerts = useMemo(() => {
    let list = Object.values(alerts);

    if (severityFilter === "high_critical") {
      list = list.filter((a) => a.severity === "High" || a.severity === "Critical");
    } else if (severityFilter === "critical") {
      list = list.filter((a) => a.severity === "Critical");
    } else if (severityFilter === "high") {
      list = list.filter((a) => a.severity === "High");
    }

    if (hazardFilter) {
      list = list.filter((a) => (a.hazards || []).includes(hazardFilter));
    }

    if (scopeFilter === "my") {
      return list;
    }

    return list;
  }, [alerts, severityFilter, hazardFilter, scopeFilter]);

  function chipClass(selected, tone) {
    if (!selected) return "border border-white/15 text-white/70 hover:border-white/30";
    if (tone === "accent") return accentStyles.chipActive;
    return "border bg-white text-black border-white/70";
  }

  async function saveLocation() {
    setSaveState({ busy: true, ok: "", err: "" });
    try {
      if (!session?.token) throw new Error("Login to save a responder location.");
      if (role !== "volunteer") throw new Error("Only volunteers need a text location.");

      const loc = (locationText || "").trim();
      if (!loc) throw new Error("Enter a location text first.");

      await api.volunteerOptIn(session.token, { active, location_text: loc });
      setSaveState({ busy: false, ok: "Saved. You will receive matching alerts.", err: "" });
    } catch (e) {
      setSaveState({ busy: false, ok: "", err: e.message || String(e) });
    }
  }

  if (!isResponder) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Responder access only</div>
          <div className="text-sm text-white/70 mt-2">
            Health Officials and Volunteers can access this console after signing in.
          </div>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-white text-black"
            onClick={() => nav("/")}
          >
            Return to access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white p-6"
      style={{
        backgroundImage:
          "radial-gradient(1000px 650px at 85% -15%, rgba(245,158,11,0.2), transparent 60%), radial-gradient(800px 600px at 10% 10%, rgba(16,185,129,0.2), transparent 55%), linear-gradient(180deg, #050505 0%, #0c111c 55%, #0f1623 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto grid gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-white/50">Responder</div>
            <h2 className="text-3xl md:text-4xl">{title}</h2>
            <p className="text-sm text-white/70 mt-1">
              Priority alerts for officials. Volunteers support nearby incidents in real time.
            </p>
          </div>
          <div className="text-xs text-white/50">
            Status updates refresh every few seconds.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Responder Status</div>
                  <div className="text-xs text-white/60">
                    {role === "official"
                      ? "Primary responder visibility and command access."
                      : "Opt in to receive exact location matches."}
                  </div>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                    active ? accentStyles.toggle : "border-white/20 text-white/70"
                  }`}
                  onClick={() => setActive((prev) => !prev)}
                >
                  {active ? "ON" : "OFF"}
                </button>
              </div>

              <div className="mt-4 text-xs text-white/50">
                {role === "official"
                  ? "GPS location is used for priority routing. Keep it enabled for faster dispatch."
                  : "Set your location text to filter volunteer alerts. Exact match only."}
              </div>

              <div className="mt-4">
                <div className="text-xs text-white/60 mb-2">My location text</div>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  placeholder="e.g., Andheri West, Mumbai"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  disabled={role === "official"}
                />
              </div>

              <button
                className="mt-4 w-full px-4 py-3 rounded-lg bg-white text-black font-semibold disabled:opacity-60"
                onClick={saveLocation}
                disabled={saveState.busy || role !== "volunteer"}
              >
                {saveState.busy ? "Saving..." : "Save Location"}
              </button>
              {saveState.ok && <div className="text-xs text-emerald-200 mt-2">{saveState.ok}</div>}
              {saveState.err && <div className="text-xs text-red-300 mt-2">{saveState.err}</div>}
              <div className="text-xs text-white/50 mt-3">
                {session?.token ? "" : "Login to save a responder location."}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold">Safety guidance</div>
              <div className="text-xs text-white/70 mt-2">
                Do not approach if unsafe. Call 112 for life-threatening emergencies. Provide clear status updates.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Realtime Alerts</div>
                <div className="text-xs text-white/60">
                  Alerts refresh automatically. Official priority is always preserved.
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border ${accentStyles.badge}`}>
                {role === "official" ? "Priority" : "Support"}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(scopeFilter === "my", "white")}`}
                  onClick={() => setScopeFilter("my")}
                >
                  My location
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(scopeFilter === "all", "white")}`}
                  onClick={() => setScopeFilter("all")}
                >
                  All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "high_critical", "accent")}`}
                  onClick={() => setSeverityFilter("high_critical")}
                >
                  High+Critical
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "critical", "accent")}`}
                  onClick={() => setSeverityFilter("critical")}
                >
                  Critical only
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "high", "accent")}`}
                  onClick={() => setSeverityFilter("high")}
                >
                  High only
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "all", "accent")}`}
                  onClick={() => setSeverityFilter("all")}
                >
                  All severities
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {hazardOptions.map((h) => (
                  <button
                    key={h}
                    className={`px-3 py-2 rounded-lg text-xs ${chipClass(hazardFilter === h, "white")}`}
                    onClick={() => setHazardFilter((prev) => (prev === h ? "" : h))}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredAlerts.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
                  No matching alerts yet. Keep location active for faster routing.
                </div>
              )}

              {filteredAlerts.map((alert) => (
                <div
                  key={alert.alert_id}
                  className="rounded-xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {alert.severity || "Serious"} incident
                    </div>
                    <span className="text-[10px] uppercase text-white/50">
                      {alert.source === "volunteer" ? "text match" : "priority"}
                    </span>
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    Incident: {alert.incident_id || "pending"}
                  </div>
                  {Number.isFinite(alert.distance_m) && (
                    <div className="text-xs text-white/60 mt-1">
                      Distance: {Math.round(alert.distance_m)} m
                    </div>
                  )}
                  {Array.isArray(alert.hazards) && alert.hazards.length > 0 && (
                    <div className="text-xs text-white/60 mt-1">
                      Hazards: {alert.hazards.join(", ")}
                    </div>
                  )}
                  {alert.safe_instructions && (
                    <div className="text-xs text-white/60 mt-2">{alert.safe_instructions}</div>
                  )}
                  <button className={`mt-3 w-full px-3 py-2 rounded-lg ${accentStyles.cta} font-semibold`}>
                    {role === "official" ? "Take Command" : "Respond"}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-xs text-white/50 mt-3">
              Save your location above to see matching volunteer alerts.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
