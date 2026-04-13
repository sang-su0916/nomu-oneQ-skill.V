"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlanGate } from "@/hooks/usePlanGate";
import HelpGuide from "@/components/HelpGuide";

const SITUATION_GUIDES = [
  {
    situation: "직원을 새로 뽑았어요",
    icon: "🤝",
    docs: [
      { label: "근로계약서", href: "/contract/fulltime" },
      { label: "개인정보동의서", href: "/documents/privacy-consent" },
      { label: "비밀유지서약서", href: "/documents/nda" },
      { label: "서약서", href: "/documents/pledge" },
    ],
  },
  {
    situation: "직원이 퇴사해요",
    icon: "👋",
    docs: [
      { label: "사직서", href: "/documents/resignation" },
      { label: "퇴직금정산서", href: "/documents/retirement-pay" },
      { label: "업무인수인계서", href: "/documents/handover" },
    ],
  },
  {
    situation: "급여일이에요",
    icon: "💰",
    docs: [
      { label: "급여명세서", href: "/payslip" },
      { label: "임금대장", href: "/wage-ledger" },
    ],
  },
  {
    situation: "연차/휴가를 관리해야 해요",
    icon: "🏖️",
    docs: [
      { label: "연차관리대장", href: "/documents/annual-leave" },
      { label: "연차촉진통보서", href: "/documents/annual-leave-notice" },
    ],
  },
  {
    situation: "문제 직원을 처리해야 해요",
    icon: "⚠️",
    docs: [
      { label: "경고장", href: "/documents/warning-letter" },
      { label: "징계통보서", href: "/documents/disciplinary-notice" },
      { label: "해고통보서", href: "/documents/termination-notice" },
    ],
  },
  {
    situation: "직원이 휴직/복직해요",
    icon: "🔄",
    docs: [
      { label: "휴직신청서", href: "/documents/leave-application" },
      { label: "복직신청서", href: "/documents/reinstatement" },
    ],
  },
];

const POPULAR_DOCS = new Set([
  "재직증명서",
  "개인정보동의서",
  "사직서",
  "경고장",
]);

const CATEGORY_TABS = [
  { key: "전체", label: "전체" },
  { key: "증명서", label: "증명서" },
  { key: "동의/서약", label: "동의/서약" },
  { key: "근태관리", label: "근태관리" },
  { key: "인사관리", label: "인사관리" },
  { key: "징계", label: "징계" },
  { key: "휴직/복직", label: "휴직/복직" },
  { key: "업무", label: "업무" },
];

const DOCUMENT_CATEGORIES = [
  {
    title: "증명서",
    icon: "📜",
    items: [
      {
        href: "/documents/certificate",
        label: "재직증명서",
        desc: "재직 사실을 증명하는 문서",
        docType: "certificate",
      },
      {
        href: "/documents/career-certificate",
        label: "경력증명서",
        desc: "경력 사항을 증명하는 문서",
        docType: "career_certificate",
      },
    ],
  },
  {
    title: "동의/서약",
    icon: "🔒",
    items: [
      {
        href: "/documents/privacy-consent",
        label: "개인정보동의서",
        desc: "개인정보 수집·이용 동의",
        docType: "privacy_consent",
      },
      {
        href: "/documents/nda",
        label: "비밀유지서약서",
        desc: "업무상 비밀유지 서약",
        docType: "nda",
      },
      {
        href: "/documents/pledge",
        label: "서약서",
        desc: "입사 시 서약 문서",
        docType: "pledge",
      },
    ],
  },
  {
    title: "근태관리",
    icon: "🕐",
    items: [
      {
        href: "/documents/attendance",
        label: "출퇴근기록부",
        desc: "일별 출퇴근 시간 기록",
        docType: "attendance",
      },
      {
        href: "/documents/overtime",
        label: "시간외근로합의서",
        desc: "연장·야간·휴일근로 합의",
        docType: "overtime",
      },
      {
        href: "/documents/annual-leave",
        label: "연차관리대장",
        desc: "연차유급휴가 발생·사용 관리",
        docType: "annual_leave",
      },
      {
        href: "/documents/annual-leave-notice",
        label: "연차촉진통보서",
        desc: "미사용 연차 사용 촉진 통보",
        docType: "annual_leave_notice",
      },
    ],
  },
  {
    title: "인사관리",
    icon: "👤",
    items: [
      {
        href: "/documents/resignation",
        label: "사직서",
        desc: "자발적 퇴직 의사 표시",
        docType: "resignation",
      },
      {
        href: "/documents/retirement-pay",
        label: "퇴직금정산서",
        desc: "퇴직금 산정 및 정산",
        docType: "retirement_pay",
      },
      {
        href: "/documents/personnel-card",
        label: "인사카드",
        desc: "직원 인적사항 종합 관리",
        docType: "personnel_card",
      },
      {
        href: "/documents/probation-eval",
        label: "수습평가서",
        desc: "수습기간 근무 평가",
        docType: "probation_eval",
      },
      {
        href: "/documents/training-record",
        label: "교육훈련확인서",
        desc: "직무교육 이수 확인",
        docType: "training_record",
      },
    ],
  },
  {
    title: "징계",
    icon: "⚠️",
    items: [
      {
        href: "/documents/warning-letter",
        label: "경고장",
        desc: "근무태도·규정위반 경고",
        docType: "warning_letter",
      },
      {
        href: "/documents/disciplinary-notice",
        label: "징계통보서",
        desc: "징계처분 결과 통보",
        docType: "disciplinary_notice",
      },
      {
        href: "/documents/termination-notice",
        label: "해고통보서",
        desc: "근로관계 종료 통보",
        docType: "termination_notice",
      },
    ],
  },
  {
    title: "휴직/복직",
    icon: "🔄",
    items: [
      {
        href: "/documents/leave-application",
        label: "휴직신청서",
        desc: "육아·병가 등 휴직 신청",
        docType: "leave_application",
      },
      {
        href: "/documents/reinstatement",
        label: "복직신청서",
        desc: "휴직 후 복직 신청",
        docType: "reinstatement",
      },
    ],
  },
  {
    title: "업무",
    icon: "💼",
    items: [
      {
        href: "/documents/work-hours-change",
        label: "근무시간변경합의서",
        desc: "근로시간 변경 합의",
        docType: "work_hours_change",
      },
      {
        href: "/documents/remote-work",
        label: "재택근무신청서",
        desc: "재택·원격근무 신청",
        docType: "remote_work",
      },
      {
        href: "/documents/business-trip",
        label: "출장신청서",
        desc: "국내·해외 출장 신청",
        docType: "business_trip",
      },
      {
        href: "/documents/side-job-permit",
        label: "겸업허가신청서",
        desc: "겸직·부업 허가 신청",
        docType: "side_job_permit",
      },
      {
        href: "/documents/handover",
        label: "업무인수인계서",
        desc: "퇴직·이동 시 업무 인수인계",
        docType: "handover",
      },
    ],
  },
];

