"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LandingRedirect() {
  const { user, company, loading } = useAuth();
  const router = useRouter();
  const [hashRedirecting, setHashRedirecting] = useState(false);

  // 해시 토큰 감지 시 로그인 페이지로 즉시 전달 (안전장치)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      setHashRedirecting(true);
      // AuthContext가 해시 토큰을 처리하므로 대기
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && company) router.push("/dashboard");
    else if (user && !company) router.push("/onboarding");
  }, [user, company, loading, router]);

  if (loading || user || hashRedirecting)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">
            {loading || hashRedirecting ? "노무원큐 로딩 중..." : "이동 중..."}
          </p>
        </div>
      </div>
    );

  return null;
}
