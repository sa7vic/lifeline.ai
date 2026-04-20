const KEY = "lifeline_session";

function makeGuestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `gst_${crypto.randomUUID()}`;
  }
  return `gst_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (!session) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(session));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("lifeline_session_changed"));
  }
}

export function ensureGuestId(session) {
  if (!session || session.mode !== "guest") return session;
  if (session.guest_id) return session;

  const next = { ...session, guest_id: makeGuestId() };
  setSession(next);
  return next;
}