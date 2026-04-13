"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PLAN_LIMITS } from "@/types/database";
import type { DbEmployee } from "@/types/database";
import {
  checkContractExpiry,
  checkFixedTermConversion,
} from "@/lib/notification-checker";
import {
  calculateAnnualLeave,
  type AnnualLeaveBase,
} from "@/lib/calculations/annual-leave";
import PlanBanner from "@/components/PlanBanner";
import NotificationWidget from "@/components/NotificationWidget";
import { usePlanGate } from "@/hooks/usePlanGate";
import { DOC_TYPE_LABELS, DOC_TYPE_PATHS } from "@/hooks/useDocumentSave";
import GettingStartedGuide from "@/components/GettingStartedGuide";

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  resignedEmployees: number;
  contractsExpiringSoon: number;
  fixedTermConversions: number;
  documentsCount: number;
}

interface RecentDoc {
  id: string;
  doc_type: string;
  title: string;
  created_at: string;
}

const FAVORITE_DOCS = [
  { href: "/contract/fulltime", icon: "📋", label: "근로계약서" },
  { href: "/payslip", icon: "💵", label: "급여명세서" },
  { href: "/documents/certificate", icon: "📜", label: "재직증명서" },
  { href: "/severance/calculate", icon: "💼", label: "퇴직금 계산" },
  { href: "/insurance", icon: "🔐", label: "4대보험 계산" },
];