export default function DocumentsPage() {
  const totalCount = DOCUMENT_CATEGORIES.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );
  const planGate = usePlanGate();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("전체");

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    let categories = DOCUMENT_CATEGORIES;

    // Apply category filter
    if (activeTab !== "전체") {
      categories = categories.filter((cat) => cat.title === activeTab);
    }

    // Apply search filter
    if (q) {
      categories = categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.label.toLowerCase().includes(q) ||
              item.desc.toLowerCase().includes(q),
          ),
        }))
        .filter((cat) => cat.items.length > 0);
    }

    return categories;
  }, [search, activeTab]);

  const matchCount = filteredCategories.reduce(
    (sum, cat) => sum + cat.items.length,
    0,
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">노무서류</h1>
        <p className="text-[var(--text-muted)] mt-1">
          총 {totalCount}종 · 양식을 선택하면 바로 작성할 수 있습니다
        </p>
      </div>

      <HelpGuide
        pageKey="documents"
        steps={[
          '상단의 "이런 상황엔?" 카드에서 지금 필요한 서류를 빠르게 찾을 수 있어요.',
          "검색창에 키워드를 입력하거나, 카테고리 탭으로 서류를 분류해서 볼 수 있습니다.",
          "서류를 클릭하면 바로 작성 화면으로 이동합니다. 직원이 등록되어 있으면 정보가 자동으로 채워져요.",
        ]}
      />

      {/* 이런 상황엔? - Situation Guide */}
      <div className="mb-6">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] mb-3 hover:text-[var(--primary)] transition-colors"
        >
          <span className="text-base">💡</span>
          <span>이런 상황엔?</span>
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${guideOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {guideOpen && (
          <div
            className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {SITUATION_GUIDES.map((guide) => (
              <div
                key={guide.situation}
                className="flex-shrink-0 w-56 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{guide.icon}</span>
                  <p className="text-sm font-semibold text-[var(--text)] leading-tight">
                    {guide.situation}
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {guide.docs.map((doc) => (
                    <li key={doc.href}>
                      <Link
                        href={doc.href}
                        className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                      >
                        <span className="text-[var(--text-muted)]">
                          &#8250;
                        </span>
                        {doc.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 검색 */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="서류명 또는 설명으로 검색 (예: 계약서, 연차, 퇴직)"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-[var(--text-light)] text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {search && (
        <p className="text-xs text-[var(--text-muted)] mb-4">
          {matchCount > 0
            ? `"${search}" 검색 결과: ${matchCount}건`
            : `"${search}"에 해당하는 서류가 없습니다`}
        </p>
      )}

      {/* Category Filter Tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text-muted)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 빠른 링크: 계약서·급여 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <QuickLink href="/contract/fulltime" icon="📋" label="정규직 계약서" />
        <QuickLink
          href="/contract/parttime"
          icon="📋"
          label="파트타임 계약서"
        />
        <QuickLink href="/payslip" icon="💵" label="급여명세서" />
        <QuickLink href="/severance/calculate" icon="💰" label="퇴직금 계산" />
      </div>

      {/* 카테고리별 문서 목록 */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <section key={cat.title}>
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{cat.icon}</span> {cat.title}
              <span className="text-xs font-normal">({cat.items.length})</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {cat.items.map((item) => {
                const isPopular = POPULAR_DOCS.has(item.label);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--primary)] hover:shadow-sm transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text)] group-hover:text-[var(--primary)] transition-colors flex items-center gap-1.5">
                        {item.label}
                        {isPopular && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-600 leading-none">
                            인기
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {item.desc}
                      </p>
                    </div>
                    <span className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors text-sm">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* 안내 */}
      <div className="mt-10 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <p className="font-medium mb-1">참고 안내</p>
        <p>
          본 서비스의 문서 양식은 참고용이며, 법적 효력은 관할 기관 및 노무사
          확인이 필요합니다.
        </p>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--primary)] hover:shadow-sm transition-all text-center"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-[var(--text)]">{label}</span>
    </Link>
  );
}
