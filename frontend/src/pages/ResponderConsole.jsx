import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, toUserMessage } from "../lib/api";
import { getSession } from "../lib/session";
import { initRealtime } from "../lib/realtime";
import { useLocaleFormat } from "../i18n/format";

const hazardOptions = ["traffic", "fire", "none", "other"];

function normalizeLocation(value) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeGender(raw) {
  const value = (raw || "other").toLowerCase();
  return value === "male" || value === "female" ? value : "other";
}

function toSeverityKey(level) {
  if (!level) return "unknown";
  const normalized = String(level).toLowerCase();
  if (["critical", "high", "moderate", "low"].includes(normalized)) return normalized;
  return "unknown";
}

export default function ResponderConsole() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { formatDateTime, formatNumber } = useLocaleFormat();

  const [session, setSession] = useState(() => getSession());
  const [active, setActive] = useState(true);
  const [locationText, setLocationText] = useState("");
  const [saveState, setSaveState] = useState({ busy: false, ok: "", err: "" });

  const [scopeFilter, setScopeFilter] = useState("my");
  const [severityFilter, setSeverityFilter] = useState("high_critical");
  const [hazardFilter, setHazardFilter] = useState("");

  const socket = useMemo(() => initRealtime(), []);
  const [alerts, setAlerts] = useState({});

  const role = session?.role || session?.user?.profile?.role || session?.user?.role || "patient";
  const isResponder = role === "official" || role === "volunteer";
  const title = role === "official" ? t("responder.titleOfficial") : t("responder.titleVolunteer");
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

  const profileName = session?.user?.profile?.name || t("responder.defaultName");
  const greeting = t("responder.profileGreeting", {
    context: normalizeGender(session?.user?.profile?.gender),
    name: profileName,
  });

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
      if (!session?.token) throw new Error(t("responder.loginToSaveLocation"));
      if (role !== "volunteer") throw new Error(t("responder.volunteerOnlyError"));

      const loc = (locationText || "").trim();
      if (!loc) throw new Error(t("responder.locationTextRequiredError"));

      await api.volunteerOptIn(session.token, { active, location_text: loc });
      setSaveState({ busy: false, ok: t("responder.saveLocationSuccess"), err: "" });
    } catch (e) {
      setSaveState({ busy: false, ok: "", err: toUserMessage(e, t) });
    }
  }

  if (!isResponder) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">{t("responder.restrictedTitle")}</div>
          <div className="text-sm text-white/70 mt-2">{t("responder.restrictedBody")}</div>
          <button className="mt-4 px-4 py-2 rounded-lg bg-white text-black" onClick={() => nav("/")}>
            {t("responder.returnToAccess")}
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
            <div className="text-xs uppercase tracking-[0.35em] text-white/50">{t("responder.sectionLabel")}</div>
            <h2 className="text-3xl md:text-4xl">{title}</h2>
            <p className="text-sm text-white/70 mt-1">{t("responder.subtitle")}</p>
            <p className="text-xs text-white/50 mt-2">{greeting}</p>
          </div>
          <div className="text-xs text-white/50">{t("responder.refreshHint")}</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{t("responder.statusTitle")}</div>
                  <div className="text-xs text-white/60">
                    {role === "official" ? t("responder.statusHintOfficial") : t("responder.statusHintVolunteer")}
                  </div>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                    active ? accentStyles.toggle : "border-white/20 text-white/70"
                  }`}
                  onClick={() => setActive((prev) => !prev)}
                >
                  {active ? t("common.on") : t("common.off")}
                </button>
              </div>

              <div className="mt-4 text-xs text-white/50">
                {role === "official" ? t("responder.gpsHintOfficial") : t("responder.gpsHintVolunteer")}
              </div>

              <div className="mt-4">
                <div className="text-xs text-white/60 mb-2">{t("responder.myLocation")}</div>
                <input
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                  placeholder={t("responder.locationPlaceholder")}
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
                {saveState.busy ? t("responder.saveLocationBusy") : t("responder.saveLocation")}
              </button>
              {saveState.ok && <div className="text-xs text-emerald-200 mt-2">{saveState.ok}</div>}
              {saveState.err && <div className="text-xs text-red-300 mt-2">{saveState.err}</div>}
              <div className="text-xs text-white/50 mt-3">{session?.token ? "" : t("responder.loginToSaveLocation")}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold">{t("responder.safetyTitle")}</div>
              <div className="text-xs text-white/70 mt-2">{t("responder.safetyText")}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{t("responder.realtimeTitle")}</div>
                <div className="text-xs text-white/60">{t("responder.realtimeHint")}</div>
                <div className="text-xs text-white/50 mt-1">{t("responder.alertCount", { count: filteredAlerts.length })}</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border ${accentStyles.badge}`}>
                {role === "official" ? t("responder.badgePriority") : t("responder.badgeSupport")}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(scopeFilter === "my", "white")}`}
                  onClick={() => setScopeFilter("my")}
                >
                  {t("responder.scopeMy")}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(scopeFilter === "all", "white")}`}
                  onClick={() => setScopeFilter("all")}
                >
                  {t("responder.scopeAll")}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "high_critical", "accent")}`}
                  onClick={() => setSeverityFilter("high_critical")}
                >
                  {t("responder.severityHighCritical")}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "critical", "accent")}`}
                  onClick={() => setSeverityFilter("critical")}
                >
                  {t("responder.severityCriticalOnly")}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "high", "accent")}`}
                  onClick={() => setSeverityFilter("high")}
                >
                  {t("responder.severityHighOnly")}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg text-xs ${chipClass(severityFilter === "all", "accent")}`}
                  onClick={() => setSeverityFilter("all")}
                >
                  {t("responder.severityAll")}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {hazardOptions.map((h) => (
                  <button
                    key={h}
                    className={`px-3 py-2 rounded-lg text-xs ${chipClass(hazardFilter === h, "white")}`}
                    onClick={() => setHazardFilter((prev) => (prev === h ? "" : h))}
                  >
                    {t(`hazards.${h}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredAlerts.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
                  {t("responder.noAlerts")}
                </div>
              )}

              {filteredAlerts.map((alert) => (
                <div key={alert.alert_id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {t("responder.severityIncident", {
                        severity: t(`severity.${toSeverityKey(alert.severity || "unknown")}`),
                      })}
                    </div>
                    <span className="text-[10px] uppercase text-white/50">
                      {alert.source === "volunteer" ? t("responder.sourceTextMatch") : t("responder.sourcePriority")}
                    </span>
                  </div>
                  <div className="text-xs text-white/70 mt-1">
                    {t("common.incidentLabel", { incidentId: alert.incident_id || t("responder.incidentPending") })}
                  </div>
                  {Number.isFinite(alert.distance_m) && (
                    <div className="text-xs text-white/60 mt-1">
                      {t("common.distanceMeters", { distance: formatNumber(Math.round(alert.distance_m)) })}
                    </div>
                  )}
                  {Array.isArray(alert.hazards) && alert.hazards.length > 0 && (
                    <div className="text-xs text-white/60 mt-1">
                      {t("questionnaire.hazards")}: {alert.hazards.map((h) => t(`hazards.${h}`)).join(", ")}
                    </div>
                  )}
                  {alert.received_at && (
                    <div className="text-xs text-white/50 mt-1">
                      {t("common.updatedAt", { time: formatDateTime(alert.received_at) })}
                    </div>
                  )}
                  {alert.safe_instructions && (
                    <div className="text-xs text-white/60 mt-2">{alert.safe_instructions}</div>
                  )}
                  <button className={`mt-3 w-full px-3 py-2 rounded-lg ${accentStyles.cta} font-semibold`}>
                    {role === "official" ? t("responder.takeCommand") : t("responder.respond")}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-xs text-white/50 mt-3">{t("responder.saveHint")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
