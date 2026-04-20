import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setSession } from "../lib/session";

export default function AuthGate() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState("");

  const [accountType, setAccountType] = useState("official");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup extras
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationText, setLocationText] = useState("");
  const [organization, setOrganization] = useState("");
  const [badgeId, setBadgeId] = useState("");

  async function submit() {
    setErr("");
    try {
      let nextRole = accountType;
      if (mode === "signup") {
        const data = await api.signup({
          email,
          password,
          profile: {
            name,
            phone,
            locationText,
            organization,
            badge_id: badgeId,
            role: accountType
          }
        });
        nextRole = data?.user?.role || accountType;
        setSession({ mode: "user", token: data.token, user: data.user, role: nextRole });
      } else {
        const data = await api.login({ email, password });
        nextRole = data?.user?.role || accountType;
        setSession({ mode: "user", token: data.token, user: data.user, role: nextRole });
      }
      const nextPath = nextRole === "official" || nextRole === "volunteer" ? "/responder" : "/emergency";
      nav(nextPath);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  function guest() {
    setSession({ mode: "guest", role: "patient" });
    nav("/emergency");
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage:
          "radial-gradient(1200px 800px at 10% -10%, rgba(239,58,45,0.25), transparent 60%), radial-gradient(900px 700px at 90% 10%, rgba(245,158,11,0.2), transparent 60%), linear-gradient(180deg, #050505 0%, #0b0c10 50%, #0f1623 100%)"
      }}
    >
      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">LifeLine AI</p>
            <h1 className="text-4xl md:text-5xl">Instant emergency response without friction.</h1>
            <p className="text-white/70 max-w-xl">
              Patients can send an SOS in seconds. Health Officials get priority visibility, and Volunteers can support
              nearby incidents in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-600/10 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Patient SOS</div>
                <div className="text-sm text-white/70">No account. One tap. Immediate alerting.</div>
              </div>
              <span className="rounded-full border border-red-300/30 px-3 py-1 text-xs text-red-200">
                Fast path
              </span>
            </div>
            <button
              className="mt-4 w-full px-4 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-lg font-semibold"
              onClick={guest}
            >
              Send SOS now
            </button>
            <div className="mt-3 text-xs text-white/60">If life-threatening, call 112 immediately.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs text-white/60">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">Primary responders see alerts first.</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">Volunteers can opt in to support.</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">Real-time updates and chat guidance.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Responder Access</div>
              <div className="text-xs text-white/60">Register as a Health Official or Volunteer.</div>
            </div>
            <span className="text-xs text-white/50">Priority + Support</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className={`px-3 py-2 rounded-lg ${mode === "login" ? "bg-white text-black" : "border border-white/20"}`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${mode === "signup" ? "bg-white text-black" : "border border-white/20"}`}
              onClick={() => setMode("signup")}
            >
              Register
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs text-white/60 mb-2">Select account type</div>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  accountType === "official" ? "bg-amber-400 text-black" : "border border-white/20"
                }`}
                onClick={() => setAccountType("official")}
              >
                Health Official
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  accountType === "volunteer" ? "bg-emerald-500 text-black" : "border border-white/20"
                }`}
                onClick={() => setAccountType("volunteer")}
              >
                Volunteer
              </button>
            </div>
            <div className="mt-2 text-xs text-white/60">
              {accountType === "official"
                ? "Primary responder: priority visibility and response controls."
                : "Support responder: assist nearby incidents when available."}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {mode === "signup" && (
              <>
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder="Organization / Unit"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder="Badge or ID (optional)"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder="Base location (city/zone)"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />
              </>
            )}

            <input
              className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="px-3 py-3 rounded-lg bg-white text-black font-semibold" onClick={submit}>
              {mode === "signup" ? "Create responder account" : "Access responder console"}
            </button>

            {err && <div className="text-sm text-red-300">{err}</div>}
          </div>

          <div className="mt-4 text-xs text-white/60">
            Safety: Sensitive response data is visible only to verified responders.
          </div>
        </div>
      </div>
    </div>
  );
}