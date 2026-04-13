"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  calculateSeverancePay,
  formatSeveranceAmount,
} from "@/lib/calculations/severance-pay";
import { checkMinimumWageViolation } from "@/lib/minimum-wage-validator";
import { formatNumberInput, parseNumberInput } from "@/lib/storage";
import type {
  MonthlyWage,
  SeveranceResult,
  WageArrearsPeriod,
} from "@/types/severance";
import type { DbEmployee } from "@/types/database";
import Breadcrumb from "@/components/Breadcrumb";
import InfoTooltip from "@/components/InfoTooltip";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import HelpGuide from "@/components/HelpGuide";

interface EmployeeWithPayments extends DbEmployee {
  payments?: {
    year: number;
    month: number;
    base_salary: number;
    bonus: number;
    meal_allowance: number;
    car_allowance: number;
    overtime_pay: number;
  }[];
}

type RetirementReason =
  | "voluntary"
  | "recommended"
  | "retirement_age"
  | "other";

const RETIREMENT_REASONS: { value: RetirementReason; label: string }[] = [
  { value: "voluntary", label: "자발적 퇴사" },
  { value: "recommended", label: "권고사직" },
  { value: "retirement_age", label: "정년퇴직" },
  { value: "other", label: "기타" },
];

export default function SeveranceCalculatorPage() {
  const { user, company, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [employees, setEmployees] = useState<EmployeeWithPayments[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [retirementDate, setRetirementDate] = useState<string>("");
  const [retirementReason, setRetirementReason] =
    useState<RetirementReason>("voluntary");
  const [isMidTermSettlement, setIsMidTermSettlement] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [calculationResult, setCalculationResult] =
    useState<SeveranceResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [weeklyWorkingHours, setWeeklyWorkingHours] = useState<number>(40);
  const [wageArrearsPeriods, setWageArrearsPeriods] = useState<
    WageArrearsPeriod[]
  >([]);
  const [minimumWageWarning, setMinimumWageWarning] = useState<string | null>(
    null,
  );
  const [showArrearsInput, setShowArrearsInput] = useState(false);

  // 직접 입력 모드 (로그인 사용자용)
  const [inputMode, setInputMode] = useState<"employee" | "manual">("employee");
  const [manualHireDate, setManualHireDate] = useState("");
  const [manualBaseSalary, setManualBaseSalary] = useState(0);
  const [manualFixedAllowances, setManualFixedAllowances] = useState(0);
  const [manualBonus, setManualBonus] = useState(0);
  const [manualOvertimePay, setManualOvertimePay] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user || !company) return;

    loadEmployees();
  }, [user, company, loading]);

  const loadEmployees = async () => {
    if (!company) return;

    const { data: employeesData } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", company.id)
      .order("name");

    if (employeesData) {
      setEmployees(employeesData as EmployeeWithPayments[]);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const calculateServiceYears = (
    hireDate: string,
    retireDate: string,
  ): number => {
    const start = new Date(hireDate);
    const end = new Date(retireDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.floor((diffTime / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;
  };

  const effectiveHireDate =
    inputMode === "employee" && selectedEmployee
      ? selectedEmployee.hire_date
      : inputMode === "manual"
        ? manualHireDate
        : "";

  const canUseMidTermSettlement =
    effectiveHireDate && retirementDate
      ? calculateServiceYears(effectiveHireDate, retirementDate) >= 1
      : false;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (inputMode === "employee") {
      if (!selectedEmployeeId) {
        errors.employee = "직원을 선택해주세요.";
      }
    } else {
      if (!manualHireDate) {
        errors.manualHireDate = "입사일을 입력해주세요.";
      }
      if (!manualBaseSalary) {
        errors.manualSalary = "기본급을 입력해주세요.";
      }
    }

    if (!retirementDate) {
      errors.retirementDate = "퇴직일을 선택해주세요.";
    } else {
      const retireDate = new Date(retirementDate);
      const today = new Date();
      if (retireDate > today) {
        errors.retirementDate = "퇴직일은 오늘 이후일 수 없습니다.";
      }

      const hireDate =
        inputMode === "employee" && selectedEmployee
          ? new Date(selectedEmployee.hire_date)
          : inputMode === "manual" && manualHireDate
            ? new Date(manualHireDate)
            : null;
      if (hireDate && retireDate < hireDate) {
        errors.retirementDate = "퇴직일은 입사일보다 빠를 수 없습니다.";
      }
    }

    if (isMidTermSettlement && !canUseMidTermSettlement) {
      errors.midTerm = "중간정산은 1년 이상 근속자만 가능합니다.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchLastThreeMonthsPayments = async (
    employeeId: string,
    endDate: Date,
  ): Promise<MonthlyWage[]> => {
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;

    const months: { year: number; month: number }[] = [];
    for (let i = 0; i < 3; i++) {
      let m = endMonth - i;
      let y = endYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      months.push({ year: y, month: m });
    }

    // 정확한 (year, month) 조합으로 필터링 (교차 매칭 방지)
    const orFilter = months
      .map((m) => `and(year.eq.${m.year},month.eq.${m.month})`)
      .join(",");
    const { data: payments } = await supabase
      .from("payment_records")
      .select("*")
      .eq("employee_id", employeeId)
      .or(orFilter)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (!payments || payments.length < 3) {
      throw new Error(
        "퇴직일 이전 3개월간의 급여 데이터가 부족합니다. 급여대장을 먼저 작성해주세요.",
      );
    }

    return payments.slice(0, 3).map((p) => ({
      baseSalary: p.earnings?.base_salary || 0,
      fixedAllowances:
        (p.earnings?.meal_allowance || 0) + (p.earnings?.car_allowance || 0),
      bonus: p.earnings?.bonus || 0,
      overtimePay: p.earnings?.overtime || 0,
      nonTaxable:
        (p.earnings?.meal_allowance || 0) +
        (p.earnings?.car_allowance || 0) +
        (p.earnings?.childcare_allowance || 0) +
        (p.earnings?.research_allowance || 0),
    }));
  };

  const handleCalculate = async () => {
    if (!validateForm()) return;
    if (inputMode === "employee" && !selectedEmployee) return;
    if (inputMode === "manual" && (!manualHireDate || !manualBaseSalary))
      return;

    setIsCalculating(true);
    setError(null);
    setCalculationResult(null);
    setMinimumWageWarning(null);

    try {
      let lastThreeMonthsWages: MonthlyWage[];
      let startDate: Date;
      let employeeId: string;

      if (inputMode === "employee" && selectedEmployee) {
        lastThreeMonthsWages = await fetchLastThreeMonthsPayments(
          selectedEmployee.id,
          new Date(retirementDate),
        );
        startDate = new Date(selectedEmployee.hire_date);
        employeeId = selectedEmployee.id;
      } else {
        // 직접 입력 모드
        const manualWage: MonthlyWage = {
          baseSalary: manualBaseSalary,
          fixedAllowances: manualFixedAllowances,
          bonus: manualBonus,
          overtimePay: manualOvertimePay,
          nonTaxable: 0,
        };
        lastThreeMonthsWages = [manualWage, manualWage, manualWage];
        startDate = new Date(manualHireDate);
        employeeId = "manual";
      }

      const totalMonthlyWage =
        lastThreeMonthsWages.reduce(
          (sum, w) => sum + w.baseSalary + w.fixedAllowances,
          0,
        ) / lastThreeMonthsWages.length;

      const wageCheck = checkMinimumWageViolation(
        totalMonthlyWage,
        weeklyWorkingHours,
      );
      if (!wageCheck.isValid) {
        setMinimumWageWarning(wageCheck.warningMessage);
      }

      const result = calculateSeverancePay({
        employeeId,
        startDate,
        endDate: new Date(retirementDate),
        lastThreeMonthsWages,
        isMidTermSettlement,
        weeklyWorkingHours,
        wageArrearsPeriods:
          wageArrearsPeriods.length > 0 ? wageArrearsPeriods : undefined,
      });

      setCalculationResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "계산 중 오류가 발생했습니다.",
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department &&
        e.department.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // 게스트 모드: 직접 입력으로 퇴직금 계산 (로그인/사업장 등록 불필요)
  const [guestMode, setGuestMode] = useState(false);
  const [guestHireDate, setGuestHireDate] = useState("");
  const [guestRetireDate, setGuestRetireDate] = useState("");
  const [guestMonthlySalary, setGuestMonthlySalary] = useState(0);
  const [guestResult, setGuestResult] = useState<SeveranceResult | null>(null);
  const [guestError, setGuestError] = useState("");

  const handleGuestCalculate = () => {
    setGuestError("");
    if (!guestHireDate || !guestRetireDate || !guestMonthlySalary) {
      setGuestError("모든 항목을 입력해주세요.");
      return;
    }
    const start = new Date(guestHireDate);
    const end = new Date(guestRetireDate);
    if (end <= start) {
      setGuestError("퇴직일은 입사일 이후여야 합니다.");
      return;
    }
    const result = calculateSeverancePay({
      employeeId: "guest",
      startDate: start,
      endDate: end,
      lastThreeMonthsWages: [
        {
          baseSalary: guestMonthlySalary,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
        },
        {
          baseSalary: guestMonthlySalary,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
        },
        {
          baseSalary: guestMonthlySalary,
          fixedAllowances: 0,
          bonus: 0,
          overtimePay: 0,
          nonTaxable: 0,
        },
      ],
      isMidTermSettlement: false,
      weeklyWorkingHours: 40,
    });
    setGuestResult(result);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !company) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "홈", href: "/dashboard" },
            { label: "급여/임금", href: "/documents" },
            { label: "퇴직금 계산기" },
          ]}
        />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              퇴직금 계산기{" "}
              <InfoTooltip
                simple="1년 이상 근무한 직원에게 30일분 평균임금을 지급합니다"
                legal="근로자퇴직급여 보장법 제8조"
              />
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              근로기준법 제34조 · 1년 이상 근속 시 지급 의무
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-sm"
          >
            ← 뒤로
          </Link>
        </div>

        <HelpGuide
          pageKey="severance-calculate"
          steps={[
            "입사일과 퇴사일을 입력하면 근속일수가 자동 계산됩니다. (1년 미만은 퇴직금 대상이 아닙니다)",
            "최근 3개월 급여를 입력하세요. 기본급 + 고정수당 + 상여금(연간 1/12)을 포함합니다.",
            "계산된 퇴직금은 퇴사일로부터 14일 이내에 지급해야 합니다 (근로기준법 제36조).",
          ]}
        />

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 mb-4">
          <h2 className="text-base font-semibold text-[var(--text)] mb-4">
            빠른 계산 (로그인 불필요)
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  입사일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={guestHireDate}
                  onChange={(e) => setGuestHireDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">
                  퇴직일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={guestRetireDate}
                  onChange={(e) => setGuestRetireDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                퇴직 전 3개월 월 평균임금{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    guestMonthlySalary
                      ? formatNumberInput(String(guestMonthlySalary))
                      : ""
                  }
                  onChange={(e) =>
                    setGuestMonthlySalary(parseNumberInput(e.target.value))
                  }
                  placeholder="예: 3,000,000"
                  className="w-full px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
                  원
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                기본급 + 고정 수당 포함, 식대·차량 등 비과세 제외
              </p>
            </div>
            {guestError && <p className="text-red-500 text-sm">{guestError}</p>}
            <button
              onClick={handleGuestCalculate}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              퇴직금 계산하기
            </button>
          </div>

          {guestResult && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-700 font-medium mb-1">
                계산 결과
              </p>
              <p className="text-3xl font-bold text-blue-900">
                {formatSeveranceAmount(guestResult.totalAmount)}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                근속기간 {guestResult.serviceYears}년 · 평균임금{" "}
                {guestMonthlySalary.toLocaleString()}원/월
              </p>
              <p className="text-xs text-blue-600 mt-2">
                ※ 실제 지급액은 연차수당, 상여금 등에 따라 달라질 수 있습니다.
              </p>
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)] mb-3">
            직원 DB와 연동해서 자동으로 계산하려면 사업장을 등록하세요.
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-6 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            사업장 등록하고 자동 계산 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            퇴직금 계산기{" "}
            <InfoTooltip
              simple="1년 이상 근무한 직원에게 30일분 평균임금을 지급합니다"
              legal="근로자퇴직급여 보장법 제8조"
            />
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            근로기준법 제34조에 따른 퇴직금 계산
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
        >
          ← 대시보드
        </Link>
      </div>

      <HelpGuide
        pageKey="severance-calculate"
        steps={[
          "입사일과 퇴사일을 입력하면 근속일수가 자동 계산됩니다. (1년 미만은 퇴직금 대상이 아닙니다)",
          "최근 3개월 급여를 입력하세요. 기본급 + 고정수당 + 상여금(연간 1/12)을 포함합니다.",
          "계산된 퇴직금은 퇴사일로부터 14일 이내에 지급해야 합니다 (근로기준법 제36조).",
        ]}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-bold text-[var(--text)] mb-6">
            계산 정보 입력
          </h2>

          {/* 입력 모드 전환 */}
          <div className="flex bg-[var(--bg)] rounded-lg p-1 mb-6">
            <button
              onClick={() => setInputMode("employee")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inputMode === "employee" ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
            >
              직원 선택
            </button>
            <button
              onClick={() => setInputMode("manual")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inputMode === "manual" ? "bg-[var(--bg-card)] text-[var(--primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
            >
              직접 입력
            </button>
          </div>

          <div className="space-y-5">
            {inputMode === "employee" ? (
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  직원 선택 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="직원 이름 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  {searchQuery && filteredEmployees.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setSelectedEmployeeId(emp.id);
                            setSearchQuery(emp.name);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-[var(--bg-hover)] text-[var(--text)] text-sm"
                        >
                          <span className="font-medium">{emp.name}</span>
                          <span className="text-[var(--text-muted)] ml-2">
                            {emp.department || "-"} ·{" "}
                            {emp.employment_type === "fulltime"
                              ? "정규직"
                              : emp.employment_type === "parttime"
                                ? "파트타임"
                                : "프리랜서"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {validationErrors.employee && (
                  <p className="mt-1 text-sm text-red-500">
                    {validationErrors.employee}
                  </p>
                )}
                {selectedEmployee && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="text-[var(--text)]">
                      <span className="font-medium">
                        {selectedEmployee.name}
                      </span>
                      <span className="text-[var(--text-muted)] ml-2">
                        입사일: {selectedEmployee.hire_date}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* 직접 입력 모드 */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    입사일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={manualHireDate}
                    onChange={(e) => setManualHireDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  {validationErrors.manualHireDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {validationErrors.manualHireDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    월 기본급 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      manualBaseSalary
                        ? formatNumberInput(String(manualBaseSalary))
                        : ""
                    }
                    onChange={(e) =>
                      setManualBaseSalary(parseNumberInput(e.target.value))
                    }
                    placeholder="예: 3,000,000"
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  />
                  {validationErrors.manualSalary && (
                    <p className="mt-1 text-sm text-red-500">
                      {validationErrors.manualSalary}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">
                    월 고정수당 (식대, 교통비 등)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      manualFixedAllowances
                        ? formatNumberInput(String(manualFixedAllowances))
                        : ""
                    }
                    onChange={(e) =>
                      setManualFixedAllowances(parseNumberInput(e.target.value))
                    }
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                      연간 상여금
                    </label>
                    <input
                      type="number"
                      value={manualBonus || ""}
                      onChange={(e) => setManualBonus(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-2">
                      월 연장근로수당
                    </label>
                    <input
                      type="number"
                      value={manualOvertimePay || ""}
                      onChange={(e) =>
                        setManualOvertimePay(Number(e.target.value))
                      }
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  * 최근 3개월 급여가 동일하다고 가정하여 계산합니다. 월별
                  급여가 다른 경우 평균값을 입력해주세요.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                퇴직일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={retirementDate}
                onChange={(e) => setRetirementDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
              {validationErrors.retirementDate && (
                <p className="mt-1 text-sm text-red-500">
                  {validationErrors.retirementDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                퇴직 사유
              </label>
              <select
                value={retirementReason}
                onChange={(e) =>
                  setRetirementReason(e.target.value as RetirementReason)
                }
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              >
                {RETIREMENT_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {((inputMode === "employee" && selectedEmployee) ||
              (inputMode === "manual" && manualHireDate)) &&
              retirementDate && (
                <div
                  className={`p-4 rounded-lg border ${canUseMidTermSettlement ? "bg-amber-50 border-amber-200" : "bg-[var(--bg)] border-[var(--border)]"}`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMidTermSettlement}
                      onChange={(e) => setIsMidTermSettlement(e.target.checked)}
                      disabled={!canUseMidTermSettlement}
                      className="mt-0.5 w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                    />
                    <div>
                      <span
                        className={`text-sm font-medium ${canUseMidTermSettlement ? "text-amber-800" : "text-[var(--text-muted)]"}`}
                      >
                        중간정산 적용
                      </span>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {canUseMidTermSettlement
                          ? `근속 ${calculateServiceYears(effectiveHireDate, retirementDate).toFixed(1)}년 - 중간정산 가능`
                          : "중간정산은 1년 이상 근속자만 가능합니다."}
                      </p>
                    </div>
                  </label>
                  {validationErrors.midTerm && (
                    <p className="mt-2 text-sm text-red-500">
                      {validationErrors.midTerm}
                    </p>
                  )}
                </div>
              )}

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                주당 근무시간
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={weeklyWorkingHours}
                onChange={(e) =>
                  setWeeklyWorkingHours(parseInt(e.target.value) || 40)
                }
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-[var(--primary)]"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                주 15시간 미만 근무자는 퇴직금 지급 의무가 없습니다.
              </p>
            </div>

            <div className="border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[var(--text)]">
                  임금 체결 기간
                </label>
                <button
                  onClick={() => setShowArrearsInput(!showArrearsInput)}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  {showArrearsInput ? "접기" : "추가하기"}
                </button>
              </div>

              {wageArrearsPeriods.length > 0 && (
                <div className="mb-3 space-y-2">
                  {wageArrearsPeriods.map((period, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm p-2 bg-red-50 rounded"
                    >
                      <span className="text-red-700">
                        {period.startDate.toISOString().split("T")[0]} ~{" "}
                        {period.endDate.toISOString().split("T")[0]}
                      </span>
                      <button
                        onClick={() =>
                          setWageArrearsPeriods((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showArrearsInput && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      id="arrears-start"
                      className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm"
                      placeholder="시작일"
                    />
                    <input
                      type="date"
                      id="arrears-end"
                      className="px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm"
                      placeholder="종료일"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const startInput = document.getElementById(
                        "arrears-start",
                      ) as HTMLInputElement;
                      const endInput = document.getElementById(
                        "arrears-end",
                      ) as HTMLInputElement;
                      if (startInput.value && endInput.value) {
                        setWageArrearsPeriods((prev) => [
                          ...prev,
                          {
                            startDate: new Date(startInput.value),
                            endDate: new Date(endInput.value),
                            amount: 0,
                          },
                        ]);
                        startInput.value = "";
                        endInput.value = "";
                        setShowArrearsInput(false);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[var(--bg-hover)] text-[var(--text)] rounded-lg text-sm hover:bg-[var(--border)] transition-colors"
                  >
                    체결 기간 추가
                  </button>
                </div>
              )}

              <p className="mt-2 text-xs text-[var(--text-muted)]">
                임금이 지급되지 않은 기간은 퇴직금 계산에서 제외됩니다.
              </p>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="w-full mt-6 px-4 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                계산 중...
              </span>
            ) : (
              "퇴직금 계산하기"
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {minimumWageWarning && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700 font-medium">
                {minimumWageWarning}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                최저임금 위반 시 퇴직금 계산에 영향을 줄 수 있습니다.
              </p>
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-bold text-[var(--text)] mb-6">
            계산 결과
          </h2>

          {!calculationResult ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <div className="text-5xl mb-4">💰</div>
              <p>
                계산 정보를 입력하고
                <br />
                계산하기 버튼을 눌러주세요.
              </p>
            </div>
          ) : !calculationResult.isEligible ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-[var(--text)] font-medium mb-2">
                퇴직금 지급 대상이 아닙니다
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {calculationResult.serviceDays < 365 ? (
                  <>
                    근속 기간이 1년 미만입니다.
                    <br />
                    (현재 {calculationResult.serviceDays}일)
                  </>
                ) : (
                  <>
                    주당 근무시간이 15시간 미만입니다.
                    <br />
                    (주 {weeklyWorkingHours}시간)
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 총 퇴직금 */}
              <div className="text-center p-6 bg-gradient-to-br from-[var(--primary)] to-blue-600 rounded-xl text-white">
                <p className="text-sm opacity-90 mb-1">예상 퇴직금 총액</p>
                <p className="text-3xl font-bold">
                  {formatSeveranceAmount(calculationResult.totalAmount)}
                </p>
                {isMidTermSettlement && (
                  <p className="text-xs mt-2 opacity-80">※ 중간정산 금액</p>
                )}
              </div>

              <div className="space-y-3">
                <ResultRow
                  label="1일 평균임금"
                  value={formatSeveranceAmount(
                    calculationResult.averageDailyWage,
                  )}
                />
                <ResultRow
                  label="근속일수"
                  value={`${calculationResult.serviceDays.toLocaleString("ko-KR")}일 (${calculationResult.serviceYears.toFixed(2)}년)`}
                />

                <div className="border-t border-[var(--border)] my-3" />

                <ResultRow
                  label="3개월 임금 총액"
                  value={formatSeveranceAmount(
                    calculationResult.calculationBreakdown.threeMonthsTotalWage,
                  )}
                  subValue={`${calculationResult.calculationBreakdown.threeMonthsDays}일 기준`}
                />
                <ResultRow
                  label="일평균 계산"
                  value={`${formatSeveranceAmount(calculationResult.calculationBreakdown.dailyAverage)} × 30일`}
                />
                <ResultRow
                  label="근속년수 계수"
                  value={`× ${calculationResult.calculationBreakdown.daysMultiplier.toFixed(4)}`}
                />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">💡 공제 안내:</span>
                  <br />
                  퇴직금에 대한 소득세 및 지방소득세는
                  <br />
                  퇴직소득세 계산 후 공제됩니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCalculationResult(null);
                    setError(null);
                  }}
                  className="px-4 py-2.5 bg-[var(--bg-hover)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--border)] transition-colors"
                >
                  다시 계산
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ 퇴직금 계산 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>퇴직금 계산식: 평균임금 × 30일 × (근속일수 / 365)</li>
          <li>평균임금: 퇴직일 이전 3개월간 지급된 임금 총액 ÷ 3개월 일수</li>
          <li>
            평균임금이 통상임금보다 낮으면 통상임금을 적용합니다 (근기법 제2조
            ②항).
          </li>
          <li>1년 미만 근속자는 퇴직금 지급 의무가 없습니다.</li>
          <li>중간정산은 1년 이상 근속자에 한하여 신청 가능합니다.</li>
        </ul>
      </div>

      <LegalDisclaimer compact />
    </div>
  );
}

function ResultRow({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-[var(--text)]">{value}</span>
        {subValue && (
          <p className="text-xs text-[var(--text-muted)]">{subValue}</p>
        )}
      </div>
    </div>
  );
}
