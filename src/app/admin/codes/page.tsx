"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Link from "next/link";

interface LicenseCode {
  id: string;
  code: string;
  plan: string;
  duration_days: number;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

const PLAN_OPTIONS = [
  { value: "pro", label: "Pro" },
  { value: "ultra", label: "Ultra" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30일 (1개월)" },
  { value: 90, label: "90일 (3개월)" },
  { value: 365, label: "365일 (1년)" },
];

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외 (0/O, 1/I)
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AdminCodesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const toast = useToast();

  const [codes, setCodes] = useState<LicenseCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const [filter, setFilter] = useState<"all" | "unused" | "used">("all");

  const supabase = createClient();

  const loadCodes = useCallback(async () => {
    setLoadingCodes(true);
    const { data, error } = await supabase
      .from("license_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCodes(data);
    }
    setLoadingCodes(false);
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) loadCodes();
  }, [isAdmin, loadCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedCode(null);

    const code = generateRandomCode();

    const { error } = await supabase.from("license_codes").insert({
      code,
      plan: selectedPlan,
      duration_days: selectedDuration,
    });

    if (error) {
      toast.error("코드 생성 실패: " + error.message);
    } else {
      setGeneratedCode(code);
      await loadCodes();
    }

    setGenerating(false);
  };

  const filteredCodes = codes.filter((c) => {
    if (filter === "unused") return !c.used_by;
    if (filter === "used") return !!c.used_by;
    return true;
  });

  // 로딩 중
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // 비로그인 또는 관리자 아님
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-8 max-w-sm w-full text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-2">
            접근 권한 없음
          </h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {!user ? "로그인이 필요합니다." : "관리자만 접근할 수 있습니다."}
          </p>
          <Link
            href={!user ? "/login" : "/dashboard"}
            className="inline-block px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {!user ? "로그인" : "대시보드로 이동"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
        🔑 멤버십 코드 관리
      </h1>
      <p className="text-[var(--text-muted)] text-sm mb-8">
        멤버십 코드를 생성하고 사용 현황을 확인합니다.
      </p>

      {/* 코드 생성 섹션 */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          새 멤버십 코드 생성
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              등급
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            >
              {PLAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              유효기간
            </label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? "생성 중..." : "🎲 코드 생성"}
            </button>
          </div>
        </div>

        {generatedCode && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-sm text-green-700 mb-2">
              ✅ 코드가 생성되었습니다!
            </p>
            <div className="text-3xl font-mono font-bold tracking-[0.3em] text-green-800">
              {generatedCode}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                toast.success("복사되었습니다!");
              }}
              className="mt-2 text-sm text-green-600 hover:text-green-800 underline"
            >
              📋 복사하기
            </button>
          </div>
        )}
      </div>

      {/* 코드 목록 */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--text)]">
            생성된 코드 목록
          </h2>

          <div className="flex gap-2">
            {(["all", "unused", "used"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"
                }`}
              >
                {f === "all" ? "전체" : f === "unused" ? "미사용" : "사용됨"}
              </button>
            ))}
          </div>
        </div>

        {loadingCodes ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="text-3xl mb-2">📭</div>
            <p>생성된 코드가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    코드
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    등급
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    기간
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    상태
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    생성일
                  </th>
                  <th className="text-left px-3 py-2 text-[var(--text-muted)] font-medium">
                    사용일
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-3 font-mono font-bold tracking-wider text-[var(--text)]">
                      {c.code}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.plan === "ultra"
                            ? "bg-amber-100 text-amber-800"
                            : c.plan === "pro"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {c.plan === "ultra"
                          ? "Ultra"
                          : c.plan === "pro"
                            ? "Pro"
                            : "Start"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {c.duration_days}일
                    </td>
                    <td className="px-3 py-3">
                      {c.used_by ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg)] text-[var(--text-muted)]">
                          사용됨
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          미사용
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {c.used_at
                        ? new Date(c.used_at).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-[var(--text-muted)] text-right">
          총 {codes.length}개 · 미사용 {codes.filter((c) => !c.used_by).length}
          개 · 사용 {codes.filter((c) => c.used_by).length}개
        </div>
      </div>
    </div>
  );
}
