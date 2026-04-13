"use client";

import { useState, useCallback } from "react";
import { calculateComprehensiveWage } from "@/lib/calculations/comprehensive-wage";
import type {
  ComprehensiveWageInput,
  ComprehensiveWageResult,
} from "@/lib/calculations/comprehensive-wage";
import { MINIMUM_WAGE, WORK_HOUR_LIMITS } from "@/lib/constants";

const DEFAULT_INPUT: ComprehensiveWageInput = {
  totalMonthlyPay: 3000000,
  weeklyWorkHours: 48,
  weeklyWorkDays: 6,
  dailyWorkHours: 8,
  workStartTime: "09:00",
  workEndTime: "18:00",
  breakMinutes: 60,
  hasNightWork: false,
  nightBreakMinutes: 0,
};

/** 프리셋: 자주 사용하는 근무 형태 */
const PRESETS = [
  {
    label: "주 48시간 (주6일, 8시간)",
    weeklyWorkHours: 48,
    weeklyWorkDays: 6,
    dailyWorkHours: 8,
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakMinutes: 60,
  },
  {
    label: "주 44시간 (주5.5일)",
    weeklyWorkHours: 44,
    weeklyWorkDays: 6,
    dailyWorkHours: 8,
    workStartTime: "09:00",
    workEndTime: "18:00",
    breakMinutes: 60,
  },
  {
    label: "주 52시간 (법정 최대)",
    weeklyWorkHours: 52,
    weeklyWorkDays: 6,
    dailyWorkHours: 9,
    workStartTime: "08:00",
    workEndTime: "18:00",
    breakMinutes: 60,
  },
  {
    label: "야간 포함 (14:00~23:00)",
    weeklyWorkHours: 48,
    weeklyWorkDays: 6,
    dailyWorkHours: 8,
    workStartTime: "14:00",
    workEndTime: "23:00",
    breakMinutes: 60,
  },
  {
    label: "야간 전일 (22:00~07:00)",
    weeklyWorkHours: 40,
    weeklyWorkDays: 5,
    dailyWorkHours: 8,
    workStartTime: "22:00",
    workEndTime: "07:00",
    breakMinutes: 60,
  },
];

