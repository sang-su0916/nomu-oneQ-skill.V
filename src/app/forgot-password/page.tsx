"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/reset-password`,
    });

    if (error) {
      setError("재설정 이메일 발송에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">노무원큐</h1>
          <p className="text-[var(--text-muted)] mt-2">비밀번호 찾기</p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)]">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-lg font-bold text-[var(--text)] mb-2">
                이메일을 확인해주세요
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-2">
                <strong>{email}</strong>으로 비밀번호 재설정 링크를
                발송했습니다.
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                메일이 보이지 않으면 스팸 폴더를 확인해주세요.
                <br />
                링크는 1시간 후 만료됩니다.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                가입할 때 사용한 이메일을 입력하시면, 비밀번호 재설정 링크를
                보내드립니다.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="example@company.com"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "발송 중..." : "재설정 링크 보내기"}
                </button>
              </form>

              <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                <Link
                  href="/login"
                  className="text-[var(--primary)] font-medium hover:underline"
                >
                  로그인으로 돌아가기
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
