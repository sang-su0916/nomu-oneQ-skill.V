"use client";

import Link from "next/link";

const contractTypes = [
  {
    href: "/contract/fulltime",
    emoji: "📋",
    title: "정규직 근로계약서",
    desc: "무기계약 정규직 근로자를 위한 표준 근로계약서",
    badge: "가장 많이 사용",
  },
  {
    href: "/contract/parttime",
    emoji: "⏰",
    title: "단시간(파트타임) 근로계약서",
    desc: "주 15시간 이상/미만 단시간 근로자용 계약서",
    badge: null,
  },
  {
    href: "/contract/freelancer",
    emoji: "💼",
    title: "프리랜서(업무위탁) 계약서",
    desc: "업무위탁·용역 계약 기반 프리랜서 계약서",
    badge: null,
  },
  {
    href: "/contract/foreign",
    emoji: "🌏",
    title: "외국인 근로계약서",
    desc: "한국어+영어 이중언어 계약서 (E-9, H-2, E-7 등 체류자격별)",
    badge: "NEW",
  },
];

export default function ContractIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
        근로계약서 작성
      </h1>
      <p className="text-[var(--text-muted)] mb-8">
        고용 형태에 맞는 계약서를 선택하세요. 직원 정보가 등록되어 있으면
        자동으로 채워집니다.
      </p>

      <div className="space-y-4">
        {contractTypes.map((ct) => (
          <Link
            key={ct.href}
            href={ct.href}
            className="block p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{ct.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors">
                    {ct.title}
                  </h2>
                  {ct.badge && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                      {ct.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">{ct.desc}</p>
              </div>
              <span className="text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors text-xl">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
