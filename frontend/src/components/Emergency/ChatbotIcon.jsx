import React from "react";

export default function ChatbotIcon({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-5 right-5 z-50 rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center justify-center font-bold"
      aria-label="Open Chatbot"
      title="Chatbot"
    >
      AI
    </button>
  );
}