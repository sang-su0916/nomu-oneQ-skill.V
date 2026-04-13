"use client";

import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  simple: string;
  legal?: string;
}

export default function InfoTooltip({ simple, legal }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span
      className="relative inline-flex items-center"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--border)] text-[var(--text-muted)] text-[11px] font-bold hover:bg-[var(--primary)] hover:text-white transition-colors ml-1 shrink-0 before:absolute before:inset-[-10px] before:content-['']"
        aria-label="도움말"
      >
        i
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg text-left animate-fade-in">
          <p className="text-sm text-[var(--text)] leading-relaxed">{simple}</p>
          {legal && (
            <p className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)]">
              {legal}
            </p>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[var(--bg-card)] border-r border-b border-[var(--border)] rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}
