import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initRealtime } from "../../lib/realtime";
import { api } from "../../lib/api";
import { getSession } from "../../lib/session";
import { useLocaleFormat } from "../../i18n/format";

function toSeverityKey(level) {
  if (!level) return "unknown";
  const normalized = String(level).toLowerCase();
  if (["critical", "high", "moderate", "low"].includes(normalized)) return normalized;
  return "unknown";
}

export default function NotificationCenter() {
  const { t } = useTranslation();
  const { formatDateTime, formatNumber, isRtl } = useLocaleFormat();

  const [alerts, setAlerts] = useState({});
  const [dismissed, setDismissed] = useState({});
  const dismissedRef = useRef({});
  const [session, setSession] = useState(() => getSession());
  const socket = useMemo(() => initRealtime(), []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    function sync() {
      setSession(getSession());
    }
    window.addEventListener("lifeline_session_changed", sync);
    return () => window.removeEventListener("lifeline_session_changed", sync);
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    function onEnter(payload) {
      if (dismissedRef.current[payload.alert_id]) return;
      setAlerts((prev) => ({ ...prev, [payload.alert_id]: payload }));
    }

    function onUpdate(payload) {
      if (dismissedRef.current[payload.alert_id]) return;
      setAlerts((prev) => ({ ...prev, [payload.alert_id]: { ...prev[payload.alert_id], ...payload } }));
    }

    function onExit(payload) {
      setAlerts((prev) => {
        const next = { ...prev };
        delete next[payload.alert_id];
        return next;
      });
      setDismissed((prev) => {
        if (!prev[payload.alert_id]) return prev;
        const next = { ...prev };
        delete next[payload.alert_id];
        dismissedRef.current = next;
        return next;
      });
    }

    socket.on("serious_alert", onEnter);
    socket.on("serious_alert_update", onUpdate);
    socket.on("serious_alert_exit", onExit);

    return () => {
      socket.off("serious_alert", onEnter);
      socket.off("serious_alert_update", onUpdate);
      socket.off("serious_alert_exit", onExit);
    };
  }, [socket]);

  const list = Object.values(alerts);
  const role = session?.role || session?.user?.role || "";
  const isResponder = role === "official" || role === "volunteer";
  if (!isResponder || !list.length) return null;

  const responderLabel = role === "official" ? t("notifications.responderPrimary") : t("notifications.responderSupport");
  const actionLabel = role === "official" ? t("notifications.actionOfficial") : t("notifications.actionVolunteer");

  function openTrace(alert) {
    const destLat = alert?.uploader_location?.lat;
    const destLon = alert?.uploader_location?.lon;
    if (!Number.isFinite(destLat) || !Number.isFinite(destLon)) return;

    const destination = `${destLat},${destLon}`;
    const base = new URL("https://www.google.com/maps/dir/");
    base.searchParams.set("api", "1");
    base.searchParams.set("destination", destination);
    base.searchParams.set("travelmode", "driving");

    const win = window.open("", "_blank");
    if (win) win.opener = null;
    const openUrl = (url) => {
      if (win && !win.closed) {
        win.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    };

    const currentSession = getSession();
    const token = currentSession?.token || null;

    async function resolveOrigin() {
      if (token) {
        try {
          const me = await api.getMyLocation(token);
          const loc = me?.location;
          if (Number.isFinite(loc?.lat) && Number.isFinite(loc?.lon)) {
            base.searchParams.set("origin", `${loc.lat},${loc.lon}`);
            openUrl(base.toString());
            return;
          }
        } catch {
          // Fall through to browser geolocation.
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
            base.searchParams.set("origin", origin);
            openUrl(base.toString());
          },
          () => openUrl(base.toString()),
          { enableHighAccuracy: true, timeout: 8000 }
        );
        return;
      }

      openUrl(base.toString());
    }
    resolveOrigin();
  }

  function dismissAlert(alertId) {
    setAlerts((prev) => {
      const next = { ...prev };
      delete next[alertId];
      return next;
    });
    setDismissed((prev) => {
      const next = { ...prev, [alertId]: true };
      dismissedRef.current = next;
      return next;
    });
  }

  return (
    <div className={`fixed top-4 z-50 w-full max-w-xs space-y-2 ${isRtl ? "left-4" : "right-4"}`}>
      {list.map((a) => (
        <div key={a.alert_id} className="rounded-xl border border-red-500/40 bg-red-600/15 text-white p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-red-200">{t("notifications.nearbyEmergency")}</div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-1 rounded-full border ${
                  role === "official" ? "border-amber-300/40 text-amber-200" : "border-emerald-300/40 text-emerald-200"
                }`}
              >
                {responderLabel}
              </span>
              <button
                type="button"
                className="w-6 h-6 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40"
                onClick={() => dismissAlert(a.alert_id)}
                aria-label={t("notifications.dismiss")}
                title={t("notifications.dismiss")}
              >
                x
              </button>
            </div>
          </div>
          <div className="font-semibold">
            {t("notifications.severityIncident", {
              severity: t(`severity.${toSeverityKey(a.severity || "unknown")}`),
            })}
          </div>
          <div className="text-sm text-white/80 mt-1">
            {t("common.distanceMeters", {
              distance: Number.isFinite(a.distance_m) ? formatNumber(Math.round(a.distance_m)) : "?",
            })}
          </div>
          {a.incident_id && <div className="text-xs text-white/60 mt-1">{t("common.incidentLabel", { incidentId: a.incident_id })}</div>}
          {a.updated_at && (
            <div className="text-xs text-white/60 mt-1">
              {t("common.updatedAt", { time: formatDateTime(a.updated_at) })}
            </div>
          )}
          <button
            className="mt-2 w-full px-3 py-2 rounded bg-red-600 hover:bg-red-500 font-semibold disabled:opacity-50"
            onClick={() => openTrace(a)}
            disabled={!Number.isFinite(a?.uploader_location?.lat) || !Number.isFinite(a?.uploader_location?.lon)}
          >
            {actionLabel}
          </button>
        </div>
      ))}
    </div>
  );
}
