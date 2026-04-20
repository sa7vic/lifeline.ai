import React, { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { ensureGuestId, getSession } from "../../lib/session";

const MIN_UPDATE_MS = 5000;

export default function LocationTracker() {
  const [session, setSessionState] = useState(() => getSession());
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    function sync() {
      setSessionState(getSession());
    }

    window.addEventListener("lifeline_session_changed", sync);
    return () => window.removeEventListener("lifeline_session_changed", sync);
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    if (typeof window === "undefined" || !navigator.geolocation) return undefined;

    let active = true;
    let watchId = null;
    let workingSession = ensureGuestId(session) || session;
    if (workingSession !== session) setSessionState(workingSession);

    const token = workingSession.mode === "user" ? workingSession.token : null;
    const guest_id = workingSession.mode === "guest" ? workingSession.guest_id : null;

    function onPosition(pos) {
      if (!active) return;
      const now = Date.now();
      if (now - lastSentRef.current < MIN_UPDATE_MS) return;
      lastSentRef.current = now;

      const c = pos.coords;
      api.updateLocation(
        {
          lat: c.latitude,
          lon: c.longitude,
          accuracy_m: c.accuracy,
          heading_deg: c.heading,
          speed_mps: c.speed,
          altitude_m: c.altitude,
          client_ts: pos.timestamp,
          guest_id,
          source: "watchPosition"
        },
        token
      ).catch(() => {});
    }

    function onError() {
      // No-op: location permissions or errors should not block the UI.
    }

    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    });

    return () => {
      active = false;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [session]);

  return null;
}
