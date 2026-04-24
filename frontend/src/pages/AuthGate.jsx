import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, toUserMessage } from "../lib/api";
import { setSession } from "../lib/session";
import { changeLanguage } from "../i18n";

export default function AuthGate() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();

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
  const [gender, setGender] = useState("other");

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
            gender,
            locale: (i18n.resolvedLanguage || i18n.language || "en").split("-")[0],
            role: accountType,
          },
        });
        nextRole = data?.user?.profile?.role || data?.user?.role || accountType;
        setSession({ mode: "user", token: data.token, user: data.user, role: nextRole });
        if (data?.user?.profile?.locale) {
          changeLanguage(data.user.profile.locale);
        }
      } else {
        const data = await api.login({ email, password });
        nextRole = data?.user?.profile?.role || data?.user?.role || accountType;
        setSession({ mode: "user", token: data.token, user: data.user, role: nextRole });
        if (data?.user?.profile?.locale) {
          changeLanguage(data.user.profile.locale);
        }
      }

      const nextPath = nextRole === "official" || nextRole === "volunteer" ? "/responder" : "/emergency";
      nav(nextPath);
    } catch (e) {
      setErr(toUserMessage(e, t));
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
          "radial-gradient(1200px 800px at 10% -10%, rgba(239,58,45,0.25), transparent 60%), radial-gradient(900px 700px at 90% 10%, rgba(245,158,11,0.2), transparent 60%), linear-gradient(180deg, #050505 0%, #0b0c10 50%, #0f1623 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">{t("auth.heroTag")}</p>
            <h1 className="text-4xl md:text-5xl">{t("auth.heroTitle")}</h1>
            <p className="text-white/70 max-w-xl">{t("auth.heroSubtitle")}</p>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-600/10 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{t("auth.patientSosTitle")}</div>
                <div className="text-sm text-white/70">{t("auth.patientSosSubtitle")}</div>
              </div>
              <span className="rounded-full border border-red-300/30 px-3 py-1 text-xs text-red-200">
                {t("auth.fastPath")}
              </span>
            </div>
            <button
              className="mt-4 w-full px-4 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-lg font-semibold"
              onClick={guest}
            >
              {t("auth.sendSosNow")}
            </button>
            <div className="mt-3 text-xs text-white/60">{t("auth.emergencyHint")}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs text-white/60">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">{t("auth.featurePriority")}</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">{t("auth.featureVolunteer")}</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">{t("auth.featureRealtime")}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{t("auth.responderAccessTitle")}</div>
              <div className="text-xs text-white/60">{t("auth.responderAccessSubtitle")}</div>
            </div>
            <span className="text-xs text-white/50">{t("auth.prioritySupport")}</span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className={`px-3 py-2 rounded-lg ${mode === "login" ? "bg-white text-black" : "border border-white/20"}`}
              onClick={() => setMode("login")}
            >
              {t("auth.signIn")}
            </button>
            <button
              className={`px-3 py-2 rounded-lg ${mode === "signup" ? "bg-white text-black" : "border border-white/20"}`}
              onClick={() => setMode("signup")}
            >
              {t("auth.register")}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="text-xs text-white/60 mb-2">{t("auth.selectAccountType")}</div>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  accountType === "official" ? "bg-amber-400 text-black" : "border border-white/20"
                }`}
                onClick={() => setAccountType("official")}
              >
                {t("auth.accountOfficial")}
              </button>
              <button
                className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                  accountType === "volunteer" ? "bg-emerald-500 text-black" : "border border-white/20"
                }`}
                onClick={() => setAccountType("volunteer")}
              >
                {t("auth.accountVolunteer")}
              </button>
            </div>
            <div className="mt-2 text-xs text-white/60">
              {accountType === "official" ? t("auth.accountOfficialHint") : t("auth.accountVolunteerHint")}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {mode === "signup" && (
              <>
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder={t("auth.fullNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder={t("auth.phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder={t("auth.organizationPlaceholder")}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder={t("auth.badgePlaceholder")}
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                />
                <input
                  className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                  placeholder={t("auth.baseLocationPlaceholder")}
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                />

                <div className="grid gap-1">
                  <div className="text-xs text-white/60">{t("auth.genderLabel")}</div>
                  <select
                    className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="male">{t("auth.genderMale")}</option>
                    <option value="female">{t("auth.genderFemale")}</option>
                    <option value="other">{t("auth.genderOther")}</option>
                  </select>
                </div>
              </>
            )}

            <input
              className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
              placeholder={t("auth.passwordPlaceholder")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="px-3 py-3 rounded-lg bg-white text-black font-semibold" onClick={submit}>
              {mode === "signup" ? t("auth.createAccount") : t("auth.accessConsole")}
            </button>

            {err && <div className="text-sm text-red-300">{err}</div>}
          </div>

          <div className="mt-4 text-xs text-white/60">{t("auth.safetyHint")}</div>
        </div>
      </div>
    </div>
  );
}
