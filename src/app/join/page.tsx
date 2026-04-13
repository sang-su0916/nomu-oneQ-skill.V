"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function JoinPage() {
  const { user, refreshAuth, loading: authLoading } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ type: "error", text: data.error });
      } else {
        setResult({
          type: "success",
          text: `${data.companyName}에 ${data.role === "manager" ? "담당자" : "열람자"}로 합류했습니다!`,
        });
        setCode("");
        await refreshAuth();
      }
    } catch {
      setResult({ type: "error", text: "오류가 발생했습니다." });
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] max-w-sm w-full text-center">
          <div className="text-3xl mb-3">🔗</div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-2">
            사업장 초대
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            초대를 수락하려면 먼저 로그인해주세요.
          </p>
          <Link
            href="/login?redirect=/join"
            className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-[var(--bg-card)] rounded-2xl p-8 border border-[var(--border)] max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🤝</div>
          <h1 className="text-xl font-bold text-[var(--text)]">사업장 합류</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            관리자에게 받은 초대 코드를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 12자리"
            maxLength={12}
            className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest border border-[var(--border)] rounded-lg bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] mb-3"
          />
          <button
            type="submit"
            disabled={loading || code.trim().length < 8}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "확인 중..." : "합류하기"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              result.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.text}
            {result.type === "success" && (
              <div className="mt-2">
                <Link
                  href="/dashboard"
                  className="text-green-800 font-medium underline"
                >
                  대시보드로 이동 →
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          <Link href="/dashboard" className="hover:underline">
            대시보드로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
