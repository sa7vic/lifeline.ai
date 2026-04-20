import React from "react";

export default function StepList({ steps, activeStep, onSelect }) {
  return (
    <div className="grid gap-2">
      {(steps || []).map((s) => (
        <button
          key={s.n}
          onClick={() => onSelect(s.n)}
          className={`text-left p-3 rounded border ${
            activeStep === s.n ? "bg-white text-black border-white" : "bg-black/30 border-white/10 text-white"
          }`}
        >
          <div className="font-semibold">Step {s.n}: {s.title}</div>
          <div className={`text-sm mt-1 ${activeStep === s.n ? "text-black/80" : "text-white/70"}`}>
            {s.details}
          </div>
        </button>
      ))}
    </div>
  );
}