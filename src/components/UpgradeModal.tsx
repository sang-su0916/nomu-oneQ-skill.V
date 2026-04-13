"use client";

import { useEffect } from "react";
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  title = "안내",
  message = "이 기능은 현재 준비 중입니다.",
}: UpgradeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--border)]">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text)] text-xl"
        >
          ✕
        </button>

        <div className="text-center">
          <div className="text-4xl mb-4">ℹ️</div>
          <h3
            id="upgrade-modal-title"
            className="text-xl font-bold text-[var(--text)] mb-2"
          >
            {title}
          </h3>
          <p className="text-[var(--text-muted)] text-sm mb-6">{message}</p>

          <div className="space-y-3">
            <button
              onClick={onClose}
              className="block w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
