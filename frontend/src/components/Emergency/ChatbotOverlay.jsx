import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, toUserMessage } from "../../lib/api";

export default function ChatbotOverlay({ open, onClose, incidentId, onSteps }) {
  const { t } = useTranslation();

  const [message, setMessage] = useState("");
  const [history, setHistory] = useState(() => [
    { role: "assistant", text: t("chatbot.defaultAssistant") },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [open, history.length]);

  useEffect(() => {
    setHistory((prev) => {
      if (prev.length !== 1 || prev[0].role !== "assistant") return prev;
      return [{ role: "assistant", text: t("chatbot.defaultAssistant") }];
    });
  }, [t]);

  if (!open) return null;

  async function send() {
    const text = message.trim();
    if (!text) return;
    setHistory((h) => [...h, { role: "user", text }]);
    setMessage("");

    try {
      if (!incidentId) {
        setHistory((h) => [...h, { role: "assistant", text: t("chatbot.contextRequired") }]);
        return;
      }

      const data = await api.chatIncident(incidentId, text);
      setHistory((h) => [...h, { role: "assistant", text: data.reply || "" }]);

      if (Array.isArray(data.steps) && data.steps.length) {
        onSteps?.(data.steps, data.recommended_step || 1);
      }
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: "assistant", text: t("chatbot.fallbackError", { reason: toUserMessage(e, t) }) },
      ]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
      <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{t("chatbot.title")}</div>
          <button className="px-3 py-2 rounded border border-white/20" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        <div className="mt-3 h-80 overflow-y-auto border border-white/10 rounded p-3 bg-black/30">
          {history.map((m, i) => (
            <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : "text-left"}`}>
              <div
                className={`inline-block px-3 py-2 rounded-lg max-w-[90%] whitespace-pre-wrap text-sm ${
                  m.role === "user" ? "bg-blue-600" : "bg-white/10"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded bg-black/30 border border-white/10"
            placeholder={t("chatbot.placeholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          />
          <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500" onClick={send}>
            {t("common.send")}
          </button>
        </div>

        <div className="mt-2 text-xs text-white/60">{t("chatbot.safety")}</div>
      </div>
    </div>
  );
}
