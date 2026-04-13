"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import {
  simulateConversion,
  type ConversionResult,
} from "@/lib/calculations/conversion-simulation";
import { calculateAnnualLeave } from "@/lib/calculations/annual-leave";
import { MINIMUM_WAGE } from "@/lib/constants";
import { formatCurrency } from "@/lib/storage";
import Breadcrumb from "@/components/Breadcrumb";
import HelpGuide from "@/components/HelpGuide";

const WORK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function ConvertPage() {
  const { loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const fulltimeActive = allEmployees.filter(
    (e) => e.employmentType === "fulltime" && e.status === "active",
  );

  const [step, setStep] = useState(1);
  const [selId, setSelId] = useState("");
  const [newWeeklyHours, setNewWeeklyHours] = useState(20);
  const [newWorkDays, setNewWorkDays] = useState<string[]>(["월", "수", "금"]);
  const [newHourlyWage, setNewHourlyWage] = useState(MINIMUM_WAGE.hourly);
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [usedLeaveDays, setUsedLeaveDays] = useState(0);
  const [leaveSettlement, setLeaveSettlement] = useState<
    "cash" | "carry" | "none"
  >("cash");
  const [manualSalary, setManualSalary] = useState(0);
  const [manualWeeklyHours, setManualWeeklyHours] = useState(40);

  const selectedEmp = fulltimeActive.find((e) => e.id === selId);

  const currentSalary = selectedEmp?.salary?.baseSalary || manualSalary;
  const currentWeeklyHours =
    selectedEmp?.workCondition?.weeklyHours || manualWeeklyHours;
  const nonTaxable = selectedEmp
    ? (selectedEmp.salary?.mealAllowance || 0) +
      (selectedEmp.salary?.carAllowance || 0)
    : 0;

  const result: ConversionResult | null = useMemo(() => {
    if (!currentSalary || !newWeeklyHours || !newHourlyWage) return null;
    return simulateConversion(
      currentSalary,
      currentWeeklyHours,
      newWeeklyHours,
      newHourlyWage,
      nonTaxable,
    );
  }, [
    currentSalary,
    currentWeeklyHours,
    newWeeklyHours,
    newHourlyWage,
    nonTaxable,
  ]);

  // 미사용 연차 정산 계산
  const annualLeaveInfo = useMemo(() => {
    const hireDate = selectedEmp?.hireDate;
    if (!hireDate) return null;
    const targetYear = new Date(effectiveDate).getFullYear();
    const leave = calculateAnnualLeave(hireDate, targetYear, "hire_date");
    const unusedDays = Math.max(0, leave.totalDays - usedLeaveDays);
    // 일평균임금 = 월급 / 30
    const dailyWage = currentSalary / 30;
    const settlementAmount = Math.round(unusedDays * dailyWage);
    return {
      totalDays: leave.totalDays,
      unusedDays,
      dailyWage,
      settlementAmount,
    };
  }, [selectedEmp?.hireDate, effectiveDate, usedLeaveDays, currentSalary]);

  const toggleDay = (day: string) => {
    setNewWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  if (companyLoading || employeesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-[var(--text-secondary)]">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "근로형태 전환" },
        ]}
      />
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
        근로형태 전환 (풀타임 → 파트타임)
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        정규직 근로자를 파트타임으로 전환할 때 필요한 비교 분석과 서류를 한 번에
        처리합니다.
      </p>

      <HelpGuide
        pageKey="convert"
        steps={[
          "정규직 ↔ 파트타임 전환 시 필요한 서류와 절차를 안내합니다.",
          "전환 전후의 급여, 근로시간, 4대보험 변경 사항을 확인하세요.",
          "전환 합의서를 출력하여 근로자의 서면 동의를 반드시 받으세요.",
        ]}
      />

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        {["직원 선택", "새 조건", "비교 분석", "서류 생성", "요약"].map(
          (label, idx) => {
            const s = idx + 1;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <button
                key={s}
                onClick={() => {
                  if (s < step || (s === 2 && selId) || s <= step) setStep(s);
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : isDone
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? "✓" : s}. {label}
              </button>
            );
          },
        )}
      </div>

      {/* Step 1: 직원 선택 */}
      {step === 1 && (
        <div className="form-section">
          <h3 className="form-section-title">👤 전환 대상 직원 선택</h3>
          {fulltimeActive.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              정규직(재직 중) 직원이 없습니다. 직원을 먼저 등록해주세요.
            </p>
          ) : (
            <div className="space-y-3">
              {fulltimeActive.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelId(emp.id);
                    setStep(2);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selId === emp.id
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-indigo-300"
                  }`}
                >
                  <p className="font-medium">
                    {emp.info.name}{" "}
                    <span className="text-xs text-[var(--text-light)]">
                      {emp.department} {emp.position}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    월급 {formatCurrency(emp.salary?.baseSalary || 0)} · 주{" "}
                    {emp.workCondition?.weeklyHours || 40}시간
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 수동 입력 모드 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-3">또는 직접 입력</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label text-xs">현재 월급</label>
                <input
                  type="number"
                  className="input-field"
                  value={manualSalary || ""}
                  onChange={(e) => {
                    setSelId("");
                    setManualSalary(Number(e.target.value));
                  }}
                  placeholder="현재 월 기본급"
                />
              </div>
              <div>
                <label className="input-label text-xs">
                  현재 주당 근무시간
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={manualWeeklyHours}
                  onChange={(e) => {
                    setManualWeeklyHours(Number(e.target.value) || 40);
                  }}
                />
              </div>
            </div>
            {!selId && manualSalary > 0 && (
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary mt-3 text-sm"
              >
                다음 →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: 새 근무조건 */}
      {step === 2 && (
        <div className="form-section">
          <h3 className="form-section-title">⏰ 새 근무 조건</h3>
          <div className="space-y-4">
            <div>
              <label className="input-label">전환 시행일</label>
              <input
                type="date"
                className="input-field"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">주당 근무시간</label>
              <input
                type="number"
                className="input-field"
                value={newWeeklyHours}
                onChange={(e) =>
                  setNewWeeklyHours(parseInt(e.target.value) || 0)
                }
                min={1}
                max={40}
              />
              {newWeeklyHours < 15 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ 주 15시간 미만: 주휴수당 미적용, 4대보험 가입의무 면제 가능
                </p>
              )}
            </div>
            <div>
              <label className="input-label">근무 요일</label>
              <div className="flex gap-2 mt-1">
                {WORK_DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium border transition-colors ${
                      newWorkDays.includes(d)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="input-label">시급</label>
              <input
                type="number"
                className="input-field"
                value={newHourlyWage}
                onChange={(e) =>
                  setNewHourlyWage(parseInt(e.target.value) || 0)
                }
              />
              {newHourlyWage < MINIMUM_WAGE.hourly && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ 2026년 최저임금({MINIMUM_WAGE.hourly.toLocaleString()}원)
                  미만
                </p>
              )}
            </div>
          </div>

          {/* 미사용 연차 정산 */}
          {annualLeaveInfo && annualLeaveInfo.totalDays > 0 && (
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3">
                연차유급휴가 정산 (근로기준법 제60조)
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="input-label text-xs">발생 연차일수</label>
                  <p className="text-sm font-medium">
                    {annualLeaveInfo.totalDays}일
                  </p>
                </div>
                <div>
                  <label className="input-label text-xs">사용한 연차일수</label>
                  <input
                    type="number"
                    className="input-field"
                    value={usedLeaveDays}
                    onChange={(e) =>
                      setUsedLeaveDays(
                        Math.max(
                          0,
                          Math.min(
                            parseInt(e.target.value) || 0,
                            annualLeaveInfo.totalDays,
                          ),
                        ),
                      )
                    }
                    min={0}
                    max={annualLeaveInfo.totalDays}
                  />
                </div>
              </div>
              {annualLeaveInfo.unusedDays > 0 && (
                <>
                  <div className="text-sm mb-2">
                    <span className="text-indigo-700 dark:text-indigo-300">
                      미사용 연차:{" "}
                    </span>
                    <strong>{annualLeaveInfo.unusedDays}일</strong>
                    <span className="text-indigo-600 dark:text-indigo-400 ml-2">
                      (수당 환산:{" "}
                      {formatCurrency(annualLeaveInfo.settlementAmount)})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      {
                        value: "cash" as const,
                        label: "현금 정산",
                        desc: "전환일에 수당으로 지급",
                      },
                      {
                        value: "carry" as const,
                        label: "이월",
                        desc: "파트타임으로 잔여 연차 이월",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLeaveSettlement(opt.value)}
                        className={`flex-1 p-2 rounded-lg text-xs font-medium border transition-colors ${
                          leaveSettlement === opt.value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]"
                        }`}
                      >
                        <p className="font-semibold">{opt.label}</p>
                        <p
                          className={
                            leaveSettlement === opt.value
                              ? "text-indigo-200"
                              : "text-[var(--text-light)]"
                          }
                        >
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              ← 이전
            </button>
            <button
              onClick={() => setStep(3)}
              className="btn btn-primary"
              disabled={!newWeeklyHours || !newHourlyWage}
            >
              비교 분석 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Before/After 비교 */}
      {step === 3 && result && (
        <div className="space-y-6">
          <div className="form-section">
            <h3 className="form-section-title">📊 전환 전/후 비교</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--border-color)]">
                    <th className="py-2 px-3 text-left">항목</th>
                    <th className="py-2 px-3 text-right">전환 전 (정규직)</th>
                    <th className="py-2 px-3 text-right">전환 후 (파트타임)</th>
                    <th className="py-2 px-3 text-right">차이</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">주당 근무시간</td>
                    <td className="py-2 px-3 text-right">
                      {result.before.weeklyHours}시간
                    </td>
                    <td className="py-2 px-3 text-right">
                      {result.after.weeklyHours}시간
                    </td>
                    <td className="py-2 px-3 text-right text-red-500">
                      {result.after.weeklyHours - result.before.weeklyHours}시간
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">월 환산시간</td>
                    <td className="py-2 px-3 text-right">
                      {result.before.monthlyHours}시간
                    </td>
                    <td className="py-2 px-3 text-right">
                      {result.after.monthlyHours}시간
                    </td>
                    <td className="py-2 px-3 text-right text-red-500">
                      {result.after.monthlyHours - result.before.monthlyHours}
                      시간
                    </td>
                  </tr>
                  <tr className="border-b bg-yellow-50">
                    <td className="py-2 px-3 font-bold">월 급여</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatCurrency(result.before.monthlySalary)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatCurrency(result.after.monthlySalary)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">
                      {formatCurrency(result.diff.salaryChange)} (
                      {result.diff.salaryChangePercent}%)
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">4대보험 (근로자)</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.before.insurance.total)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.after.insurance.total)}
                    </td>
                    <td className="py-2 px-3 text-right text-green-600">
                      {formatCurrency(result.diff.insuranceChange)}
                    </td>
                  </tr>
                  <tr className="border-b bg-blue-50">
                    <td className="py-2 px-3 font-bold">실수령액</td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatCurrency(result.before.netPay)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatCurrency(result.after.netPay)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-red-600">
                      {formatCurrency(result.diff.netPayChange)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3 font-medium">주휴수당</td>
                    <td className="py-2 px-3 text-right">포함</td>
                    <td className="py-2 px-3 text-right">
                      {result.after.hasWeeklyAllowance ? "포함" : "미적용"}
                    </td>
                    <td className="py-2 px-3 text-right">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4대보험 상세 */}
          <div className="form-section">
            <h3 className="form-section-title">🏥 4대보험 상세 비교</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="py-2 px-3 text-left">보험</th>
                    <th className="py-2 px-3 text-right">전환 전</th>
                    <th className="py-2 px-3 text-right">전환 후</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">국민연금</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.before.insurance.nationalPension)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.after.insurance.nationalPension)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">건강보험</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.before.insurance.healthInsurance)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.after.insurance.healthInsurance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">장기요양</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.before.insurance.longTermCare)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(result.after.insurance.longTermCare)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">고용보험</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(
                        result.before.insurance.employmentInsurance,
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(
                        result.after.insurance.employmentInsurance,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 연차 정산 요약 */}
          {annualLeaveInfo &&
            annualLeaveInfo.unusedDays > 0 &&
            leaveSettlement === "cash" && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h4 className="font-medium text-indigo-900 text-sm mb-2">
                  연차유급휴가 정산
                </h4>
                <div className="text-sm text-indigo-700 space-y-1">
                  <p>
                    미사용 연차: <strong>{annualLeaveInfo.unusedDays}일</strong>{" "}
                    (발생 {annualLeaveInfo.totalDays}일 - 사용 {usedLeaveDays}
                    일)
                  </p>
                  <p>
                    1일 평균임금:{" "}
                    {formatCurrency(Math.round(annualLeaveInfo.dailyWage))}
                  </p>
                  <p className="text-base font-bold text-indigo-900">
                    연차수당 지급액:{" "}
                    {formatCurrency(annualLeaveInfo.settlementAmount)}
                  </p>
                </div>
                <p className="text-xs text-indigo-500 mt-2">
                  ※ 근로형태 전환 시 기존 미사용 연차를 현금 정산합니다. 전환일
                  급여에 포함하여 지급하세요.
                </p>
              </div>
            )}

          {/* 경고 */}
          {result.warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">
                  ⚠️ {w}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn btn-secondary">
              ← 조건 수정
            </button>
            <button onClick={() => setStep(4)} className="btn btn-primary">
              서류 생성 →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 서류 생성 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="form-section">
            <h3 className="form-section-title">📄 필요 서류</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              아래 서류를 순서대로 작성하세요.
            </p>
            <div className="space-y-3">
              <Link
                href="/documents/work-hours-change"
                className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-color)] hover:border-indigo-400 bg-[var(--bg-card)] transition-all"
              >
                <span className="text-2xl">📝</span>
                <div>
                  <p className="font-medium">1. 근무시간변경합의서</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    사업주와 근로자 간 근로조건 변경 합의
                  </p>
                </div>
              </Link>
              <Link
                href="/contract/parttime"
                className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-color)] hover:border-indigo-400 bg-[var(--bg-card)] transition-all"
              >
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-medium">2. 파트타임 근로계약서</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    새 근로조건이 반영된 계약서 작성
                  </p>
                </div>
              </Link>
              <Link
                href="/guide/insurance-loss"
                className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-color)] hover:border-indigo-400 bg-[var(--bg-card)] transition-all"
              >
                <span className="text-2xl">🏥</span>
                <div>
                  <p className="font-medium">3. 4대보험 변경 안내</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    보수월액 변경 신고 (건강보험공단 EDI)
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
            <strong>참고:</strong> 근로조건 불이익 변경은 근로자의 동의가
            필요합니다 (근로기준법 제94조). 합의서에 근로자 서명을 반드시
            받으세요.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn btn-secondary">
              ← 이전
            </button>
            <button onClick={() => setStep(5)} className="btn btn-primary">
              요약 →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: 요약 */}
      {step === 5 && result && (
        <div className="form-section">
          <h3 className="form-section-title">✅ 전환 요약</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">대상 직원</span>
              <span className="font-medium">
                {selectedEmp?.info.name || "수동 입력"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">전환 시행일</span>
              <span className="font-medium">{effectiveDate}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">근무형태</span>
              <span className="font-medium">정규직 → 파트타임</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">
                주당 근무시간
              </span>
              <span className="font-medium">
                {result.before.weeklyHours}h → {result.after.weeklyHours}h
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">근무 요일</span>
              <span className="font-medium">{newWorkDays.join(", ")}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">시급</span>
              <span className="font-medium">
                {formatCurrency(newHourlyWage)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">월 급여 변화</span>
              <span className="font-medium text-red-600">
                {formatCurrency(result.before.monthlySalary)} →{" "}
                {formatCurrency(result.after.monthlySalary)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-[var(--text-secondary)]">
                실수령액 변화
              </span>
              <span className="font-medium text-red-600">
                {formatCurrency(result.before.netPay)} →{" "}
                {formatCurrency(result.after.netPay)}
              </span>
            </div>
            {annualLeaveInfo && annualLeaveInfo.unusedDays > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">
                  미사용 연차 정산
                </span>
                <span className="font-medium text-indigo-600">
                  {leaveSettlement === "cash"
                    ? `${annualLeaveInfo.unusedDays}일 → ${formatCurrency(annualLeaveInfo.settlementAmount)} 지급`
                    : `${annualLeaveInfo.unusedDays}일 이월`}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              처음부터
            </button>
            <button onClick={() => window.print()} className="btn btn-primary">
              🖨️ 요약 인쇄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
