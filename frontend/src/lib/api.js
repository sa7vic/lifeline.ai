const API_BASE = "http://localhost:5000";

async function jsonFetch(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return qs.toString();
}

export const api = {
  signup: (payload) => jsonFetch("/api/auth/signup", { method: "POST", body: payload }),
  login: (payload) => jsonFetch("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => jsonFetch("/api/auth/me", { token }),

  createIncident: async (file, session) => {
    const fd = new FormData();
    fd.append("video", file);
    const headers = {};
    if (session?.mode === "user" && session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
    if (session?.mode === "guest" && session.guest_id) {
      fd.append("guest_id", session.guest_id);
    }

    const res = await fetch(`${API_BASE}/api/incidents`, { method: "POST", body: fd, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "upload failed");
    return data;
  },

  saveQuestionnaire: (incidentId, payload) =>
    jsonFetch(`/api/incidents/${incidentId}/questionnaire`, { method: "POST", body: payload }),

  analyzeIncident: (incidentId) =>
    jsonFetch(`/api/incidents/${incidentId}/analyze`, { method: "POST" }),

  chatIncident: (incidentId, message) =>
    jsonFetch(`/api/incidents/${incidentId}/chat`, { method: "POST", body: { message } }),

  volunteerOptIn: (token, payload) =>
    jsonFetch(`/api/volunteers/opt-in`, { method: "POST", body: payload, token }),

  updateLocation: (payload, token) =>
    jsonFetch("/api/locations/update", { method: "POST", body: payload, token }),

  getMyLocation: (token, guest_id) => {
    const qs = toQuery({ guest_id });
    return jsonFetch(`/api/locations/me${qs ? `?${qs}` : ""}`, { token });
  },

  nearbyLocations: (params, token) => {
    const qs = toQuery(params);
    return jsonFetch(`/api/locations/nearby${qs ? `?${qs}` : ""}`, { token });
  }
};