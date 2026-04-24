const LOCALE_TO_SPEECH_LANG = {
  en: "en-IN",
  hi: "hi-IN",
  ar: "ar-SA",
};

function toBaseLocale(locale) {
  if (!locale || typeof locale !== "string") return "en";
  return locale.trim().replace("_", "-").toLowerCase().split("-")[0];
}

export function getSpeechLang(locale) {
  const base = toBaseLocale(locale);
  return LOCALE_TO_SPEECH_LANG[base] || LOCALE_TO_SPEECH_LANG.en;
}

function findBestVoice(voices, languageTag) {
  if (!Array.isArray(voices) || !voices.length) return null;

  const lang = String(languageTag || "").toLowerCase();
  const base = lang.split("-")[0];

  return (
    voices.find((v) => String(v.lang || "").toLowerCase() === lang) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(`${base}-`)) ||
    voices.find((v) => String(v.lang || "").toLowerCase() === base) ||
    null
  );
}

export function stopSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

export function warmSpeechVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}

export function speakText(text, { locale, rate = 1.0, pitch = 1.0, volume = 1.0 } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

  const finalText = String(text || "").trim();
  if (!finalText) return false;

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(finalText);
  const languageTag = getSpeechLang(locale);

  utterance.lang = languageTag;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  const voices = synthesis.getVoices();
  const voice = findBestVoice(voices, languageTag);
  if (voice) utterance.voice = voice;

  synthesis.cancel();
  synthesis.speak(utterance);
  return true;
}