export default function ComprehensiveWagePage() {
  const [input, setInput] = useState<ComprehensiveWageInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<ComprehensiveWageResult | null>(null);

  const handleCalculate = useCallback(() => {
    try {
      const res = calculateComprehensiveWage(input);
      setResult(res);
    } catch (e) {
      alert(e instanceof Error ? e.message : "계산 중 오류가 발생했습니다.");
    }
  }, [input]);

  const applyPreset = useCallback((preset: (typeof PRESETS)[number]) => {
    const isNight =
      preset.workStartTime === "14:00" || preset.workStartTime === "22:00";
    setInput((prev) => ({
      ...prev,
      weeklyWorkHours: preset.weeklyWorkHours,
      weeklyWorkDays: preset.weeklyWorkDays,
      dailyWorkHours: preset.dailyWorkHours,
      workStartTime: preset.workStartTime,
      workEndTime: preset.workEndTime,
      breakMinutes: preset.breakMinutes,
      hasNightWork: isNight,
      nightBreakMinutes: 0,
    }));
    setResult(null);
  }, []);

  const updateField = useCallback(
    <K extends keyof ComprehensiveWageInput>(
      key: K,
      value: ComprehensiveWageInput[K],
    ) => {
      setInput((prev) => ({ ...prev, [key]: value }));
      setResult(null);
    },
    [],
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-1">포괄임금 설계 도구</h1>
      <p className="text-gray-600 text-sm mb-6">
        월 고정급을 기본급 · 연장수당 · 야간수당으로 자동 분개합니다 (포괄임금제
        실질유형)
      </p>

      {/* 프리셋 */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">빠른 설정</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-5">
        {/* 월 고정급 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            월 고정급 (세전)
          </label>
          <div className="relative">
            <input
              type="number"
              value={input.totalMonthlyPay}
              onChange={(e) =>
                updateField("totalMonthlyPay", Number(e.target.value))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-right text-lg font-semibold"
              min={0}
              step={10000}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              원
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            2026년 최저월급: {MINIMUM_WAGE.monthly.toLocaleString()}원 (시급{" "}
            {MINIMUM_WAGE.hourly.toLocaleString()}원 × 209시간)
          </p>
        </div>

        {/* 근로시간 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주당 근로시간
            </label>
            <div className="relative">
              <input
                type="number"
                value={input.weeklyWorkHours}
                onChange={(e) =>
                  updateField("weeklyWorkHours", Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-right"
                min={1}
                max={68}
                step={0.5}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                시간
              </span>
            </div>
            {input.weeklyWorkHours > WORK_HOUR_LIMITS.weeklyStandard && (
              <p className="text-xs text-orange-600 mt-1">
                연장 {input.weeklyWorkHours - WORK_HOUR_LIMITS.weeklyStandard}
                시간/주
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주당 근무일수
            </label>
            <select
              value={input.weeklyWorkDays}
              onChange={(e) =>
                updateField("weeklyWorkDays", Number(e.target.value))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {[4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d}일
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1일 근로시간
            </label>
            <div className="relative">
              <input
                type="number"
                value={input.dailyWorkHours}
                onChange={(e) =>
                  updateField("dailyWorkHours", Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-right"
                min={1}
                max={16}
                step={0.5}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                시간
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              출근시간
            </label>
            <input
              type="time"
              value={input.workStartTime}
              onChange={(e) => updateField("workStartTime", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              퇴근시간
            </label>
            <input
              type="time"
              value={input.workEndTime}
              onChange={(e) => updateField("workEndTime", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              휴게시간
            </label>
            <select
              value={input.breakMinutes}
              onChange={(e) =>
                updateField("breakMinutes", Number(e.target.value))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value={0}>없음</option>
              <option value={30}>30분</option>
              <option value={60}>60분 (1시간)</option>
              <option value={90}>90분</option>
              <option value={120}>120분 (2시간)</option>
            </select>
          </div>
        </div>

        {/* 야간근무 토글 */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">야간근무 포함</p>
              <p className="text-xs text-gray-500">
                22:00 ~ 06:00 시간대 근무가 있는 경우
              </p>
            </div>
            <button
              onClick={() => updateField("hasNightWork", !input.hasNightWork)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                input.hasNightWork ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  input.hasNightWork ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {input.hasNightWork && (
            <div className="ml-0 p-3 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    야간 휴게시간
                  </label>
                  <select
                    value={input.nightBreakMinutes || 0}
                    onChange={(e) =>
                      updateField("nightBreakMinutes", Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value={0}>없음</option>
                    <option value={15}>15분</option>
                    <option value={30}>30분</option>
                    <option value={45}>45분</option>
                    <option value={60}>60분</option>
                  </select>
                </div>
                <div className="flex-1 text-xs text-gray-500 pt-4">
                  야간시간대(22:00~06:00) 내 휴게시간은
                  <br />
                  야간근로에서 차감됩니다
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계산 버튼 */}
      <button
        onClick={handleCalculate}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors mb-6"
      >
        임금 역산 (분개) 계산
      </button>

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          {/* 경고 */}
          {result.validation.warnings.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-medium text-red-800 text-sm mb-2">
                법적 주의사항
              </p>
              {result.validation.warnings.map((w, i) => (
                <p key={i} className="text-sm text-red-700 mb-1">
                  • {w}
                </p>
              ))}
            </div>
          )}

          {/* 임금 분개 결과 */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
              <h2 className="font-semibold text-blue-900">임금 분개 결과</h2>
            </div>
            <div className="p-5 space-y-3">
              <ResultRow
                label="환산 시급"
                value={`${result.hourlyWage.toLocaleString()}원`}
                sublabel={`월 고정급 ÷ ${result.breakdown.totalEquivalentHours}시간`}
                highlight
              />
              <div className="border-t border-gray-100 pt-3">
                <ResultRow
                  label="기본급"
                  value={`${result.basePay.toLocaleString()}원`}
                  sublabel={`시급 × ${result.breakdown.monthlyStandardHours}시간 (소정근로)`}
                />
                {result.fixedOvertimePay > 0 && (
                  <ResultRow
                    label="고정 연장근로수당"
                    value={`${result.fixedOvertimePay.toLocaleString()}원`}
                    sublabel={`시급 × 1.5배 × ${result.breakdown.monthlyOvertimeHours}시간/월`}
                  />
                )}
                {result.fixedNightPay > 0 && (
                  <ResultRow
                    label="고정 야간근로수당"
                    value={`${result.fixedNightPay.toLocaleString()}원`}
                    sublabel={`시급 × 0.5배 × ${result.breakdown.monthlyNightHours}시간/월 (가산분)`}
                  />
                )}
              </div>
              <div className="border-t-2 border-gray-200 pt-3">
                <ResultRow
                  label="합계"
                  value={`${result.totalPay.toLocaleString()}원`}
                  highlight
                />
              </div>
            </div>
          </div>

          {/* 시간 분석 */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">시간 분석</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <TimeRow
                  label="월 소정근로시간"
                  value={`${result.breakdown.monthlyStandardHours}시간`}
                />
                <TimeRow
                  label="월 평균 주수"
                  value={`${result.breakdown.weeksPerMonth}주`}
                />
                {result.breakdown.weeklyOvertimeHours > 0 && (
                  <>
                    <TimeRow
                      label="주당 연장근로"
                      value={`${result.breakdown.weeklyOvertimeHours}시간`}
                      accent
                    />
                    <TimeRow
                      label="월 연장근로"
                      value={`${result.breakdown.monthlyOvertimeHours}시간`}
                      accent
                    />
                    <TimeRow
                      label="연장 환산 (×1.5)"
                      value={`${result.breakdown.overtimeEquivalentHours}시간`}
                      accent
                    />
                  </>
                )}
                {result.breakdown.dailyNightHours > 0 && (
                  <>
                    <TimeRow
                      label="일 야간근로"
                      value={`${result.breakdown.dailyNightHours}시간`}
                      accent
                    />
                    <TimeRow
                      label="주 야간근로"
                      value={`${result.breakdown.weeklyNightHours}시간`}
                      accent
                    />
                    <TimeRow
                      label="월 야간근로"
                      value={`${result.breakdown.monthlyNightHours}시간`}
                      accent
                    />
                    <TimeRow
                      label="야간 환산 (×0.5)"
                      value={`${result.breakdown.nightEquivalentHours}시간`}
                      accent
                    />
                    {result.breakdown.nightBreakMinutes > 0 && (
                      <TimeRow
                        label="야간 휴게시간"
                        value={`${result.breakdown.nightBreakMinutes}분/일`}
                      />
                    )}
                  </>
                )}
                <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                  <TimeRow
                    label="총 환산시간"
                    value={`${result.breakdown.totalEquivalentHours}시간`}
                    bold
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 검증 */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">법적 검증</h2>
            </div>
            <div className="p-5 space-y-2">
              <CheckItem
                label="최저임금 충족"
                ok={result.validation.meetsMinimumWage}
                detail={`환산 시급 ${result.validation.effectiveHourlyWage.toLocaleString()}원 ${
                  result.validation.meetsMinimumWage ? "≥" : "<"
                } 최저시급 ${result.validation.minimumHourlyWage.toLocaleString()}원`}
              />
              <CheckItem
                label="연장근로 한도 준수"
                ok={!result.validation.exceedsWeeklyOvertimeLimit}
                detail={`주당 연장 ${result.breakdown.weeklyOvertimeHours}시간 ${
                  !result.validation.exceedsWeeklyOvertimeLimit ? "≤" : ">"
                } 법정 한도 ${WORK_HOUR_LIMITS.weeklyOvertimeMax}시간`}
              />
            </div>
          </div>

          {/* 수식 설명 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-medium text-blue-900 mb-2 text-sm">
              계산 공식
            </h3>
            <div className="text-xs text-blue-800 space-y-1 font-mono">
              <p>
                총 환산시간 = 209{" "}
                {result.breakdown.overtimeEquivalentHours > 0
                  ? `+ ${result.breakdown.overtimeEquivalentHours}(연장)`
                  : ""}{" "}
                {result.breakdown.nightEquivalentHours > 0
                  ? `+ ${result.breakdown.nightEquivalentHours}(야간)`
                  : ""}{" "}
                = {result.breakdown.totalEquivalentHours}시간
              </p>
              <p>
                시급 = {input.totalMonthlyPay.toLocaleString()} ÷{" "}
                {result.breakdown.totalEquivalentHours} ={" "}
                {result.hourlyWage.toLocaleString()}원
              </p>
              <p>
                기본급 = {result.hourlyWage.toLocaleString()} × 209 ={" "}
                {(result.hourlyWage * 209).toLocaleString()}원
              </p>
              {result.fixedOvertimePay > 0 && (
                <p>
                  연장수당 = {result.hourlyWage.toLocaleString()} × 1.5 ×{" "}
                  {result.breakdown.monthlyOvertimeHours} ={" "}
                  {result.fixedOvertimePay.toLocaleString()}원
                </p>
              )}
              {result.fixedNightPay > 0 && (
                <p>
                  야간수당 = {result.hourlyWage.toLocaleString()} × 0.5 ×{" "}
                  {result.breakdown.monthlyNightHours} ={" "}
                  {result.fixedNightPay.toLocaleString()}원
                </p>
              )}
            </div>
          </div>

          {/* 안내 */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 space-y-1">
            <p className="font-medium text-gray-700 mb-1">
              포괄임금제 유의사항
            </p>
            <p>
              • 포괄임금 약정이 유효하려면 ① 감시·단속적 근로 등 근로시간 산정이
              어려운 경우, 또는 ② 근로자에게 불이익이 없고 제반 사정에 비추어
              정당한 경우여야 합니다 (대법원 2010다5806).
            </p>
            <p>
              • 근로계약서에 기본급, 연장수당, 야간수당의 금액과 산정 기준을
              명시해야 합니다.
            </p>
            <p>• 역산된 시급이 최저임금 이상이어야 합니다.</p>
            <p>
              • 실제 연장근로가 포괄산정 시간을 초과하면 추가 수당을 지급해야
              합니다.
            </p>
            <p>
              • 본 계산은 참고용이며, 정확한 적용은 노무사와 상담하시기
              바랍니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 서브 컴포넌트
// ============================================

function ResultRow({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${highlight ? "font-semibold" : ""}`}
    >
      <div>
        <span
          className={`text-sm ${highlight ? "text-blue-900" : "text-gray-700"}`}
        >
          {label}
        </span>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
      <span
        className={`text-sm ${highlight ? "text-blue-900 text-base" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

function TimeRow({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent?: boolean;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between py-0.5 ${bold ? "font-semibold" : ""}`}
    >
      <span className={`${accent ? "text-orange-700" : "text-gray-600"}`}>
        {label}
      </span>
      <span
        className={`${accent ? "text-orange-700 font-medium" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

function CheckItem({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`text-sm mt-0.5 ${ok ? "text-green-600" : "text-red-600"}`}
      >
        {ok ? "✓" : "✗"}
      </span>
      <div>
        <p
          className={`text-sm font-medium ${ok ? "text-green-800" : "text-red-800"}`}
        >
          {label}
        </p>
        <p className="text-xs text-gray-600">{detail}</p>
      </div>
    </div>
  );
}
