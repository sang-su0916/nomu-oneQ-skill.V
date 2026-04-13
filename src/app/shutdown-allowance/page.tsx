"use client";

import { useState, useMemo } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import HelpGuide from "@/components/HelpGuide";

function formatWon(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

type ShutdownType = "full" | "partial";

export default function ShutdownAllowancePage() {
  const [monthlySalary, setMonthlySalary] = useState(3000000);
  const [shutdownDays, setShutdownDays] = useState(10);
  const [totalWorkDays, setTotalWorkDays] = useState(22);
  const [shutdownType, setShutdownType] = useState<ShutdownType>("full");
  const [partialHours, setPartialHours] = useState(4);
  const [dailyHours, setDailyHours] = useState(8);

  const result = useMemo(() => {
    // 통상임금 기반 1일 임금: 월 통상임금 ÷ 월 소정근로일수
    const dailyOrdinaryWage =
      totalWorkDays > 0 ? monthlySalary / totalWorkDays : 0;
    // 평균임금 기반 1일 임금: 월급 ÷ 30
    const dailyAverageWage = monthlySalary / 30;
    // 법정 기준: 평균임금의 70% (근기법 제46조)
    const dailyAllowance70 = Math.round(dailyAverageWage * 0.7);
    const dailyAllowance100 = Math.round(dailyAverageWage);

    let totalAllowance70: number;
    let totalAllowance100: number;
    let description: string;

    if (shutdownType === "full") {
      // 전일 휴업
      totalAllowance70 = dailyAllowance70 * shutdownDays;
      totalAllowance100 = dailyAllowance100 * shutdownDays;
      description = `전일 휴업 ${shutdownDays}일`;
    } else {
      // 단축 근무 (일부 휴업)
      // 일부 휴업: 실 근로시간 비례 임금이 평균임금의 70% 미만이면 70%까지 보전
      const workedRatio = dailyHours > 0 ? partialHours / dailyHours : 0;
      const earnedPerDay = Math.round(dailyAverageWage * workedRatio);
      const shortfall = Math.max(0, dailyAllowance70 - earnedPerDay);
      totalAllowance70 = shortfall * shutdownDays;
      totalAllowance100 = (dailyAllowance100 - earnedPerDay) * shutdownDays;
      description = `단축근무 ${shutdownDays}일 (${partialHours}h/${dailyHours}h)`;
    }

    return {
      dailyAverageWage,
      dailyOrdinaryWage,
      dailyAllowance70,
      dailyAllowance100,
      totalAllowance70: Math.max(0, totalAllowance70),
      totalAllowance100: Math.max(0, totalAllowance100),
      description,
    };
  }, [
    monthlySalary,
    shutdownDays,
    totalWorkDays,
    shutdownType,
    partialHours,
    dailyHours,
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "휴업수당 계산기" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          휴업수당 계산기
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          근로기준법 제46조 · 사용자 귀책사유 휴업 시 지급 의무
        </p>
      </div>

      <HelpGuide
        pageKey="shutdown-allowance"
        steps={[
          "사업주 사정으로 직원을 쉬게 할 때(휴업), 평균임금의 70% 이상을 지급해야 합니다.",
          "직원의 최근 3개월 급여와 휴업일수를 입력하면 휴업수당이 자동 계산됩니다.",
          "천재지변 등 불가항력 사유에 의한 휴업은 대상이 아닙니다.",
        ]}
      />

      {/* 법적 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-blue-800 mb-2">휴업수당이란?</p>
        <p className="text-sm text-blue-700">
          사용자의 귀책사유(경영 악화, 자재 부족, 기계 고장 등)로 휴업하는 경우,
          근로자에게 <strong>평균임금의 70% 이상</strong>을 휴업수당으로
          지급해야 합니다.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          ※ 천재지변, 전염병 등 불가항력 사유는 휴업수당 지급 의무가 면제될 수
          있습니다.
        </p>
      </div>

      {/* 입력 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 mb-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">
            월 통상임금 (기본급 + 고정수당)
          </label>
          <div className="relative">
            <input
              type="number"
              value={monthlySalary || ""}
              onChange={(e) => setMonthlySalary(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="3000000"
              min={0}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
              원
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            기본급 + 식대 + 직책수당 등 고정적으로 매월 지급하는 금액
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              월 소정근로일수
            </label>
            <input
              type="number"
              value={totalWorkDays || ""}
              onChange={(e) => setTotalWorkDays(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              min={1}
              max={31}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              휴업 일수
            </label>
            <input
              type="number"
              value={shutdownDays || ""}
              onChange={(e) => setShutdownDays(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              min={1}
              max={31}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            휴업 유형
          </label>
          <div className="flex gap-3">
            {[
              {
                value: "full" as const,
                label: "전일 휴업",
                desc: "하루 종일 쉬는 경우",
              },
              {
                value: "partial" as const,
                label: "단축 근무 (일부 휴업)",
                desc: "일부 시간만 근무하는 경우",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setShutdownType(opt.value)}
                className={`flex-1 p-3 rounded-lg text-sm border transition-colors ${
                  shutdownType === opt.value
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p
                  className={`text-xs mt-1 ${shutdownType === opt.value ? "text-white/70" : "text-[var(--text-muted)]"}`}
                >
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {shutdownType === "partial" && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--bg)] rounded-lg">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                1일 소정근로시간
              </label>
              <input
                type="number"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                min={1}
                max={12}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                보통 8시간
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                실제 근무시간
              </label>
              <input
                type="number"
                value={partialHours}
                onChange={(e) => setPartialHours(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                min={0}
                max={dailyHours}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                단축 후 실제 근무한 시간
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 결과 */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-bold text-[var(--text)] mb-4 flex items-center gap-1.5">
          <span className="text-base">💰</span> 계산 결과
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              1일 평균임금 (월급 ÷ 30)
            </span>
            <span className="font-medium text-[var(--text)]">
              {formatWon(result.dailyAverageWage)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">
              1일 휴업수당 (평균임금의 70%)
            </span>
            <span className="font-medium text-[var(--text)]">
              {formatWon(result.dailyAllowance70)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">휴업 유형</span>
            <span className="font-medium text-[var(--text)]">
              {result.description}
            </span>
          </div>

          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text)]">
                법정 최소 지급액 (70%)
              </span>
              <span className="font-bold text-[var(--primary)] text-xl">
                {formatWon(result.totalAllowance70)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-[var(--text-muted)]">
                100% 지급 시 (참고)
              </span>
              <span className="text-sm font-medium text-[var(--text)]">
                {formatWon(result.totalAllowance100)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 안내사항 */}
      <div className="space-y-3 mb-6">
        <details className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <summary className="font-semibold text-sm text-[var(--text)] cursor-pointer">
            휴업수당 지급 기준 상세
          </summary>
          <div className="mt-3 text-sm text-[var(--text-muted)] space-y-2">
            <p>
              <strong>전일 휴업:</strong> 1일 평균임금의 70% 이상을 휴업수당으로
              지급합니다.
            </p>
            <p>
              <strong>일부 휴업 (단축 근무):</strong> 실제 근로한 시간에 비례한
              임금이 평균임금의 70%에 미달하면, 그 차액을 휴업수당으로
              보전합니다.
            </p>
            <p>
              <strong>지급 시기:</strong> 통상 임금 지급일에 함께 지급합니다.
            </p>
            <p>
              <strong>미지급 시:</strong> 3년 이하 징역 또는 3천만원 이하 벌금
              (근로기준법 제109조)
            </p>
          </div>
        </details>

        <details className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <summary className="font-semibold text-sm text-[var(--text)] cursor-pointer">
            휴업수당 지급 의무가 면제되는 경우
          </summary>
          <div className="mt-3 text-sm text-[var(--text-muted)] space-y-2">
            <p>
              다음의 <strong>불가항력</strong> 사유에 해당하면 휴업수당 지급
              의무가 면제됩니다:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>천재지변 (태풍, 지진, 홍수 등)</li>
              <li>전염병 확산에 따른 행정명령</li>
              <li>전쟁, 내란 등 사회적 재난</li>
              <li>법령에 의한 영업 정지</li>
            </ul>
            <p className="mt-2">
              다만, <strong>경영 악화, 주문 감소, 자재 부족</strong> 등은 사용자
              귀책사유에 해당하여 휴업수당을 지급해야 합니다.
            </p>
          </div>
        </details>

        <details className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
          <summary className="font-semibold text-sm text-[var(--text)] cursor-pointer">
            고용유지지원금 안내
          </summary>
          <div className="mt-3 text-sm text-[var(--text-muted)] space-y-2">
            <p>
              경영 악화로 휴업을 실시하는 경우 <strong>고용유지지원금</strong>을
              신청할 수 있습니다.
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>지원금액: 휴업수당의 2/3 (대규모 기업은 1/2)</li>
              <li>지원기간: 최대 180일/년</li>
              <li>신청: 고용보험 홈페이지 또는 관할 고용센터</li>
            </ul>
            <p className="mt-2">
              <a
                href="https://www.ei.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                고용보험 홈페이지 (ei.go.kr)
              </a>
              에서 온라인 신청이 가능합니다.
            </p>
          </div>
        </details>
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        ※ 평균임금 = 산정사유 발생일 이전 3개월간 지급된 임금 총액 ÷ 총 일수
        (간이 계산: 월급 ÷ 30)
      </p>

      <LegalDisclaimer compact />
    </div>
  );
}
