"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(
        error.message ===
          "New password should be different from the old password."
          ? "기존 비밀번호와 다른 비밀번호를 입력해주세요."
          : "비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.",
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)]">노무원큐</h1>
          <p className="text-[var(--text-muted)] mt-2">새 비밀번호 설정</p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-8 shadow-sm border border-[var(--border)]">
          {success ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-lg font-bold text-[var(--text)] mb-2">
                비밀번호가 변경되었습니다
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                잠시 후 대시보드로 이동합니다...
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                새로운 비밀번호를 입력해주세요.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="6자 이상"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-1">
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="비밀번호를 다시 입력해주세요"
                    required
                    minLength={6}
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
                  {loading ? "변경 중..." : "비밀번호 변경"}
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
