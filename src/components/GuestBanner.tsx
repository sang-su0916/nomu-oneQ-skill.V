"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function GuestBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true); // 초기엔 숨김, hydration 후 판단

  useEffect(() => {
    if (!user) {
      const wasDismissed = sessionStorage.getItem(
        "nomu_guest_banner_dismissed",
      );
      setDismissed(wasDismissed === "true");
    }
  }, [user]);

  if (user || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("nomu_guest_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <span>💾</span>
          <span>
            <strong>로그인이 필요합니다</strong> —{" "}
            <a
              href="https://lbiz-partners.com/members"
              className="underline font-medium hover:text-amber-900"
            >
              엘비즈파트너스 홈페이지
            </a>
            에서 로그인 후 이용해주세요.
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 shrink-0 text-lg leading-none"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
    </div>
  );
}
