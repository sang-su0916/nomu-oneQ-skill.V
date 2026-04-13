"use client";

import { useState, useEffect } from "react";

interface HelpGuideProps {
  pageKey: string;
  steps: string[];
}

export default function HelpGuide({ pageKey, steps }: HelpGuideProps) {
  const storageKey = `help-guide-seen-${pageKey}`;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setIsOpen(true);
      localStorage.setItem(storageKey, "true");
    }
  }, [storageKey]);

  return (
    <div className="no-print mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        style={{
          color: isOpen ? "#ffffff" : "#64748b",
          backgroundColor: isOpen ? "#3b82f6" : "transparent",
          border: "1px solid",
          borderColor: isOpen ? "#3b82f6" : "#e2e8f0",
        }}
      >
        <span>{isOpen ? "✕" : "?"}</span>
        사용법
      </button>

      {isOpen && (
        <div
          className="mt-2 rounded-xl px-5 py-4 text-sm leading-relaxed"
          style={{
            backgroundColor: "#f0f4ff",
            border: "1px solid #3b82f6",
            color: "#1e293b",
          }}
        >
          <ol className="space-y-1.5 list-none p-0 m-0">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
