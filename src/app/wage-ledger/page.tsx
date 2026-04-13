"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import {
  CompanyInfo,
  Employee as RegisteredEmployee,
  PaymentRecord,
} from "@/types";
import { formatCurrency, formatBusinessNumber } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { usePaymentRecords } from "@/hooks/usePaymentRecords";
import {
  calculateInsurance,
  calculateIncomeTax,
  MINIMUM_WAGE,
} from "@/lib/constants";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { downloadCSV } from "@/lib/export-csv";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { useToast } from "@/contexts/ToastContext";
import Breadcrumb from "@/components/Breadcrumb";

interface LedgerEmployee {
  id: string;
  registeredId?: string; // 연동된 직원 ID
  name: string;
  position: string;
  residentNumber: string; // 주민등록번호 (마스킹 표시용)
  dependents: number; // 공제대상 부양가족 수 (본인 포함)
  childrenUnder20: number; // 20세 이하 자녀 수
  taxWithholdingRate: 80 | 100 | 120; // 소득세 원천징수 비율
  baseSalary: number;
  overtime: number;
  overtimeHours: number; // 연장근로 시간 수
  nightWork: number;
  nightHours: number; // 야간근로 시간 수
  holidayWork: number;
  holidayHours: number; // 휴일근로 시간 수
  bonus: number;
  mealAllowance: number;
  carAllowance: number;
  childcareAllowance: number;
  researchAllowance: number;
  otherAllowance: number;
  weeklyHolidayPay: number; // 주휴수당
  annualLeaveAllowance: number; // 연차수당
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  incomeTax: number;
  localTax: number;
  otherDeduction: number; // 기타공제 (사내대출·노조비 등)
}

interface WageLedgerData {
  company: CompanyInfo;
  year: number;
  month: number;
  paymentDate: string; // 임금 지급일 (예: "2026-03-25")
  employees: LedgerEmployee[];
}

const createEmptyEmployee = (): LedgerEmployee => ({
  id: Date.now().toString(),
  name: "",
  position: "",
  residentNumber: "",
  dependents: 1,
  childrenUnder20: 0,
  taxWithholdingRate: 100,
  baseSalary: 0,
  overtime: 0,
  overtimeHours: 0,
  nightWork: 0,
  nightHours: 0,
  holidayWork: 0,
  holidayHours: 0,
  bonus: 0,
  mealAllowance: 0,
  carAllowance: 0,
  childcareAllowance: 0,
  researchAllowance: 0,
  otherAllowance: 0,
  weeklyHolidayPay: 0,
  annualLeaveAllowance: 0,
  nationalPension: 0,
  healthInsurance: 0,
  longTermCare: 0,
  employmentInsurance: 0,
  incomeTax: 0,
  localTax: 0,
  otherDeduction: 0,
});

