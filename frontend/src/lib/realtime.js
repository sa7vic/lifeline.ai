import { io } from "socket.io-client";
import { ensureGuestId, getSession } from "./session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

let socket = null;
let sessionListenerAttached = false;

export function initRealtime() {
  if (socket) return socket;

  socket = io(API_BASE, {
    transports: ["websocket"],
  });

  function register() {
    const rawSession = getSession();
    const session = ensureGuestId(rawSession) || rawSession;
    const payload = {};

    if (session?.mode === "user" && session.token) payload.token = session.token;
    if (session?.mode === "guest" && session.guest_id)
      payload.guest_id = session.guest_id;

    if (Object.keys(payload).length) socket.emit("register", payload);
  }

  socket.on("connect", register);

  if (typeof window !== "undefined" && !sessionListenerAttached) {
    window.addEventListener("lifeline_session_changed", register);
    sessionListenerAttached = true;
  }

  return socket;
}
