"use client";

import { useEffect, useState } from "react";

interface SuccessAnimationProps {
  show: boolean;
  onDone?: () => void;
  message?: string;
}

export default function SuccessAnimation({
  show,
  onDone,
  message = "저장 완료!",
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Vibration API (mobile)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
      const timer = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="bg-[var(--text)]/90 text-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 animate-success-pop shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-white animate-success-check"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span className="text-base font-semibold">{message}</span>
      </div>
    </div>
  );
}