export default function WageLedgerPage() {
  const [data, setData] = useState<WageLedgerData>(() => {
    const today = new Date();
    return {
      company: defaultCompanyInfo,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      paymentDate: "",
      employees: [],
    };
  });

  const toast = useToast();
  // Supabase 훅
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const activeEmployees = allEmployees.filter((e) => e.status === "active");
  const { getPaymentRecordsByMonth } = usePaymentRecords();

  // Supabase 훅에서 회사 정보 반영
  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const [showPreview, setShowPreview] = useState(false);
  const {
    saveDocument,
    saving: archiveSaving,
    saved: archiveSaved,
  } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "wage_ledger",
      title: `임금대장 - ${data.year}년 ${data.month}월`,
      data: data as unknown as Record<string, unknown>,
    });
  };

  const [showSelector, setShowSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `임금대장_${data.year}년${data.month}월`,
  });

  // 급여명세서에서 불러오기 (PaymentRecord → LedgerEmployee)
  const loadFromPayslips = async () => {
    const records = await getPaymentRecordsByMonth(data.year, data.month);
    if (records.length === 0) {
      toast.warning(
        `${data.year}년 ${data.month}월에 저장된 급여명세서가 없습니다.`,
      );
      return;
    }

    const newEmployees: LedgerEmployee[] = records.map((record) => {
      const emp = activeEmployees.find((e) => e.id === record.employeeId);
      return {
        id: `${Date.now()}-${record.id}`,
        registeredId: record.employeeId,
        name: emp?.info.name || "(알 수 없음)",
        position: emp?.position || "",
        residentNumber: "",
        dependents: emp?.taxDependents?.dependents ?? 1,
        childrenUnder20: emp?.taxDependents?.childrenUnder20 ?? 0,
        taxWithholdingRate: 100,
        baseSalary: record.earnings.baseSalary,
        overtime: record.earnings.overtime,
        overtimeHours: 0,
        nightWork: record.earnings.nightWork,
        nightHours: 0,
        holidayWork: record.earnings.holidayWork,
        holidayHours: 0,
        bonus: record.earnings.bonus,
        mealAllowance: record.earnings.mealAllowance,
        carAllowance: record.earnings.carAllowance,
        childcareAllowance: record.earnings.childcareAllowance,
        researchAllowance: record.earnings.researchAllowance,
        otherAllowance: record.earnings.otherAllowances.reduce(
          (sum, a) => sum + a.amount,
          0,
        ),
        weeklyHolidayPay: 0,
        annualLeaveAllowance: 0,
        nationalPension: record.deductions.nationalPension,
        healthInsurance: record.deductions.healthInsurance,
        longTermCare: record.deductions.longTermCare,
        employmentInsurance: record.deductions.employmentInsurance,
        incomeTax: record.deductions.incomeTax,
        localTax: record.deductions.localTax,
        otherDeduction: 0,
      };
    });

    setData((prev) => ({ ...prev, employees: newEmployees }));
  };

  // 등록 직원 → 임금대장 직원 매핑
  const mapToLedgerEmployee = (emp: RegisteredEmployee): LedgerEmployee => {
    const insurance = calculateInsurance(emp.salary.baseSalary);
    const deps = emp.taxDependents?.dependents ?? 1;
    const children = emp.taxDependents?.childrenUnder20 ?? 0;
    const rate = 100;
    const rawIncomeTax = calculateIncomeTax(
      emp.salary.baseSalary,
      deps,
      children,
    );
    const incomeTax = Math.floor((rawIncomeTax * (rate / 100)) / 10) * 10;
    return {
      id: `${Date.now()}-${emp.id}`,
      registeredId: emp.id,
      name: emp.info.name,
      position: emp.position || "",
      residentNumber: "",
      dependents: deps,
      childrenUnder20: children,
      taxWithholdingRate: rate as 80 | 100 | 120,
      baseSalary: emp.salary.baseSalary,
      overtime: 0,
      overtimeHours: 0,
      nightWork: 0,
      nightHours: 0,
      holidayWork: 0,
      holidayHours: 0,
      bonus: 0,
      mealAllowance: emp.salary.mealAllowance,
      carAllowance: emp.salary.carAllowance,
      childcareAllowance: emp.salary.childcareAllowance,
      researchAllowance: emp.salary.researchAllowance || 0,
      otherAllowance:
        emp.salary.otherAllowances?.reduce(
          (sum: number, a: { amount: number }) => sum + a.amount,
          0,
        ) || 0,
      weeklyHolidayPay: 0,
      annualLeaveAllowance: 0,
      nationalPension: insurance.nationalPension,
      healthInsurance: insurance.healthInsurance,
      longTermCare: insurance.longTermCare,
      employmentInsurance: insurance.employmentInsurance,
      incomeTax,
      localTax: Math.floor((incomeTax * 0.1) / 10) * 10,
      otherDeduction: 0,
    };
  };

  // 이미 추가된 직원 ID 목록
  const addedEmployeeIds = new Set(
    data.employees.map((e) => e.registeredId).filter(Boolean),
  );

  // 등록된 직원 전체 추가
  const addAllRegisteredEmployees = () => {
    const notYetAdded = activeEmployees.filter(
      (emp) => !addedEmployeeIds.has(emp.id),
    );
    if (notYetAdded.length === 0) return;
    const newEmployees = notYetAdded.map(mapToLedgerEmployee);
    setData((prev) => ({
      ...prev,
      employees: [...prev.employees, ...newEmployees],
    }));
  };

  // 선택한 직원만 추가
  const addSelectedEmployees = () => {
    const selected = activeEmployees.filter(
      (emp) => selectedIds.has(emp.id) && !addedEmployeeIds.has(emp.id),
    );
    if (selected.length === 0) return;
    const newEmployees = selected.map(mapToLedgerEmployee);
    setData((prev) => ({
      ...prev,
      employees: [...prev.employees, ...newEmployees],
    }));
    setShowSelector(false);
    setSelectedIds(new Set());
  };

  // 전체 선택/해제 토글
  const toggleSelectAll = () => {
    const selectable = activeEmployees.filter(
      (emp) => !addedEmployeeIds.has(emp.id),
    );
    if (selectedIds.size === selectable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map((emp) => emp.id)));
    }
  };

  // 개별 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 직원 추가 (수동)
  const addEmployee = () => {
    setData((prev) => ({
      ...prev,
      employees: [...prev.employees, createEmptyEmployee()],
    }));
  };

  // 직원 제거
  const removeEmployee = (id: string) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
    }));
  };

  // 직원 정보 업데이트
  const updateEmployee = (
    id: string,
    field: keyof LedgerEmployee,
    value: string | number,
  ) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    }));
  };

  // 주민번호 입력 핸들러 (앞 6자리 이후 자동 마스킹)
  const handleResidentNumberChange = (id: string, raw: string) => {
    // 숫자와 하이픈만 허용
    const cleaned = raw.replace(/[^\d-]/g, "");
    let masked = cleaned;
    // 앞 6자리가 입력되면 '-XXXXXXX' 마스킹 적용
    if (cleaned.replace("-", "").length > 6) {
      const digits = cleaned.replace("-", "");
      masked =
        digits.slice(0, 6) + "-" + "*".repeat(Math.min(digits.length - 6, 7));
    }
    updateEmployee(id, "residentNumber", masked);
  };

  // 4대보험 + 소득세 자동 계산
  const autoCalculateDeductions = (id: string) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => {
        if (e.id !== id) return e;
        const taxable =
          e.baseSalary + e.overtime + e.nightWork + e.holidayWork + e.bonus;
        const insurance = calculateInsurance(taxable);
        const rawTax = calculateIncomeTax(
          taxable,
          e.dependents,
          e.childrenUnder20,
        );
        const incomeTax =
          Math.floor((rawTax * (e.taxWithholdingRate / 100)) / 10) * 10;
        return {
          ...e,
          nationalPension: insurance.nationalPension,
          healthInsurance: insurance.healthInsurance,
          longTermCare: insurance.longTermCare,
          employmentInsurance: insurance.employmentInsurance,
          incomeTax,
          localTax: Math.floor((incomeTax * 0.1) / 10) * 10,
        };
      }),
    }));
  };

  // 전체 자동 계산
  const autoCalculateAll = () => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => {
        const taxable =
          e.baseSalary + e.overtime + e.nightWork + e.holidayWork + e.bonus;
        const insurance = calculateInsurance(taxable);
        const rawTax = calculateIncomeTax(
          taxable,
          e.dependents,
          e.childrenUnder20,
        );
        const incomeTax =
          Math.floor((rawTax * (e.taxWithholdingRate / 100)) / 10) * 10;
        return {
          ...e,
          nationalPension: insurance.nationalPension,
          healthInsurance: insurance.healthInsurance,
          longTermCare: insurance.longTermCare,
          employmentInsurance: insurance.employmentInsurance,
          incomeTax,
          localTax: Math.floor((incomeTax * 0.1) / 10) * 10,
        };
      }),
    }));
  };

  // 합계 계산
  const totals = data.employees.reduce(
    (acc, e) => ({
      baseSalary: acc.baseSalary + e.baseSalary,
      overtime: acc.overtime + e.overtime,
      overtimeHours: acc.overtimeHours + e.overtimeHours,
      nightWork: acc.nightWork + e.nightWork,
      nightHours: acc.nightHours + e.nightHours,
      holidayWork: acc.holidayWork + e.holidayWork,
      holidayHours: acc.holidayHours + e.holidayHours,
      bonus: acc.bonus + e.bonus,
      mealAllowance: acc.mealAllowance + e.mealAllowance,
      carAllowance: acc.carAllowance + e.carAllowance,
      childcareAllowance: acc.childcareAllowance + e.childcareAllowance,
      researchAllowance: acc.researchAllowance + e.researchAllowance,
      otherAllowance: acc.otherAllowance + e.otherAllowance,
      weeklyHolidayPay: acc.weeklyHolidayPay + e.weeklyHolidayPay,
      annualLeaveAllowance: acc.annualLeaveAllowance + e.annualLeaveAllowance,
      nationalPension: acc.nationalPension + e.nationalPension,
      healthInsurance: acc.healthInsurance + e.healthInsurance,
      longTermCare: acc.longTermCare + e.longTermCare,
      employmentInsurance: acc.employmentInsurance + e.employmentInsurance,
      incomeTax: acc.incomeTax + e.incomeTax,
      localTax: acc.localTax + e.localTax,
      otherDeduction: acc.otherDeduction + e.otherDeduction,
    }),
    {
      baseSalary: 0,
      overtime: 0,
      overtimeHours: 0,
      nightWork: 0,
      nightHours: 0,
      holidayWork: 0,
      holidayHours: 0,
      bonus: 0,
      mealAllowance: 0,
      carAllowance: 0,
      childcareAllowance: 0,
      researchAllowance: 0,
      otherAllowance: 0,
      weeklyHolidayPay: 0,
      annualLeaveAllowance: 0,
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance: 0,
      incomeTax: 0,
      localTax: 0,
      otherDeduction: 0,
    },
  );

  const getTotalEarnings = (e: LedgerEmployee) =>
    e.baseSalary +
    e.overtime +
    e.nightWork +
    e.holidayWork +
    e.bonus +
    e.mealAllowance +
    e.carAllowance +
    e.childcareAllowance +
    e.researchAllowance +
    e.otherAllowance +
    e.weeklyHolidayPay +
    e.annualLeaveAllowance;

  const getTotalDeductions = (e: LedgerEmployee) =>
    e.nationalPension +
    e.healthInsurance +
    e.longTermCare +
    e.employmentInsurance +
    e.incomeTax +
    e.localTax +
    e.otherDeduction;

  const getNetPay = (e: LedgerEmployee) =>
    getTotalEarnings(e) - getTotalDeductions(e);

  // 최저임금 위반 체크 (시급 환산)
  const checkMinWageViolation = (
    e: LedgerEmployee,
  ): { violated: boolean; hourly: number } => {
    const taxable =
      e.baseSalary + e.overtime + e.nightWork + e.holidayWork + e.bonus;
    if (taxable <= 0) return { violated: false, hourly: 0 };
    const hourly = Math.floor(e.baseSalary / MINIMUM_WAGE.monthlyHours);
    return { violated: hourly < MINIMUM_WAGE.hourly, hourly };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "급여/임금", href: "/documents" },
          { label: "임금대장" },
        ]}
      />
      <LegalDisclaimer />

      {/* 4대보험 산정 안내 */}
      <div
        className={`mb-6 rounded-xl border p-4 text-sm ${insuranceConfirmed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
      >
        <p className="font-semibold text-amber-800 mb-2">
          ⚠️ 4대보험 보험료 산정 주의사항
        </p>
        <ul className="space-y-1 text-amber-700 leading-relaxed">
          <li>
            • <strong>국민연금·건강보험·장기요양보험</strong>은{" "}
            <strong>작년 급여(과세분)</strong>를 기준으로 공단이 정한 금액으로{" "}
            <strong>매년 7월부터 1년간 고정</strong> 적용됩니다.
          </li>
          <li>
            • <strong>고용보험</strong>만 이번 달 실제 과세 급여를 기준으로 매월
            변동됩니다.
          </li>
          <li>
            • 성과급·연장수당 등이 지급된 달에도 국민연금·건강보험 보험료는
            변하지 않습니다.
          </li>
          <li>
            • 아래 자동계산 금액은 <strong>참고용</strong>이며, 실제 공단 고지서
            금액과 다를 수 있습니다. 확인하셔서{" "}
            <strong>직접 수정해서 입력하세요.</strong> 입력한 금액은{" "}
            <strong>다음해 6월까지 1년간 고정 적용</strong>됩니다.
          </li>
          <li>
            • 임금항목을 추가·변경할 때는 과세/비과세 구분과 4대보험·원천세 신고
            데이터 영향 범위를 반드시 확인하세요.
          </li>
          <li>
            • 연장·야간·휴일근로시간은 실제 근무기록과 일치해야 합니다.
            포괄임금제 적용 시에도 실제 근로시간 관리 증빙이 필요합니다.
          </li>
        </ul>
        <p className="mt-2 text-amber-800 font-medium">
          📌 기장 세무사 또는 노무사 사무실에 문의하여 작성하세요.
        </p>

        {/* 확인 체크박스 */}
        <div className="mt-3 pt-3 border-t border-amber-200">
          {!insuranceConfirmed && (
            <p className="text-red-600 font-bold text-sm mb-2">
              🔴 공단 고지서 금액으로 수정 후 아래 체크박스를 클릭하세요. 확인
              전까지 이 경고가 표시됩니다.
            </p>
          )}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={insuranceConfirmed}
              onChange={(e) => setInsuranceConfirmed(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <span
              className={`font-medium ${insuranceConfirmed ? "text-green-700" : "text-amber-800"}`}
            >
              {insuranceConfirmed
                ? "✅ 공단 고지서 기준으로 수정 적용 완료"
                : "수정 적용 완료 — 공단 고지서 금액으로 직접 수정했습니다"}
            </span>
          </label>
        </div>
      </div>

      {/* 임금대장 실무 체크리스트 */}
      <details className="mb-6 rounded-xl border border-blue-200 bg-blue-50">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-blue-800 select-none">
          📋 임금대장 실무 체크리스트 (클릭하여 펼치기)
        </summary>
        <div className="px-4 pb-4 text-sm">
          <p className="text-blue-700 mb-3 font-medium">
            💾 임금대장은 근로기준법상 <strong>3년 이상 보존</strong> 의무가
            있습니다. 전자파일 보관 시 암호화·백업 정책을 마련하세요.
          </p>
          <ul className="space-y-1 text-blue-700">
            <li>☐ 근로자별 기본정보(입·퇴사일 포함)가 최신 상태인지</li>
            <li>☐ 과세/비과세 항목이 정확히 분리되어 있는지</li>
            <li>
              ☐ 연장·야간·휴일근로시간 및 수당 계산이 근무기록과 일치하는지
            </li>
            <li>☐ 4대보험·원천세 공제액이 신고 자료와 일치하는지</li>
            <li>☐ 임금지급내역(계좌이체)과 임금대장 금액이 일치하는지</li>
            <li>
              ☐ 법정수당 누락이 없는지 (주휴수당, 연차수당, 휴일근로수당 등)
            </li>
            <li>☐ 소급지급 항목은 비고란에 해당 기간을 명시했는지</li>
            <li>☐ 주민등록번호 등 민감정보 접근 권한이 제한되어 있는지</li>
          </ul>
          <p className="mt-3 text-blue-600 text-xs">
            ※ 연중 입·퇴사자, 포괄임금제 적용 직원, 성과급 비중이 큰 영업직은
            별도 관리 포인트를 세무사·노무사와 확인하세요.
          </p>
        </div>
      </details>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">📊 임금대장</h1>
          <p className="text-[var(--text-muted)] mt-1">
            월별 임금대장을 작성합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
          >
            {showPreview ? "✏️ 수정" : "👁️ 미리보기"}
          </button>
          {showPreview && (
            <button
              onClick={handleSaveToArchive}
              disabled={archiveSaving}
              className="btn-secondary disabled:opacity-50"
            >
              {archiveSaving
                ? "저장 중..."
                : archiveSaved
                  ? "✓ 저장됨"
                  : "🗄️ 보관함에 저장"}
            </button>
          )}
          {data.employees.length > 0 && (
            <button
              onClick={() => {
                const headers = [
                  "이름",
                  "직위",
                  "주민번호(마스킹)",
                  "기본급",
                  "연장수당",
                  "연장시간",
                  "야간수당",
                  "야간시간",
                  "휴일수당",
                  "휴일시간",
                  "상여금",
                  "식대",
                  "자가운전보조금",
                  "보육수당",
                  "연구보조비",
                  "기타수당",
                  "주휴수당",
                  "연차수당",
                  "지급합계",
                  "국민연금",
                  "건강보험",
                  "장기요양",
                  "고용보험",
                  "소득세",
                  "지방소득세",
                  "기타공제",
                  "공제합계",
                  "실수령액",
                ];
                const rows = data.employees.map((emp) => {
                  const totalEarnings = getTotalEarnings(emp);
                  const totalDeductions = getTotalDeductions(emp);
                  return [
                    emp.name,
                    emp.position,
                    emp.residentNumber
                      ? emp.residentNumber.slice(0, 6) + "-*******"
                      : "",
                    emp.baseSalary,
                    emp.overtime,
                    emp.overtimeHours,
                    emp.nightWork,
                    emp.nightHours,
                    emp.holidayWork,
                    emp.holidayHours,
                    emp.bonus,
                    emp.mealAllowance,
                    emp.carAllowance,
                    emp.childcareAllowance,
                    emp.researchAllowance,
                    emp.otherAllowance,
                    emp.weeklyHolidayPay,
                    emp.annualLeaveAllowance,
                    totalEarnings,
                    emp.nationalPension,
                    emp.healthInsurance,
                    emp.longTermCare,
                    emp.employmentInsurance,
                    emp.incomeTax,
                    emp.localTax,
                    emp.otherDeduction,
                    totalDeductions,
                    totalEarnings - totalDeductions,
                  ] as (string | number)[];
                });
                downloadCSV(
                  `임금대장_${data.year}년${data.month}월.csv`,
                  headers,
                  rows,
                );
              }}
              className="btn-secondary"
            >
              엑셀 내보내기
            </button>
          )}
          <button onClick={() => handlePrint()} className="btn-primary">
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="wage-ledger"
        steps={[
          '급여명세서를 이미 작성했다면 "급여명세서에서 불러오기"를 누르면 한 번에 채워집니다.',
          "직원별로 이번 달 급여를 한눈에 볼 수 있는 표입니다.",
          '"일괄 계산"을 누르면 4대보험과 세금이 자동으로 계산됩니다.',
          "완성된 임금대장은 3년간 보관 의무가 있으니 PDF로 저장해두세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          {/* 기간 설정 */}
          <div className="form-section">
            <h2 className="form-section-title">📅 귀속 기간</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">연도</label>
                <select
                  className="input-field"
                  value={data.year}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      year: parseInt(e.target.value),
                    }))
                  }
                >
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">월</label>
                <select
                  className="input-field"
                  value={data.month}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      month: parseInt(e.target.value),
                    }))
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">임금 지급일</label>
                <input
                  type="date"
                  className="input-field"
                  placeholder="예: 2026-03-25"
                  value={data.paymentDate}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 직원 연동 */}
          {activeEmployees.length > 0 && (
            <div className="form-section">
              <div className="flex items-center justify-between">
                <h2 className="form-section-title mb-0">🔗 직원 연동</h2>
                <div className="flex gap-2">
                  <button
                    onClick={loadFromPayslips}
                    className="btn-primary text-sm"
                  >
                    📋 급여명세서에서 불러오기
                  </button>
                  <button
                    onClick={addAllRegisteredEmployees}
                    className="btn-secondary text-sm"
                    disabled={activeEmployees.length === addedEmployeeIds.size}
                  >
                    👥 전체 추가 (
                    {activeEmployees.length - addedEmployeeIds.size}명)
                  </button>
                  <button
                    onClick={() => {
                      setShowSelector(!showSelector);
                      setSelectedIds(new Set());
                    }}
                    className="btn-secondary text-sm"
                    disabled={activeEmployees.length === addedEmployeeIds.size}
                  >
                    {showSelector ? "접기" : "☑️ 선택 추가"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                <span className="font-medium text-blue-600">
                  📋 급여명세서에서 불러오기:
                </span>{" "}
                이미 작성한 급여명세서를 한 번에 불러옵니다 (연장/야간/휴일 수당
                포함).
                <br />
                등록된 직원을 수동으로 추가하려면 {'"'}전체 추가{'"'} 또는 {'"'}
                선택 추가{'"'}를 사용하세요.
              </p>

              {/* 직원 선택 패널 */}
              {showSelector && (
                <div className="mt-4 border rounded-lg bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size > 0 &&
                          selectedIds.size ===
                            activeEmployees.filter(
                              (e) => !addedEmployeeIds.has(e.id),
                            ).length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-[var(--border)]"
                      />
                      <span className="text-sm font-medium text-[var(--text)]">
                        전체 선택
                      </span>
                    </label>
                    <span className="text-xs text-[var(--text-muted)]">
                      {selectedIds.size}명 선택됨
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {activeEmployees.map((emp) => {
                      const alreadyAdded = addedEmployeeIds.has(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            alreadyAdded
                              ? "opacity-50 cursor-not-allowed"
                              : selectedIds.has(emp.id)
                                ? "bg-blue-50"
                                : "hover:bg-[var(--bg-card)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(emp.id)}
                            disabled={alreadyAdded}
                            onChange={() => toggleSelect(emp.id)}
                            className="w-4 h-4 rounded border-[var(--border)]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-[var(--text)]">
                              {emp.info.name}
                            </span>
                            {emp.position && (
                              <span className="text-xs text-[var(--text-muted)] ml-2">
                                {emp.position}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {alreadyAdded
                              ? "추가됨"
                              : `기본급 ${formatCurrency(emp.salary.baseSalary)}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                    <button
                      onClick={() => {
                        setShowSelector(false);
                        setSelectedIds(new Set());
                      }}
                      className="btn-secondary text-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={addSelectedEmployees}
                      disabled={selectedIds.size === 0}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      선택한 직원 추가 ({selectedIds.size}명)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 직원 목록 */}
          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="form-section-title mb-0">👥 직원별 급여 내역</h2>
              <div className="flex gap-2">
                <button
                  onClick={autoCalculateAll}
                  className="btn-secondary text-sm"
                >
                  🔄 4대보험/세금 일괄 계산
                </button>
                <button onClick={addEmployee} className="btn-secondary text-sm">
                  ➕ 직원 추가
                </button>
              </div>
            </div>

            {data.employees.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <p className="text-4xl mb-4">📋</p>
                <p>직원이 없습니다.</p>
                <p className="text-sm mt-2">
                  위의 {'"'}등록된 직원 전체 추가{'"'} 버튼을 누르거나, {'"'}
                  직원 추가{'"'} 버튼을 눌러주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.employees.map((emp, index) => (
                  <div
                    key={emp.id}
                    className="border rounded-lg p-4 bg-[var(--bg-card)]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[var(--text)]">
                        #{index + 1} {emp.name || "(이름 입력)"}
                        {emp.registeredId && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            연동됨
                          </span>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => autoCalculateDeductions(emp.id)}
                          className="text-blue-500 text-sm hover:underline"
                        >
                          🔄 자동계산
                        </button>
                        <button
                          onClick={() => removeEmployee(emp.id)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                      {/* 기본 정보 */}
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          이름
                        </label>
                        <input
                          type="text"
                          className="input-field py-1"
                          value={emp.name}
                          onChange={(e) =>
                            updateEmployee(emp.id, "name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          직위
                        </label>
                        <input
                          type="text"
                          className="input-field py-1"
                          value={emp.position}
                          onChange={(e) =>
                            updateEmployee(emp.id, "position", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          주민번호 (마스킹)
                        </label>
                        <input
                          type="text"
                          className="input-field py-1"
                          placeholder="000000-0000000"
                          value={emp.residentNumber}
                          onChange={(e) =>
                            handleResidentNumberChange(emp.id, e.target.value)
                          }
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          부양가족(본인포함)
                        </label>
                        <select
                          className="input-field py-1"
                          value={emp.dependents}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "dependents",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          {Array.from({ length: 11 }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n}명
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          20세이하 자녀
                        </label>
                        <select
                          className="input-field py-1"
                          value={emp.childrenUnder20}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "childrenUnder20",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          {Array.from({ length: 8 }, (_, i) => i).map((n) => (
                            <option key={n} value={n}>
                              {n}명
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          소득세 비율
                        </label>
                        <select
                          className="input-field py-1"
                          value={emp.taxWithholdingRate}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "taxWithholdingRate",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          <option value={80}>80%</option>
                          <option value={100}>100%</option>
                          <option value={120}>120%</option>
                        </select>
                      </div>

                      {/* 지급 항목 */}
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          기본급 (과세)
                        </label>
                        <input
                          type="number"
                          className={`input-field py-1 ${checkMinWageViolation(emp).violated ? "border-red-500 bg-red-50" : ""}`}
                          value={emp.baseSalary || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "baseSalary",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {checkMinWageViolation(emp).violated && (
                          <p className="text-xs text-red-600 mt-0.5">
                            ⚠️ 최저임금 미달! (시급{" "}
                            {checkMinWageViolation(emp).hourly.toLocaleString()}
                            원 &lt; {MINIMUM_WAGE.hourly.toLocaleString()}원)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          연장수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.overtime || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "overtime",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <input
                          type="number"
                          className="input-field py-1 mt-1"
                          placeholder="연장시간"
                          value={emp.overtimeHours || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "overtimeHours",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          야간수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.nightWork || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "nightWork",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <input
                          type="number"
                          className="input-field py-1 mt-1"
                          placeholder="야간시간"
                          value={emp.nightHours || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "nightHours",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          휴일수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.holidayWork || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "holidayWork",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <input
                          type="number"
                          className="input-field py-1 mt-1"
                          placeholder="휴일시간"
                          value={emp.holidayHours || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "holidayHours",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          상여금 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.bonus || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "bonus",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          식대 (비과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.mealAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "mealAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          차량유지비 (비과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.carAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "carAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          보육수당 (비과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.childcareAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "childcareAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          연구보조비 (비과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.researchAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "researchAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          기타수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.otherAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "otherAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          주휴수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.weeklyHolidayPay || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "weeklyHolidayPay",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          연차수당 (과세)
                        </label>
                        <input
                          type="number"
                          className="input-field py-1"
                          value={emp.annualLeaveAllowance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "annualLeaveAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>

                      {/* 공제 항목 */}
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          국민연금
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.nationalPension || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "nationalPension",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          건강보험
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.healthInsurance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "healthInsurance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          장기요양
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.longTermCare || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "longTermCare",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          고용보험
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.employmentInsurance || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "employmentInsurance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          소득세
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.incomeTax || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "incomeTax",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          지방소득세
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          value={emp.localTax || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "localTax",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[var(--text-muted)] text-xs">
                          기타공제
                        </label>
                        <input
                          type="number"
                          className="input-field py-1 bg-red-50"
                          placeholder="사내대출·노조비 등"
                          value={emp.otherDeduction || ""}
                          onChange={(e) =>
                            updateEmployee(
                              emp.id,
                              "otherDeduction",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* 합계 */}
                    <div className="mt-4 pt-3 border-t flex justify-between text-sm">
                      <div>
                        <span className="text-[var(--text-muted)]">
                          지급 합계:
                        </span>
                        <span className="font-bold text-green-600 ml-2">
                          {formatCurrency(getTotalEarnings(emp))}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">
                          공제 합계:
                        </span>
                        <span className="font-bold text-red-600 ml-2">
                          {formatCurrency(getTotalDeductions(emp))}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">
                          실수령액:
                        </span>
                        <span className="font-bold text-blue-600 ml-2">
                          {formatCurrency(getNetPay(emp))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 전체 합계 */}
          {data.employees.length > 0 && (
            <div className="form-section bg-[var(--bg)]">
              <h2 className="form-section-title">📊 전체 합계</h2>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-[var(--text-muted)] text-sm">총 지급액</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      totals.baseSalary +
                        totals.overtime +
                        totals.nightWork +
                        totals.holidayWork +
                        totals.bonus +
                        totals.mealAllowance +
                        totals.carAllowance +
                        totals.childcareAllowance +
                        totals.researchAllowance +
                        totals.otherAllowance +
                        totals.weeklyHolidayPay +
                        totals.annualLeaveAllowance,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-sm">총 공제액</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      totals.nationalPension +
                        totals.healthInsurance +
                        totals.longTermCare +
                        totals.employmentInsurance +
                        totals.incomeTax +
                        totals.localTax +
                        totals.otherDeduction,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-sm">
                    총 실지급액
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      data.employees.reduce((sum, e) => sum + getNetPay(e), 0),
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 미리보기 */
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 overflow-x-auto">
          <WageLedgerPreview data={data} />
        </div>
      )}

      {/* 인쇄용 */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
        }}
      >
        <div ref={printRef}>
          <WageLedgerPreview data={data} />
        </div>
      </div>
    </div>
  );
}

function WageLedgerPreview({ data }: { data: WageLedgerData }) {
  const getTotalEarnings = (e: LedgerEmployee) =>
    e.baseSalary +
    e.overtime +
    e.nightWork +
    e.holidayWork +
    e.bonus +
    e.mealAllowance +
    e.carAllowance +
    e.childcareAllowance +
    e.researchAllowance +
    e.otherAllowance +
    e.weeklyHolidayPay +
    e.annualLeaveAllowance;

  const getTotalDeductions = (e: LedgerEmployee) =>
    e.nationalPension +
    e.healthInsurance +
    e.longTermCare +
    e.employmentInsurance +
    e.incomeTax +
    e.localTax +
    e.otherDeduction;

  const cellStyle = {
    border: "1px solid #d1d5db",
    padding: "6px 4px",
    textAlign: "center" as const,
    fontSize: "10px",
  };
  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#1e40af",
    color: "white",
    fontWeight: 600,
  };
  const subHeaderStyle = {
    ...cellStyle,
    backgroundColor: "#dbeafe",
    fontWeight: 500,
    whiteSpace: "pre-line" as const,
  };

  return (
    <div style={{ fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
          임 금 대 장
        </h1>
        <p style={{ fontSize: "14px", color: "#666" }}>
          {data.year}년 {data.month}월분
        </p>
      </div>

      {/* 회사 정보 */}
      <div style={{ marginBottom: "16px", fontSize: "13px" }}>
        <p>
          <strong>사업장:</strong> {data.company.name}
        </p>
        <p>
          <strong>대표자:</strong> {data.company.ceoName}
        </p>
        <p>
          <strong>사업자번호:</strong>{" "}
          {formatBusinessNumber(data.company.businessNumber)}
        </p>
        <p>
          <strong>소재지:</strong> {data.company.address}
        </p>
        <p>
          <strong>임금 지급일:</strong> {data.paymentDate || "미입력"}
        </p>
      </div>

      {/* 테이블 */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}
      >
        <thead>
          <tr>
            <th rowSpan={2} style={headerStyle}>
              No
            </th>
            <th rowSpan={2} style={headerStyle}>
              주민번호
            </th>
            <th rowSpan={2} style={headerStyle}>
              성명
            </th>
            <th rowSpan={2} style={headerStyle}>
              직위
            </th>
            <th colSpan={12} style={headerStyle}>
              지급 항목
            </th>
            <th colSpan={7} style={headerStyle}>
              공제 항목
            </th>
            <th rowSpan={2} style={headerStyle}>
              실지급액
            </th>
          </tr>
          <tr>
            <th style={subHeaderStyle}>{"기본급\n(과세)"}</th>
            <th style={subHeaderStyle}>{"연장\n(과세)"}</th>
            <th style={subHeaderStyle}>{"야간\n(과세)"}</th>
            <th style={subHeaderStyle}>{"휴일\n(과세)"}</th>
            <th style={subHeaderStyle}>{"상여\n(과세)"}</th>
            <th style={subHeaderStyle}>{"식대\n(비과세)"}</th>
            <th style={subHeaderStyle}>{"차량\n(비과세)"}</th>
            <th style={subHeaderStyle}>{"보육\n(비과세)"}</th>
            <th style={subHeaderStyle}>{"연구\n(비과세)"}</th>
            <th style={subHeaderStyle}>{"기타수당\n(과세)"}</th>
            <th style={subHeaderStyle}>{"주휴수당\n(과세)"}</th>
            <th style={subHeaderStyle}>{"연차수당\n(과세)"}</th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              국민
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              건강
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              장기
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              고용
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              소득세
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              지방세
            </th>
            <th style={{ ...subHeaderStyle, backgroundColor: "#fee2e2" }}>
              기타공제
            </th>
          </tr>
        </thead>
        <tbody>
          {data.employees.map((emp, idx) => (
            <tr key={emp.id}>
              <td style={cellStyle}>{idx + 1}</td>
              <td style={cellStyle}>
                {emp.residentNumber
                  ? emp.residentNumber.slice(0, 6) + "-*******"
                  : "-"}
              </td>
              <td style={cellStyle}>{emp.name}</td>
              <td style={cellStyle}>{emp.position}</td>
              <td style={cellStyle}>{emp.baseSalary.toLocaleString()}</td>
              <td style={cellStyle}>
                {emp.overtime.toLocaleString()}
                {emp.overtimeHours > 0 && (
                  <span
                    style={{ display: "block", fontSize: "9px", color: "#555" }}
                  >
                    ({emp.overtimeHours}h)
                  </span>
                )}
              </td>
              <td style={cellStyle}>
                {emp.nightWork.toLocaleString()}
                {emp.nightHours > 0 && (
                  <span
                    style={{ display: "block", fontSize: "9px", color: "#555" }}
                  >
                    ({emp.nightHours}h)
                  </span>
                )}
              </td>
              <td style={cellStyle}>
                {emp.holidayWork.toLocaleString()}
                {emp.holidayHours > 0 && (
                  <span
                    style={{ display: "block", fontSize: "9px", color: "#555" }}
                  >
                    ({emp.holidayHours}h)
                  </span>
                )}
              </td>
              <td style={cellStyle}>{emp.bonus.toLocaleString()}</td>
              <td style={cellStyle}>{emp.mealAllowance.toLocaleString()}</td>
              <td style={cellStyle}>{emp.carAllowance.toLocaleString()}</td>
              <td style={cellStyle}>
                {emp.childcareAllowance.toLocaleString()}
              </td>
              <td style={cellStyle}>
                {emp.researchAllowance.toLocaleString()}
              </td>
              <td style={cellStyle}>{emp.otherAllowance.toLocaleString()}</td>
              <td style={cellStyle}>{emp.weeklyHolidayPay.toLocaleString()}</td>
              <td style={cellStyle}>
                {emp.annualLeaveAllowance.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.nationalPension.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.healthInsurance.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.longTermCare.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.employmentInsurance.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.incomeTax.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.localTax.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
                {emp.otherDeduction.toLocaleString()}
              </td>
              <td style={{ ...cellStyle, fontWeight: 600, color: "#1e40af" }}>
                {(
                  getTotalEarnings(emp) - getTotalDeductions(emp)
                ).toLocaleString()}
              </td>
            </tr>
          ))}
          {/* 합계 행 */}
          <tr style={{ backgroundColor: "#f3f4f6", fontWeight: 600 }}>
            <td colSpan={4} style={cellStyle}>
              합 계
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.baseSalary, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.overtime, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.nightWork, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.holidayWork, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees.reduce((s, e) => s + e.bonus, 0).toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.mealAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.carAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.childcareAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.researchAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.otherAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.weeklyHolidayPay, 0)
                .toLocaleString()}
            </td>
            <td style={cellStyle}>
              {data.employees
                .reduce((s, e) => s + e.annualLeaveAllowance, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.nationalPension, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.healthInsurance, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.longTermCare, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.employmentInsurance, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.incomeTax, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.localTax, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, backgroundColor: "#fef2f2" }}>
              {data.employees
                .reduce((s, e) => s + e.otherDeduction, 0)
                .toLocaleString()}
            </td>
            <td style={{ ...cellStyle, fontWeight: 700, color: "#1e40af" }}>
              {data.employees
                .reduce(
                  (s, e) => s + getTotalEarnings(e) - getTotalDeductions(e),
                  0,
                )
                .toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 푸터 */}
      <div style={{ marginTop: "32px" }}>
        <p style={{ fontSize: "10px", color: "#999", marginBottom: "12px" }}>
          ※ 본 임금대장은 근로기준법 제48조에 따라 작성되었으며, 3년간
          보존됩니다. 주민등록번호 등 개인정보는 「개인정보 보호법」에 따라
          보호됩니다.
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "48px" }}
        >
          <div style={{ textAlign: "center" }}>
            <p
              style={{ fontSize: "12px", color: "#666", marginBottom: "24px" }}
            >
              작성자
            </p>
            <p
              style={{
                borderTop: "1px solid #333",
                paddingTop: "8px",
                width: "120px",
              }}
            >
              (인)
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{ fontSize: "12px", color: "#666", marginBottom: "24px" }}
            >
              확인자
            </p>
            <p
              style={{
                borderTop: "1px solid #333",
                paddingTop: "8px",
                width: "120px",
              }}
            >
              (인)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
