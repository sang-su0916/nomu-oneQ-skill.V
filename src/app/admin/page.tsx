"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface Stats {
  users: { total: number; today: number; week: number };
  companies: {
    total: number;
    plans: { start: number; pro: number; ultra: number };
  };
  activeRate: number;
  conversionRate: number;
  employees: number;
  documents: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchStats();
  }, [user, authLoading]);

  const fetchStats = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/admin/stats", {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 403) {
        setError("관리자 권한이 필요합니다.");
        return;
      }
      if (!res.ok) {
        setError(`데이터 로딩 실패 (${res.status})`);
        return;
      }
      const text = await res.text();
      if (!text) {
        setError("빈 응답");
        return;
      }
      setStats(JSON.parse(text));
    } catch (err: any) {
      console.error("Admin stats fetch error:", err);
      setError(
        err?.name === "AbortError" ? "요청 시간 초과 (15초)" : "서버 연결 실패",
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  if (error)
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">{error}</h2>
        <Link href="/dashboard" className="text-[var(--primary)]">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  if (!stats) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            🛡️ 관리자 대시보드
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            노무원큐 서비스 현황
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          ← 사용자 대시보드
        </Link>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="👤" label="전체 가입자" value={stats.users.total} />
        <StatCard
          icon="🆕"
          label="오늘 신규"
          value={stats.users.today}
          accent={stats.users.today > 0}
        />
        <StatCard icon="📅" label="이번 주 신규" value={stats.users.week} />
        <StatCard icon="🏢" label="사업장" value={stats.companies.total} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="📊"
          label="활성 사용률"
          value={`${stats.activeRate}%`}
          sub="7일 내 로그인"
          accent={stats.activeRate < 30}
        />
        <StatCard
          icon="💳"
          label="유료 전환율"
          value={`${stats.conversionRate}%`}
          sub="Free → 유료"
        />
        <StatCard icon="👥" label="전체 직원" value={stats.employees} />
        <StatCard icon="📋" label="전체 서류" value={stats.documents} />
      </div>

      {/* 등급별 현황 */}
      <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)] mb-8">
        <h2 className="text-lg font-bold text-[var(--text)] mb-4">
          등급별 사업장 현황
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Start",
              count: stats.companies.plans.start,
              color: "bg-slate-100 text-slate-700",
            },
            {
              label: "Pro",
              count: stats.companies.plans.pro,
              color: "bg-indigo-100 text-indigo-700",
            },
            {
              label: "Ultra",
              count: stats.companies.plans.ultra,
              color: "bg-amber-100 text-amber-700",
            },
          ].map((p) => (
            <div key={p.label} className="text-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${p.color}`}
              >
                {p.label}
              </span>
              <div className="text-2xl font-bold text-[var(--text)] mt-2">
                {p.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 관리 메뉴 */}
      <h2 className="text-lg font-bold text-[var(--text)] mb-4">관리 메뉴</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <AdminLink
          href="/admin/users"
          icon="👤"
          label="사용자 관리"
          desc="가입자 목록, 정지/활성화"
        />
        <AdminLink
          href="/admin/companies"
          icon="🏢"
          label="사업장 관리"
          desc="등급 변경, 현황 조회"
        />
        <AdminLink
          href="/admin/codes"
          icon="🔑"
          label="멤버십 코드"
          desc="코드 생성, 사용 내역"
        />
        <AdminLink
          href="/admin/revenue"
          icon="💳"
          label="매출/구독"
          desc="MRR, 등급별 매출"
        />
        <AdminLink
          href="/admin/analytics"
          icon="📊"
          label="사용 분석"
          desc="인기 서류, 활성 추이"
        />
        <AdminLink
          href="/admin/support"
          icon="💬"
          label="고객 지원"
          desc="문의 관리, 공지사항"
        />
        <AdminLink
          href="/admin/system"
          icon="⚙️"
          label="시스템"
          desc="인프라, DB 현황"
        />
        <AdminLink
          href="/admin/partners"
          icon="🤝"
          label="파트너"
          desc="세무사/노무사 제휴"
        />
        <AdminLink
          href="/admin/templates"
          icon="📄"
          label="템플릿"
          desc="서류 30종 관리"
        />
        <AdminLink
          href="/dashboard"
          icon="🏠"
          label="사용자 대시보드"
          desc="일반 사용자 화면"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-2xl mb-2">{icon}</div>
      <div
        className={`text-2xl font-bold ${accent ? "text-orange-500" : "text-[var(--text)]"}`}
      >
        {value}
      </div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
      {sub && (
        <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>
      )}
    </div>
  );
}

function AdminLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-sm transition-all"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium text-[var(--text)]">{label}</div>
      <div className="text-xs text-[var(--text-muted)] mt-1">{desc}</div>
    </Link>
  );
}
