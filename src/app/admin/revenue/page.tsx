"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface RevenueData {
  mrr: number;
  planStats: { plan: string; price: number; count: number; revenue: number }[];
  expiringSoon: { id: string; name: string; plan: string; expiresAt: string }[];
  monthlySignups: { month: string; count: number }[];
}

export default function AdminRevenuePage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetch("/api/admin/revenue")
      .then(async (res) => {
        if (res.status === 403) {
          setError("권한 없음");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("데이터 로딩 실패");
          setLoading(false);
          return;
        }
        setData(await res.json());
        setLoading(false);
      })
      .catch(() => {
        setError("서버 연결 실패");
        setLoading(false);
      });
  }, [user, authLoading]);

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  if (error || !data)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-[var(--text)]">{error}</h2>
      </div>
    );

  const formatWon = (n: number) => n.toLocaleString("ko-KR") + "원";
  const maxSignup = Math.max(...data.monthlySignups.map((m) => m.count), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            💳 매출/구독 현황
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            월간 반복 매출 및 구독 관리
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 관리자 대시보드
        </Link>
      </div>

      {/* MRR */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8">
        <div className="text-sm opacity-80">월간 반복 매출 (MRR)</div>
        <div className="text-4xl font-bold mt-1">{formatWon(data.mrr)}</div>
        <div className="text-sm opacity-80 mt-2">
          연간 환산: {formatWon(data.mrr * 12)}
        </div>
      </div>

      {/* 등급별 매출 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          등급별 매출
        </h2>
        <div className="space-y-3">
          {data.planStats.map((p) => (
            <div key={p.plan} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    p.plan === "start"
                      ? "bg-slate-100 text-slate-700"
                      : p.plan === "pro"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {p.plan}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {p.count}개 사업장 × {formatWon(p.price)}
                </span>
              </div>
              <span className="font-bold text-[var(--text)]">
                {formatWon(p.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 월별 가입 추이 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          월별 사업장 등록 추이
        </h2>
        <div className="flex items-end gap-2 h-40">
          {data.monthlySignups.map((m) => (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs font-bold text-[var(--text)]">
                {m.count}
              </span>
              <div
                className="w-full bg-[var(--primary)] rounded-t-md transition-all"
                style={{
                  height: `${(m.count / maxSignup) * 100}%`,
                  minHeight: m.count > 0 ? "8px" : "2px",
                }}
              />
              <span className="text-xs text-[var(--text-muted)]">
                {m.month.slice(5)}월
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 만료 예정 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          ⚠️ 만료 예정 구독 (30일 내)
        </h2>
        {data.expiringSoon.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            만료 예정인 구독이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {data.expiringSoon.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-[var(--text)]">
                    {c.name}
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.plan === "basic"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {c.plan}
                  </span>
                </div>
                <span className="text-sm text-orange-600 font-medium">
                  {new Date(c.expiresAt).toLocaleDateString("ko-KR")} 만료
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
