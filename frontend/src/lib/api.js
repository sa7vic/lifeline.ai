import { getApiLocale } from "../i18n";

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000";

class ApiError extends Error {
  constructor(message, code = "request_failed", status = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function withLocale(headers = {}) {
  return {
    ...headers,
    "Accept-Language": getApiLocale(),
  };
}

async function jsonFetch(path, { method = "GET", body, token } = {}) {
  const headers = withLocale({ "Content-Type": "application/json" });
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error || "Request failed", data.error_code || "request_failed", res.status);
  }
  return data;
}

export function toUserMessage(error, t, fallbackKey = "errors.generic") {
  const code = error?.code;
  if (code && t) {
    const key = `errors.codes.${code}`;
    const mapped = t(key);
    if (mapped !== key) return mapped;
  }

  if (error?.message) return error.message;
  return t ? t(fallbackKey) : "Request failed";
}

function toQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return qs.toString();
}

export const api = {
  signup: (payload) =>
    jsonFetch("/api/auth/signup", { method: "POST", body: payload }),

  login: (payload) =>
    jsonFetch("/api/auth/login", { method: "POST", body: payload }),

  me: (token) => jsonFetch("/api/auth/me", { token }),

  createIncident: async (file, session) => {
    const fd = new FormData();
    fd.append("video", file);

    const headers = withLocale();
    if (session?.mode === "user" && session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }

    if (session?.mode === "guest" && session.guest_id) {
      fd.append("guest_id", session.guest_id);
    }

    const res = await fetch(`${API_BASE}/api/incidents`, {
      method: "POST",
      body: fd,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(data.error || "upload failed", data.error_code || "video_required", res.status);
    }
    return data;
  },

  saveQuestionnaire: (incidentId, payload) =>
    jsonFetch(`/api/incidents/${incidentId}/questionnaire`, {
      method: "POST",
      body: payload,
    }),

  analyzeIncident: (incidentId) =>
    jsonFetch(`/api/incidents/${incidentId}/analyze`, { method: "POST" }),

  chatIncident: (incidentId, message, locale = getApiLocale()) =>
    jsonFetch(`/api/incidents/${incidentId}/chat`, {
      method: "POST",
      body: { message, locale },
    }),

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
  },
};
