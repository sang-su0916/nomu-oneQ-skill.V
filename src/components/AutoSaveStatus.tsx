"use client";

interface AutoSaveStatusProps {
  lastSavedAt?: number | null;
}

export default function AutoSaveStatus({ lastSavedAt }: AutoSaveStatusProps) {
  if (!lastSavedAt) return null;

  const timeStr = new Date(lastSavedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1">
      <svg
        className="w-3.5 h-3.5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>자동 저장됨 {timeStr}</span>
    </div>
  );
}