export default function DashboardPage() {
  const { user, company, membership, loading } = useAuth();
  const planGate = usePlanGate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    resignedEmployees: 0,
    contractsExpiringSoon: 0,
    fixedTermConversions: 0,
    documentsCount: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState<DbEmployee[]>([]);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [hasPayslip, setHasPayslip] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!company) return; // 사업장 미등록 시 안내 표시

    loadDashboard();
  }, [user, company, loading]);

  const loadDashboard = async () => {
    if (!company) return;

    // 직원 통계 (필요 컬럼만 조회)
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name, status, employment_type, department, hire_date")
      .eq("company_id", company.id);

    const emps = employees || [];
    const active = emps.filter((e) => e.status === "active");
    const resigned = emps.filter((e) => e.status === "resigned");

    // 서류 수
    const { count: docsCount } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);

    // 계약 만료 임박 체크
    const expiringContracts = checkContractExpiry(emps as DbEmployee[]);
    // 기간제 2년 무기계약 전환 대상 체크
    const fixedTermItems = checkFixedTermConversion(emps as DbEmployee[]);

    setStats({
      totalEmployees: emps.length,
      activeEmployees: active.length,
      resignedEmployees: resigned.length,
      contractsExpiringSoon: expiringContracts.length,
      fixedTermConversions: fixedTermItems.length,
      documentsCount: docsCount || 0,
    });

    setRecentEmployees(active.slice(0, 5) as DbEmployee[]);

    // 최근 작성 서류 3건 + 급여명세서 존재 여부
    const [{ data: docs }, { count: payslipCount }] = await Promise.all([
      supabase
        .from("documents")
        .select("id, doc_type, title, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("doc_type", "payslip"),
    ]);
    setRecentDocs((docs as RecentDoc[]) || []);
    setHasPayslip((payslipCount || 0) > 0);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  if (!company)
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 상단 안내 배너 */}
        <div className="bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)] border-opacity-30 rounded-xl px-5 py-3 mb-8 flex items-center justify-between">
          <p className="text-sm text-[var(--primary)] font-medium">
            💡 지금은 체험 모드입니다. 서류를 직접 작성해보고, 마음에 드시면
            사업장을 등록해보세요.
          </p>
          <Link
            href="/onboarding"
            className="ml-4 shrink-0 px-4 py-1.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            사업장 등록 →
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
          노무원큐 기능 둘러보기
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          로그인 없이도 서류를 직접 작성하고 PDF로 출력할 수 있습니다.
        </p>

        {/* 상황별 가이드 */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            🎯 어떤 상황인가요?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 직원 채용 */}
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="text-3xl mb-3">👋</div>
              <h3 className="font-bold text-emerald-900 mb-1">
                직원을 새로 뽑았어요
              </h3>
              <p className="text-xs text-emerald-700 mb-4">
                채용 시 반드시 필요한 서류들입니다.
              </p>
              <ol className="space-y-2">
                {[
                  {
                    n: 1,
                    href: "/employees",
                    label: "직원 등록",
                    desc: "한 번 등록하면 모든 서류에 자동 입력",
                  },
                  {
                    n: 2,
                    href: "/contract/fulltime",
                    label: "근로계약서 작성",
                    desc: "법정 필수, 근로자에게 1부 교부",
                  },
                  {
                    n: 3,
                    href: "/documents/privacy-consent",
                    label: "개인정보 동의서",
                    desc: "4대보험·급여 관리용",
                  },
                  {
                    n: 4,
                    href: "/documents/pledge",
                    label: "서약서 / NDA",
                    desc: "비밀유지·복무 서약",
                  },
                ].map((item) => (
                  <li key={item.n}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-emerald-100 transition-colors group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center">
                        {item.n}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-emerald-900 group-hover:underline">
                          {item.label}
                        </span>
                        <p className="text-xs text-emerald-600">{item.desc}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            {/* 월급 지급 */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-bold text-blue-900 mb-1">월급을 줘야 해요</h3>
              <p className="text-xs text-blue-700 mb-4">
                급여 계산부터 명세서 교부까지.
              </p>
              <ol className="space-y-2">
                {[
                  {
                    n: 1,
                    href: "/insurance",
                    label: "4대보험 계산",
                    desc: "근로자·사업주 부담금 확인",
                  },
                  {
                    n: 2,
                    href: "/payslip",
                    label: "급여명세서 작성",
                    desc: "소득세 자동 계산, PDF 출력",
                  },
                  {
                    n: 3,
                    href: "/wage-ledger",
                    label: "임금대장 기록",
                    desc: "법정 3년 보존 의무",
                  },
                  {
                    n: 4,
                    href: "/work-rules",
                    label: "취업규칙 확인",
                    desc: "10인 이상 사업장 필수",
                  },
                ].map((item) => (
                  <li key={item.n}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-100 transition-colors group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">
                        {item.n}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-blue-900 group-hover:underline">
                          {item.label}
                        </span>
                        <p className="text-xs text-blue-600">{item.desc}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            {/* 직원 퇴직 */}
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl">
              <div className="text-3xl mb-3">🚪</div>
              <h3 className="font-bold text-red-900 mb-1">직원이 그만둬요</h3>
              <p className="text-xs text-red-700 mb-4">
                퇴직 유형별 필요 서류와 절차.
              </p>
              <ol className="space-y-2">
                {[
                  {
                    n: 1,
                    href: "/terminate",
                    label: "퇴직 처리 가이드",
                    desc: "사직·해고·계약만료 단계별 안내",
                  },
                  {
                    n: 2,
                    href: "/documents/resignation",
                    label: "사직서",
                    desc: "자발적 퇴직 시",
                  },
                  {
                    n: 3,
                    href: "/severance/calculate",
                    label: "퇴직금 계산",
                    desc: "1년 이상 근무 시 필수",
                  },
                  {
                    n: 4,
                    href: "/documents/certificate",
                    label: "경력증명서 발급",
                    desc: "퇴직자 요청 시 의무 발급",
                  },
                ].map((item) => (
                  <li key={item.n}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-red-100 transition-colors group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-red-200 text-red-800 text-xs font-bold flex items-center justify-center">
                        {item.n}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-red-900 group-hover:underline">
                          {item.label}
                        </span>
                        <p className="text-xs text-red-600">{item.desc}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* 주요 서류 바로가기 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              href: "/contract/fulltime",
              icon: "📝",
              title: "근로계약서 (정규직)",
              desc: "입사 필수 서류, 법정 조항 자동 포함",
              badge: "필수",
            },
            {
              href: "/contract/parttime",
              icon: "📝",
              title: "근로계약서 (파트타임)",
              desc: "단시간 근로자용, 주휴수당 자동 계산",
              badge: "",
            },
            {
              href: "/payslip",
              icon: "💰",
              title: "급여명세서",
              desc: "4대보험·세금 자동 공제, PDF 출력",
              badge: "인기",
            },
            {
              href: "/documents/resignation",
              icon: "📄",
              title: "사직서",
              desc: "자발적 퇴직 처리용 공식 서식",
              badge: "",
            },
            {
              href: "/documents/termination-notice",
              icon: "⚖️",
              title: "해고통보서",
              desc: "근기법 제26조 예고 조항 포함",
              badge: "",
            },
            {
              href: "/documents/certificate",
              icon: "🏅",
              title: "재직증명서",
              desc: "은행·관공서 제출용 공식 서식",
              badge: "",
            },
            {
              href: "/severance/calculate",
              icon: "💼",
              title: "퇴직금 계산기",
              desc: "중간정산·분할지급 모두 지원",
              badge: "",
            },
            {
              href: "/insurance",
              icon: "🔐",
              title: "4대보험 계산기",
              desc: "2026년 요율 · 근로자·사업주 동시 계산",
              badge: "",
            },
          ].map(({ href, icon, title, desc, badge }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)] hover:shadow-sm transition-all group"
            >
              <div className="text-3xl">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)] text-sm group-hover:text-[var(--primary)] transition-colors">
                    {title}
                  </span>
                  {badge && (
                    <span className="text-xs px-1.5 py-0.5 bg-[var(--primary)] text-white rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {desc}
                </p>
              </div>
              <span className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors">
                →
              </span>
            </Link>
          ))}
        </div>

        {/* 게스트 vs 회원 비교 CTA */}
        <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
          {/* 상단 헤더 */}
          <div className="bg-[var(--primary)] px-6 py-4 text-center">
            <p className="text-white font-semibold text-sm">
              지금은 미리보기 모드입니다 — 사업장 등록 시 아래 기능이 열립니다
            </p>
          </div>

          {/* 비교 표 */}
          <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
            {/* 현재: 미리보기 */}
            <div className="bg-[var(--bg-card)] p-5">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">
                지금 (미리보기)
              </p>
              <ul className="space-y-2.5 text-sm text-[var(--text-muted)]">
                {[
                  "서류 양식 확인만 가능",
                  "직원 이름·급여 직접 입력",
                  "매번 같은 정보 반복 입력",
                  "PDF 저장 불가",
                  "발급 이력 없음",
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-[var(--text-light)] shrink-0">✕</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* 등록 후: 풀 기능 */}
            <div className="bg-[var(--bg-card)] dark:bg-[var(--bg-card)] p-5">
              <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wide mb-3">
                등록 후 (무료 포함)
              </p>
              <ul className="space-y-2.5 text-sm text-[var(--text)]">
                {[
                  { icon: "✅", text: "직원 이름 클릭 한 번 → 서류 완성" },
                  { icon: "✅", text: "급여·4대보험 자동 계산·자동 입력" },
                  { icon: "✅", text: "PDF 다운로드 · 인쇄 바로 가능" },
                  { icon: "✅", text: "발급 서류 이력 관리" },
                  { icon: "✅", text: "매월 급여명세서 자동 생성" },
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="shrink-0">{t.icon}</span>
                    {t.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 추가 혜택 배너 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800 px-5 py-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
              🎁 지금 등록하면 <strong>모든 기능 무료 사용</strong> · 직원 등록
              · 서류 30종+ 무제한
            </p>
          </div>

          {/* CTA 버튼 */}
          <div className="bg-[var(--bg-card)] px-6 py-5 flex items-center justify-center gap-3 flex-wrap border-t border-[var(--border)]">
            <Link
              href="/onboarding"
              className="px-7 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm"
            >
              무료로 시작하기 →
            </Link>
            <Link
              href="/membership"
              className="px-5 py-3 border border-[var(--border)] text-[var(--text)] rounded-xl font-medium hover:border-[var(--primary)] transition-colors text-sm"
            >
              서비스 안내
            </Link>
          </div>
        </div>
      </div>
    );

  const planLimit =
    PLAN_LIMITS[
      company.plan && company.plan in PLAN_LIMITS ? company.plan : "start"
    ];
  const usagePercent =
    planLimit.maxEmployees === Infinity
      ? 0
      : Math.round((stats.activeEmployees / planLimit.maxEmployees) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 등급 만료/경고 배너 */}
      <PlanBanner />

      {/* 시작 가이드 (사업장 등록 직후) */}
      <GettingStartedGuide
        employeeCount={stats.activeEmployees}
        documentCount={stats.documentsCount}
        hasPayslip={hasPayslip}
      />

      {/* 상황별 빠른 가이드 (접이식) */}
      <details className="mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
        <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)] transition-colors">
          🎯 어떤 상황인가요? — 채용 · 월급 · 퇴직 상황별 가이드
        </summary>
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <Link
            href="/employees"
            className="p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <span className="text-lg">👋</span>
            <span className="font-semibold text-emerald-900 text-sm ml-2">
              직원 채용
            </span>
            <p className="text-xs text-emerald-700 mt-1">
              직원등록 → 계약서 → 동의서 → 서약서
            </p>
          </Link>
          <Link
            href="/payslip"
            className="p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <span className="text-lg">💰</span>
            <span className="font-semibold text-blue-900 text-sm ml-2">
              월급 지급
            </span>
            <p className="text-xs text-blue-700 mt-1">
              4대보험 → 급여명세서 → 임금대장
            </p>
          </Link>
          <Link
            href="/terminate"
            className="p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="font-semibold text-red-900 text-sm ml-2">
              직원 퇴직
            </span>
            <p className="text-xs text-red-700 mt-1">
              퇴직처리 → 퇴직금 → 경력증명서
            </p>
          </Link>
        </div>
      </details>

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {company.name}
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {membership?.role === "admin"
              ? "관리자"
              : membership?.role === "manager"
                ? "담당자"
                : "열람자"}
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="👥"
          label="재직 직원"
          value={stats.activeEmployees}
          sub={`/ ${planLimit.maxEmployees === Infinity ? "무제한" : planLimit.maxEmployees}명`}
        />
        <StatCard icon="📤" label="퇴사 직원" value={stats.resignedEmployees} />
        <StatCard icon="📋" label="보관 서류" value={stats.documentsCount} />
        <StatCard
          icon="⚠️"
          label="계약만료 임박"
          value={stats.contractsExpiringSoon}
          accent
        />
        {stats.fixedTermConversions > 0 && (
          <StatCard
            icon="🔄"
            label="무기계약 전환"
            value={stats.fixedTermConversions}
            accent
          />
        )}
      </div>

      {/* 자주 쓰는 서류 + 최근 작업 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 자주 쓰는 서류 */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-base font-bold text-[var(--text)] mb-3">
            자주 쓰는 서류
          </h2>
          <div className="space-y-1">
            {FAVORITE_DOCS.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg)] transition-colors group"
              >
                <span className="text-lg">{doc.icon}</span>
                <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                  {doc.label}
                </span>
                <span className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors text-xs">
                  작성 →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 최근 작성 서류 */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[var(--text)]">
              최근 작성 서류
            </h2>
            {recentDocs.length > 0 && (
              <Link
                href="/archive"
                className="text-xs text-[var(--primary)] hover:underline"
              >
                전체 보기 →
              </Link>
            )}
          </div>
          {recentDocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-muted)]">
                아직 작성한 서류가 없습니다
              </p>
              <Link
                href="/contract/fulltime"
                className="text-sm text-[var(--primary)] hover:underline mt-2 inline-block"
              >
                첫 서류 작성하기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={DOC_TYPE_PATHS[doc.doc_type] || "/archive"}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg)] transition-colors group"
                >
                  <span className="text-lg">📄</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                      {doc.title ||
                        DOC_TYPE_LABELS[doc.doc_type] ||
                        doc.doc_type}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(doc.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 알림 위젯 (Pro 이상) */}
      {planGate.isPaid && <NotificationWidget />}

      {/* 연차 현황 위젯 */}
      {recentEmployees.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[var(--text)]">
              🏖️ 연차 현황
            </h2>
            <Link
              href="/documents/annual-leave"
              className="text-xs text-[var(--primary)] hover:underline"
            >
              상세 →
            </Link>
          </div>
          <div className="space-y-2">
            {recentEmployees
              .filter((e) => e.hire_date)
              .map((emp) => {
                const basis: AnnualLeaveBase =
                  (company?.annual_leave_base as AnnualLeaveBase) ||
                  "hire_date";
                const result = calculateAnnualLeave(
                  emp.hire_date,
                  new Date().getFullYear(),
                  basis,
                );
                return (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--bg)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold">
                        {emp.name?.[0]}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[var(--text)]">
                          {emp.name}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">
                          {emp.department || ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[var(--primary)]">
                        {result.totalDays}일
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-1">
                        발생
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            *{" "}
            {(company?.annual_leave_base as AnnualLeaveBase) === "fiscal_year"
              ? "회계연도"
              : "입사일"}{" "}
            기준 산정 · 사용일수는 연차관리대장에서 확인
          </p>
        </div>
      )}

      {/* 직원 한도 바 */}
      {company.plan === "start" && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--text-muted)]">직원 등록 한도</span>
            <span className="font-medium text-[var(--text)]">
              {stats.activeEmployees} / {planLimit.maxEmployees}명
            </span>
          </div>
          <div className="w-full bg-[var(--border-light)] rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent >= 100 ? "bg-red-500" : usagePercent >= 80 ? "bg-yellow-500" : "bg-[var(--primary)]"}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 도구 바로가기 */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 mb-8">
        <h2 className="text-base font-bold text-[var(--text)] mb-3">
          계산기 & 도구
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/insurance"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg)] transition-colors group"
          >
            <span className="text-2xl">🏥</span>
            <div>
              <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)]">
                4대보험
              </p>
              <p className="text-xs text-[var(--text-muted)]">보험료 계산</p>
            </div>
          </Link>
          <Link
            href="/severance/calculate"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg)] transition-colors group"
          >
            <span className="text-2xl">💼</span>
            <div>
              <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)]">
                퇴직금
              </p>
              <p className="text-xs text-[var(--text-muted)]">퇴직금 계산</p>
            </div>
          </Link>
          <Link
            href="/shutdown-allowance"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg)] transition-colors group"
          >
            <span className="text-2xl">🏭</span>
            <div>
              <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)]">
                휴업수당
              </p>
              <p className="text-xs text-[var(--text-muted)]">휴업수당 계산</p>
            </div>
          </Link>
          <Link
            href="/convert"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg)] transition-colors group"
          >
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--primary)]">
                근로형태 전환
              </p>
              <p className="text-xs text-[var(--text-muted)]">전환 비교 분석</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 최근 직원 */}
      {recentEmployees.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-[var(--text)] mb-4">
            최근 등록 직원
          </h2>
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">
                    이름
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">
                    구분
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">
                    부서
                  </th>
                  <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">
                    입사일
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text)]">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {emp.employment_type === "fulltime"
                        ? "정규직"
                        : emp.employment_type === "parttime"
                          ? "파트타임"
                          : "프리랜서"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {emp.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {emp.hire_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
      <div className="text-2xl mb-2">{icon}</div>
      <div
        className={`text-2xl font-bold ${accent && value > 0 ? "text-orange-500" : "text-[var(--text)]"}`}
      >
        {value}
        {sub && (
          <span className="text-sm font-normal text-[var(--text-muted)]">
            {" "}
            {sub}
          </span>
        )}
      </div>
      <div className="text-sm text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
