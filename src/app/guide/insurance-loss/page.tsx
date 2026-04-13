"use client";

import { useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

interface InsuranceSection {
  id: string;
  title: string;
  icon: string;
  deadline: string;
  calcDeadline: (termDate: Date) => Date;
  portal: { name: string; url: string };
  requiredDocs: string[];
  cautions: string[];
  highlight?: boolean;
}

const insuranceSections: InsuranceSection[] = [
  {
    id: "national_pension",
    title: "국민연금",
    icon: "🏛️",
    deadline: "퇴직일이 속한 달의 다음 달 15일",
    calcDeadline: (d) => new Date(d.getFullYear(), d.getMonth() + 1, 15),
    portal: {
      name: "4대사회보험정보연계센터 (EDI)",
      url: "https://www.4insure.or.kr",
    },
    requiredDocs: ["자격상실신고서", "주민등록등본 (또는 사본)"],
    cautions: [
      "퇴직일 = 근로관계 종료일의 다음 날 (예: 3/31 퇴사 → 상실일 4/1)",
      "사유코드: 자발적 퇴사(3), 권고사직(4), 해고(5) 등 정확히 기재",
    ],
  },
  {
    id: "health_insurance",
    title: "건강보험",
    icon: "🏥",
    deadline: "퇴직일로부터 14일 이내",
    calcDeadline: (d) => {
      const result = new Date(d);
      result.setDate(result.getDate() + 14);
      return result;
    },
    portal: { name: "국민건강보험공단 EDI", url: "https://edi.nhis.or.kr" },
    requiredDocs: ["직장가입자 자격상실신고서"],
    cautions: [
      "퇴직 후 임의계속가입 희망 시 퇴직일로부터 36개월 이내 신청 가능",
      "퇴직자에게 지역가입 전환 안내 필요 (보험료 변동 고지)",
      "장기요양보험은 건강보험과 함께 자동 처리",
    ],
  },
  {
    id: "employment_insurance",
    title: "고용보험",
    icon: "💼",
    deadline: "퇴직일이 속한 달의 다음 달 15일",
    calcDeadline: (d) => new Date(d.getFullYear(), d.getMonth() + 1, 15),
    portal: { name: "고용24 (워크넷)", url: "https://www.work24.go.kr" },
    requiredDocs: [
      "피보험자격상실신고서",
      "이직확인서 (실업급여 신청용 — 필수!)",
      "근로계약서 사본",
      "임금대장 또는 급여명세서",
    ],
    cautions: [
      "이직확인서는 퇴직일로부터 10일 이내 제출 의무",
      "미제출 시 과태료 최대 300만원 (고용보험법 제118조)",
      "실업급여 수급 가능 여부와 무관하게 반드시 제출해야 함",
      "권고사직·정리해고 시 이직사유 정확히 기재 (실업급여 수급에 영향)",
    ],
    highlight: true,
  },
  {
    id: "industrial_accident",
    title: "산재보험",
    icon: "⛑️",
    deadline: "별도 상실신고 불필요 (보수총액신고 시 반영)",
    calcDeadline: (d) => {
      const year = d.getFullYear();
      return new Date(year + 1, 2, 15); // 다음 해 3/15
    },
    portal: {
      name: "근로복지공단 고용·산재보험 토탈서비스",
      url: "https://total.comwel.or.kr",
    },
    requiredDocs: ["별도 서류 불필요 (보수총액신고에 포함)"],
    cautions: [
      "근로자 퇴직 시 별도 자격상실신고 없음",
      "매년 3/15까지 보수총액신고 시 퇴직자 급여 반영",
      "퇴직 후 산재 발생 시에도 재직 중 사고라면 보상 가능",
    ],
  },
];

function formatDate(date: Date): string {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function getDDay(target: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function InsuranceLossGuidePage() {
  const [terminationDate, setTerminationDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(
    "employment_insurance",
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nomu_insurance_loss_checklist");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const toggleCheck = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    localStorage.setItem("nomu_insurance_loss_checklist", JSON.stringify(next));
  };

  const deadlines = terminationDate
    ? insuranceSections.map((s) => ({
        ...s,
        calculatedDate: s.calcDeadline(new Date(terminationDate)),
      }))
    : null;

  const completedCount = insuranceSections.filter((s) => checked[s.id]).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "4대보험 상실 신고 가이드" },
        ]}
      />
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        4대보험 상실 신고 가이드
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        직원 퇴직 시 반드시 처리해야 하는 4대보험 자격상실 신고 절차를
        안내합니다.
      </p>

      {/* 마감일 계산기 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">📅 신고 마감일 계산</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              퇴직일
            </label>
            <input
              type="date"
              className="input-field w-full"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>
        </div>

        {deadlines && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-2 px-3 font-medium">보험 종류</th>
                  <th className="text-left py-2 px-3 font-medium">
                    신고 마감일
                  </th>
                  <th className="text-left py-2 px-3 font-medium">남은 일수</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d) => {
                  const dday = getDDay(d.calculatedDate);
                  const isUrgent = dday <= 7 && dday >= 0;
                  const isOverdue = dday < 0;
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-[var(--border-color)]"
                    >
                      <td className="py-2 px-3">
                        {d.icon} {d.title}
                      </td>
                      <td className="py-2 px-3">
                        {formatDate(d.calculatedDate)}
                      </td>
                      <td className="py-2 px-3">
                        {d.id === "industrial_accident" ? (
                          <span className="text-[var(--text-light)]">
                            보수총액신고 시
                          </span>
                        ) : isOverdue ? (
                          <span className="text-red-600 font-semibold">
                            {Math.abs(dday)}일 초과!
                          </span>
                        ) : isUrgent ? (
                          <span className="text-orange-600 font-semibold">
                            D-{dday}
                          </span>
                        ) : (
                          <span className="text-green-600">D-{dday}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 진행률 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{
              width: `${(completedCount / insuranceSections.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
          {completedCount}/{insuranceSections.length} 완료
        </span>
      </div>

      {/* 이직확인서 경고 */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🚨</span>
          <div>
            <p className="font-semibold text-red-800 mb-1">
              이직확인서 미제출 시 과태료 최대 300만원
            </p>
            <p className="text-sm text-red-700">
              고용보험법 제118조에 따라, 사업주는 퇴직일로부터{" "}
              <strong>10일 이내</strong>에 이직확인서를 제출해야 합니다.
              실업급여 수급 가능 여부와 관계없이 모든 퇴직자에 대해 의무적으로
              제출해야 하며, 미제출 시 과태료가 부과됩니다.
            </p>
            <p className="text-sm text-red-700 mt-1">
              권고사직·정리해고의 경우 이직사유를 정확히 기재해야 퇴직자의
              실업급여 수급에 불이익이 없습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4대보험 섹션 아코디언 */}
      <div className="space-y-4">
        {insuranceSections.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <div
              key={section.id}
              className={`border rounded-xl overflow-hidden transition-colors ${
                section.highlight
                  ? "border-red-200 bg-red-50/30"
                  : "border-[var(--border-color)] bg-[var(--bg-card)]"
              }`}
            >
              {/* 헤더 */}
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!checked[section.id]}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleCheck(section.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded accent-green-600"
                  />
                  <span className="text-xl">{section.icon}</span>
                  <span
                    className={`font-semibold ${
                      checked[section.id]
                        ? "text-[var(--text-light)] line-through"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {section.title}
                  </span>
                  {section.highlight && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      중요
                    </span>
                  )}
                </div>
                <span
                  className={`text-[var(--text-light)] transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* 내용 */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* 신고기한 */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-800 mb-1">
                        📆 신고 기한
                      </p>
                      <p className="text-sm text-blue-700">
                        {section.deadline}
                      </p>
                    </div>

                    {/* 신고처 */}
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-purple-800 mb-1">
                        🖥️ 신고처
                      </p>
                      <a
                        href={section.portal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-700 underline hover:text-purple-900"
                      >
                        {section.portal.name} →
                      </a>
                    </div>
                  </div>

                  {/* 필요서류 */}
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                      📋 필요 서류
                    </p>
                    <ul className="space-y-1">
                      {section.requiredDocs.map((doc, i) => (
                        <li
                          key={i}
                          className="text-sm text-[var(--text-secondary)] flex gap-2"
                        >
                          <span className="text-green-500">✓</span> {doc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 주의사항 */}
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                      ⚠️ 주의사항
                    </p>
                    <ul className="space-y-1">
                      {section.cautions.map((c, i) => (
                        <li
                          key={i}
                          className="text-sm text-[var(--text-secondary)] flex gap-2"
                        >
                          <span className="text-amber-500">•</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 안내 */}
      <div className="mt-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">
          관련 서류 바로가기
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/documents/settlement"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg p-3"
          >
            📄 퇴직 통합 정산서
          </Link>
          <Link
            href="/documents/career-certificate"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg p-3"
          >
            📄 경력증명서
          </Link>
          <Link
            href="/terminate"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg p-3"
          >
            📋 퇴직 처리 워크플로우
          </Link>
          <Link
            href="/documents/termination-notice"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-lg p-3"
          >
            📄 해고통보서
          </Link>
        </div>
      </div>
    </div>
  );
}
