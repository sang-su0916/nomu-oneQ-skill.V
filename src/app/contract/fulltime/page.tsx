"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, EmployeeInfo, Employee } from "@/types";
import {
  formatDate,
  formatCurrency,
  formatBusinessNumber,
  formatResidentNumber,
  autoFormatResidentNumber,
  autoFormatPhone,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { MINIMUM_WAGE } from "@/lib/constants";
import HelpGuide from "@/components/HelpGuide";
import InfoTooltip from "@/components/InfoTooltip";
import EmailSendButton from "@/components/EmailSendButton";
import SignatureModal from "@/components/SignatureModal";
import SignaturePad from "@/components/SignaturePad";
import SignedBadge from "@/components/SignedBadge";
import UpgradeModal from "@/components/UpgradeModal";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { usePlanGate } from "@/hooks/usePlanGate";
import MobileFormWizard from "@/components/MobileFormWizard";
import { useAutoSave } from "@/hooks/useAutoSave";
import Breadcrumb from "@/components/Breadcrumb";
import AutoSaveStatus from "@/components/AutoSaveStatus";
import {
  INDUSTRY_PRESETS,
  type IndustryPreset,
} from "@/lib/data/industry-presets";
import {
  calculateComprehensiveWage,
  type ComprehensiveWageResult,
} from "@/lib/calculations/comprehensive-wage";

interface WorkSchedule {
  day: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  hours: number;
}

interface ContractData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  contractDate: string;
  startDate: string;
  workplace: string;
  jobDescription: string;
  position: string;
  department: string;
  scheduleType: "fixed" | "flexible";
  workStartTime: string;
  workEndTime: string;
  breakTime: number;
  workDays: string[];
  exceptionDays: {
    [day: string]: { startTime: string; endTime: string; breakTime: number };
  };
  flexibleSchedule: WorkSchedule[];
  weeklyHolidayDay: string;
  unpaidRestDays: string[];
  baseSalary: number;
  annualSalary: number;
  salaryType: string;
  salaryPeriod: string;
  paymentMethod: string;
  bonusInfo: string;
  mealAllowance: number;
  transportAllowance: number;
  childcareAllowance: number;
  researchAllowance: number;
  vehicleAllowance: number;
  otherAllowance: string;
  otherAllowanceAmount: number;
  paymentDate: number;
  annualLeave: number;
  annualLeaveType: "hireDate" | "fiscalYear";
  probationPeriod: number;
  probationSalaryRate: number;
  useComprehensiveWage: boolean;
  fixedOvertimeHours: number;
  fixedNightHours: number;
  fixedHolidayHours: number;
  /** 포괄임금 역산: 총 고정급 (기본급+연장+야간 합산 금액) */
  comprehensiveTotalPay: number;
  /** 포괄임금 역산: 야간근무 포함 여부 */
  comprehensiveHasNightWork: boolean;
  /** 포괄임금 역산: 야간 휴게시간 (분) */
  comprehensiveNightBreakMinutes: number;
  insurance: {
    national: boolean;
    health: boolean;
    employment: boolean;
    industrial: boolean;
  };
  specialTerms: string;
  includeAnnualLeaveAllowance: boolean;
}

const defaultEmployee: EmployeeInfo = {
  name: "",
  residentNumber: "",
  address: "",
  phone: "",
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const defaultFlexibleSchedule: WorkSchedule[] = WEEKDAYS.map((day) => ({
  day,
  startTime: "",
  endTime: "",
  breakTime: 0,
  hours: 0,
}));

const defaultContract: ContractData = {
  company: defaultCompanyInfo,
  employee: defaultEmployee,
  contractDate: new Date().toISOString().split("T")[0],
  startDate: "",
  workplace: "",
  jobDescription: "",
  position: "",
  department: "",
  scheduleType: "fixed",
  workStartTime: "09:00",
  workEndTime: "18:00",
  breakTime: 60,
  workDays: ["월", "화", "수", "목", "금"],
  exceptionDays: {},
  flexibleSchedule: defaultFlexibleSchedule,
  weeklyHolidayDay: "일",
  unpaidRestDays: ["토"],
  baseSalary: 0,
  annualSalary: 0,
  salaryType: "월급",
  salaryPeriod: "매월 1일 ~ 말일",
  paymentMethod: "근로자 명의 예금통장에 입금",
  bonusInfo: "",
  mealAllowance: 200000,
  transportAllowance: 0,
  childcareAllowance: 0,
  researchAllowance: 0,
  vehicleAllowance: 0,
  otherAllowance: "",
  otherAllowanceAmount: 0,
  paymentDate: 25,
  annualLeave: 15,
  annualLeaveType: "hireDate",
  probationPeriod: 3,
  probationSalaryRate: 100,
  useComprehensiveWage: true,
  fixedOvertimeHours: 0,
  fixedNightHours: 0,
  fixedHolidayHours: 0,
  comprehensiveTotalPay: 0,
  comprehensiveHasNightWork: false,
  comprehensiveNightBreakMinutes: 0,
  insurance: {
    national: true,
    health: true,
    employment: true,
    industrial: true,
  },
  specialTerms: "",
  includeAnnualLeaveAllowance: false,
};

/** 예외 요일을 반영한 주간 총 근로시간 계산 */
function calcWeeklyHours(c: ContractData): { wh: number; wd: number } {
  const ex = c.exceptionDays || {};
  if (c.scheduleType === "flexible") {
    const active = c.flexibleSchedule.filter((s) => s.hours > 0);
    return {
      wh: active.reduce((sum, s) => sum + s.hours, 0),
      wd: active.length,
    };
  }
  const [sh, sm] = c.workStartTime.split(":").map(Number);
  const [eh, em] = c.workEndTime.split(":").map(Number);
  const baseMins = eh * 60 + em - (sh * 60 + sm) - c.breakTime;
  const normalDays = c.workDays.filter((d) => !ex[d]).length;
  let wh = (baseMins * normalDays) / 60;
  for (const [, e] of Object.entries(ex)) {
    const es = e.startTime.split(":").map(Number);
    const ee = e.endTime.split(":").map(Number);
    wh +=
      Math.max(
        0,
        ee[0] * 60 + ee[1] - (es[0] * 60 + es[1]) - (e.breakTime || 0),
      ) / 60;
  }
  return { wh, wd: c.workDays.length };
}

export default function FulltimeContractPage() {
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter(
    (e) => e.status === "active" && e.employmentType === "fulltime",
  );

  const [contract, setContract] = useState<ContractData>(defaultContract);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [showIndustryModal, setShowIndustryModal] = useState(false);

  // ② 자동저장 연동
  const {
    restore,
    clear: clearAutoSave,
    hasSaved,
    lastSavedAt,
  } = useAutoSave("contract_fulltime", contract, !showPreview);
  const [autoSaveRestored, setAutoSaveRestored] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  useEffect(() => {
    setContract((prev) => ({
      ...prev,
      company: companyInfo,
      workplace: companyInfo.address,
    }));
  }, [companyInfo]);

  // 자동저장 복원 (최초 1회)
  useEffect(() => {
    if (!autoSaveRestored && !companyLoading) {
      const saved = restore();
      if (saved) {
        // 기존 데이터 마이그레이션: 예외일 휴게시간 0분 → 30분 (근기법 제54조)
        const migratedExDays = { ...(saved.exceptionDays || {}) };
        const migratedDays: string[] = [];
        for (const [day, ex] of Object.entries(migratedExDays)) {
          const e = ex as {
            startTime: string;
            endTime: string;
            breakTime: number;
          };
          const [sh, sm] = e.startTime.split(":").map(Number);
          const [eh, em] = e.endTime.split(":").map(Number);
          const workMins = eh * 60 + em - (sh * 60 + sm);
          if (workMins >= 240 && e.breakTime < 30) {
            migratedExDays[day] = { ...e, breakTime: 30 };
            migratedDays.push(day);
          }
        }
        if (migratedDays.length > 0) {
          setMigrationMessage(
            `${migratedDays.join(", ")}요일 휴게시간이 자동 수정되었습니다 (근로기준법 제54조: 4시간 이상 근무 시 30분 이상 휴게 필수)`,
          );
        }
        setContract((prev) => ({
          ...prev,
          ...saved,
          company: prev.company,
          workplace: prev.company.address,
          exceptionDays: migratedExDays,
        }));
        setAutoSaveRestored(true);
      }
    }
  }, [companyLoading, autoSaveRestored, restore]);

  // 포괄임금 역산: comprehensiveTotalPay → baseSalary 자동 동기화
  useEffect(() => {
    if (!contract.useComprehensiveWage || contract.comprehensiveTotalPay <= 0)
      return;

    const { wh, wd } = calcWeeklyHours(contract);
    if (wh <= 0 || wd <= 0) return;

    try {
      const result = calculateComprehensiveWage({
        totalMonthlyPay: contract.comprehensiveTotalPay,
        weeklyWorkHours: wh,
        weeklyWorkDays: wd,
        dailyWorkHours: wh / wd,
        workStartTime:
          contract.scheduleType === "fixed" ? contract.workStartTime : "09:00",
        workEndTime:
          contract.scheduleType === "fixed" ? contract.workEndTime : "18:00",
        breakMinutes: contract.breakTime,
        hasNightWork: contract.comprehensiveHasNightWork,
        nightBreakMinutes: contract.comprehensiveNightBreakMinutes,
        fixedHolidayHoursPerWeek: contract.fixedHolidayHours || 0,
      });
      setContract((prev) => ({
        ...prev,
        baseSalary: result.basePay,
        annualSalary: result.basePay * 12,
      }));
    } catch {
      // 계산 불가 시 무시
    }
  }, [
    contract.useComprehensiveWage,
    contract.comprehensiveTotalPay,
    contract.scheduleType,
    contract.workStartTime,
    contract.workEndTime,
    contract.breakTime,
    contract.workDays,
    contract.flexibleSchedule,
    contract.comprehensiveHasNightWork,
    contract.comprehensiveNightBreakMinutes,
    contract.fixedHolidayHours,
    contract.exceptionDays,
  ]);

  // 업종별 프리셋 적용
  const applyIndustryPreset = (preset: IndustryPreset) => {
    const d = preset.defaults;
    const workDays =
      d.workDaysPerWeek === 6
        ? ["월", "화", "수", "목", "금", "토"]
        : ["월", "화", "수", "목", "금"];
    const unpaidRestDays = d.workDaysPerWeek === 6 ? [] : ["토"];

    const exDays: {
      [day: string]: { startTime: string; endTime: string; breakTime: number };
    } = {};
    if (d.saturdayHalf) {
      exDays["토"] = { startTime: "09:00", endTime: "13:00", breakTime: 30 };
    }

    setContract((prev) => ({
      ...prev,
      workDays,
      weeklyHolidayDay: "일",
      unpaidRestDays,
      mealAllowance: d.mealAllowance,
      transportAllowance: d.transportAllowance,
      exceptionDays: exDays,
      comprehensiveHasNightWork: d.nightWorkDefault,
      comprehensiveTotalPay: d.defaultComprehensivePay || 0,
    }));
    setSelectedIndustry(preset.id);
    setShowIndustryModal(false);
  };

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saveAndSign, saving, saved } = useDocumentSave();
  const { canUseFeature } = usePlanGate();
  const [showSignModal, setShowSignModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [employerSignature, setEmployerSignature] = useState<string | null>(
    null,
  );
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(
    null,
  );
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "contract_fulltime",
      title: `정규직 근로계약서 - ${contract.employee.name || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: contract as unknown as Record<string, unknown>,
    });
  };

  const handleRequestSign = () => {
    if (!canUseFeature("e_signature")) {
      setShowUpgradeModal(true);
      return;
    }
    setShowSignModal(true);
  };

  const handleSignComplete = async (signatures: {
    employer?: string;
    employee?: string;
  }) => {
    setEmployerSignature(signatures.employer || null);
    setEmployeeSignature(signatures.employee || null);
    const now = new Date().toISOString();
    setSignedAt(now);

    // 서명 포함 저장
    const combinedSigUrl = signatures.employer || signatures.employee || "";
    await saveAndSign({
      docType: "contract_fulltime",
      title: `정규직 근로계약서 - ${contract.employee.name || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: {
        ...(contract as unknown as Record<string, unknown>),
        employerSignature: signatures.employer || null,
        employeeSignature: signatures.employee || null,
      },
      signatureUrl: combinedSigUrl,
      signedBy: contract.company.ceoName,
    });
  };

  const isSigned = !!signedAt;

  // 직원 선택 시 정보 자동 입력
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) return;

    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    const otherAllowance = emp.salary.otherAllowances?.[0];

    setContract((prev) => ({
      ...prev,
      employee: emp.info,
      startDate: emp.hireDate || prev.startDate,
      department: emp.department || prev.department,
      position: emp.position || prev.position,
      salaryType: emp.salary.type === "monthly" ? "월급" : "시급",
      workStartTime: emp.workCondition.workStartTime || prev.workStartTime,
      workEndTime: emp.workCondition.workEndTime || prev.workEndTime,
      breakTime: emp.workCondition.breakTime || prev.breakTime,
      workDays:
        emp.workCondition.workDays?.length > 0
          ? emp.workCondition.workDays
          : prev.workDays,
      baseSalary: emp.salary.baseSalary || prev.baseSalary,
      annualSalary: emp.salary.baseSalary
        ? emp.salary.baseSalary * 12
        : prev.annualSalary,
      mealAllowance: emp.salary.mealAllowance ?? prev.mealAllowance,
      vehicleAllowance: emp.salary.carAllowance ?? prev.vehicleAllowance,
      childcareAllowance:
        emp.salary.childcareAllowance ?? prev.childcareAllowance,
      researchAllowance: emp.salary.researchAllowance || prev.researchAllowance,
      bonusInfo: emp.salary.bonusInfo || prev.bonusInfo,
      otherAllowance: otherAllowance?.name || prev.otherAllowance,
      otherAllowanceAmount: otherAllowance?.amount || prev.otherAllowanceAmount,
      insurance: emp.insurance,
    }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `정규직_근로계약서_${contract.employee.name || "이름없음"}`,
  });

  // 연봉 ↔ 월급 자동 계산 포함
  const updateContract = (field: string, value: unknown) => {
    setContract((prev) => {
      const next = { ...prev, [field]: value };
      if (
        field === "annualSalary" &&
        typeof value === "number" &&
        value > 0 &&
        prev.baseSalary === 0
      ) {
        next.baseSalary = Math.round(value / 12);
      }
      return next;
    });
  };

  const updateEmployee = (field: keyof EmployeeInfo, value: string) => {
    setContract((prev) => ({
      ...prev,
      employee: { ...prev.employee, [field]: value },
    }));
  };

  const toggleWorkDay = (day: string) => {
    setContract((prev) => {
      const isRemoving = prev.workDays.includes(day);
      const newWorkDays = isRemoving
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day];
      const prevEx = prev.exceptionDays || {};
      let newEx = { ...prevEx };
      if (isRemoving) {
        // 요일 해제 시 예외도 제거
        delete newEx[day];
      } else if (day === "토" || day === "일") {
        // 토/일 추가 시 자동으로 반일(09:00~13:00) 예외 설정 (4시간 근무 → 휴게 30분 필수)
        newEx[day] = { startTime: "09:00", endTime: "13:00", breakTime: 30 };
      }
      return { ...prev, workDays: newWorkDays, exceptionDays: newEx };
    });
  };

  const updateFlexibleSchedule = (
    index: number,
    field: keyof WorkSchedule,
    value: string | number,
  ) => {
    setContract((prev) => {
      const newSchedule = [...prev.flexibleSchedule];
      newSchedule[index] = { ...newSchedule[index], [field]: value };

      if (newSchedule[index].startTime && newSchedule[index].endTime) {
        const start = newSchedule[index].startTime.split(":").map(Number);
        const end = newSchedule[index].endTime.split(":").map(Number);
        const minutes =
          end[0] * 60 +
          end[1] -
          (start[0] * 60 + start[1]) -
          (newSchedule[index].breakTime || 0);
        newSchedule[index].hours =
          Math.round((Math.max(0, minutes) / 60) * 10) / 10;
      }

      return { ...prev, flexibleSchedule: newSchedule };
    });
  };

  const toggleUnpaidRestDay = (day: string) => {
    setContract((prev) => ({
      ...prev,
      unpaidRestDays: prev.unpaidRestDays.includes(day)
        ? prev.unpaidRestDays.filter((d) => d !== day)
        : [...prev.unpaidRestDays, day],
    }));
  };

  const toggleInsurance = (key: keyof typeof contract.insurance) => {
    setContract((prev) => ({
      ...prev,
      insurance: { ...prev.insurance, [key]: !prev.insurance[key] },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "계약서", href: "/contract" },
          { label: "정규직 근로계약서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            📄 정규직 근로계약서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            고용노동부 표준 양식 기반 + 실무 강화
          </p>
          <AutoSaveStatus lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSigned && signedAt && (
            <SignedBadge signedAt={signedAt} signatureUrl={employerSignature} />
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
            disabled={isSigned && !showPreview}
          >
            {showPreview ? (isSigned ? "📄 보기" : "✏️ 수정") : "👁️ 미리보기"}
          </button>
          {showPreview && !isSigned && (
            <button
              onClick={handleSaveToArchive}
              disabled={saving}
              className="btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
          )}
          {showPreview && !isSigned && (
            <button
              onClick={handleRequestSign}
              disabled={!contract.employee.name}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              ✍️ 전자서명 요청
            </button>
          )}
          {showPreview && (
            <EmailSendButton
              documentTitle={`정규직 근로계약서 — ${contract.employee.name || "미입력"}`}
              documentType="정규직 근로계약서"
              recipientName={contract.employee.name}
              printRef={printRef}
            />
          )}
          <button
            onClick={() => {
              try {
                handlePrint();
              } catch {
                window.print();
              }
            }}
            className="btn-primary"
            title="계약서를 인쇄하거나 PDF로 저장합니다"
          >
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

      {/* ② 자동저장 복원 배너 */}
      {autoSaveRestored && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
          <span className="text-sm text-amber-700">
            이전에 작성하던 계약서가 복원되었습니다.
          </span>
          <button
            onClick={() => {
              clearAutoSave();
              setContract({
                ...defaultContract,
                company: companyInfo,
                workplace: companyInfo.address,
              });
              setAutoSaveRestored(false);
              setMigrationMessage(null);
            }}
            className="text-xs text-amber-600 underline hover:text-amber-800"
          >
            새로 작성
          </button>
        </div>
      )}
      {migrationMessage && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
          <span className="text-sm text-blue-700">ℹ️ {migrationMessage}</span>
          <button
            onClick={() => setMigrationMessage(null)}
            className="text-xs text-blue-600 hover:text-blue-800 ml-2 shrink-0"
          >
            확인
          </button>
        </div>
      )}

      {/* 전역 검증 배너 */}
      {!showPreview &&
        (() => {
          const globalWarnings: string[] = [];
          {
            // 포괄임금 시: 역산된 기본급(baseSalary)이 최저임금 이상이어야 함
            // 포괄총액이 높아도 연장/야간/휴일수당 차감 후 기본급이 최저임금 미달이면 위법
            const checkBaseSalary = contract.baseSalary;
            if (checkBaseSalary > 0 && checkBaseSalary < MINIMUM_WAGE.monthly) {
              const isComprehensive =
                contract.useComprehensiveWage &&
                (contract.comprehensiveTotalPay > 0 || checkBaseSalary > 0);
              globalWarnings.push(
                isComprehensive
                  ? `최저임금 미달: 포괄임금 역산 기본급 ${checkBaseSalary.toLocaleString()}원이 2026년 최저임금(${MINIMUM_WAGE.monthly.toLocaleString()}원)보다 낮습니다. 연장·야간·휴일수당을 제외한 기본급이 최저임금 이상이어야 합니다.`
                  : `최저임금 미달: 월 기본급 ${checkBaseSalary.toLocaleString()}원이 2026년 최저임금(${MINIMUM_WAGE.monthly.toLocaleString()}원)보다 낮습니다.`,
              );
            }
          }
          if (
            contract.baseSalary === 0 &&
            contract.comprehensiveTotalPay === 0
          ) {
            globalWarnings.push(
              '급여가 설정되지 않았습니다. 5단계 "급여·보험"에서 월급 또는 포괄임금 총액을 입력해주세요.',
            );
          }
          if (
            contract.useComprehensiveWage &&
            contract.comprehensiveTotalPay > 0
          ) {
            const cwCheck = calcWeeklyHours(contract);
            if (cwCheck.wh > 0 && cwCheck.wd > 0) {
              try {
                const cwRes = calculateComprehensiveWage({
                  totalMonthlyPay: contract.comprehensiveTotalPay,
                  weeklyWorkHours: cwCheck.wh,
                  weeklyWorkDays: cwCheck.wd,
                  dailyWorkHours: cwCheck.wh / cwCheck.wd,
                  workStartTime:
                    contract.scheduleType === "fixed"
                      ? contract.workStartTime
                      : "09:00",
                  workEndTime:
                    contract.scheduleType === "fixed"
                      ? contract.workEndTime
                      : "18:00",
                  breakMinutes: contract.breakTime,
                  hasNightWork: contract.comprehensiveHasNightWork,
                  nightBreakMinutes: contract.comprehensiveNightBreakMinutes,
                });
                if (!cwRes.validation.meetsMinimumWage) {
                  globalWarnings.push(
                    `포괄임금 역산 시급 ${cwRes.validation.effectiveHourlyWage.toLocaleString()}원이 최저시급 ${cwRes.validation.minimumHourlyWage.toLocaleString()}원 미만입니다.`,
                  );
                }
              } catch {
                /* ignore */
              }
            }
          }
          const whCheck = calcWeeklyHours(contract);
          if (whCheck.wh > 52) {
            globalWarnings.push(
              `주 ${whCheck.wh.toFixed(1)}시간으로 법정 한도(52시간)를 초과합니다.`,
            );
          }
          if (globalWarnings.length === 0) return null;
          return (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-xl">
              <p className="text-sm font-bold text-red-700 mb-2">검증 경고</p>
              <ul className="list-disc list-inside space-y-1">
                {globalWarnings.map((w, i) => (
                  <li key={i} className="text-sm text-red-600">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

      {/* 업종별 프리셋 선택 */}
      {!showPreview && !autoSaveRestored && (
        <div className="mb-6">
          {!selectedIndustry ? (
            <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
                어떤 업종이세요? 업종에 맞는 기본값을 자동 설정합니다.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {INDUSTRY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyIndustryPreset(preset)}
                    className="flex flex-col items-center gap-1.5 p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] hover:shadow-sm transition-all text-center"
                  >
                    <span className="text-2xl">{preset.icon}</span>
                    <span className="text-xs font-medium text-[var(--text)]">
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] leading-tight">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span>
                업종:{" "}
                <strong className="text-[var(--text)]">
                  {
                    INDUSTRY_PRESETS.find((p) => p.id === selectedIndustry)
                      ?.icon
                  }{" "}
                  {
                    INDUSTRY_PRESETS.find((p) => p.id === selectedIndustry)
                      ?.label
                  }
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedIndustry(null)}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                변경
              </button>
            </div>
          )}
        </div>
      )}

      <HelpGuide
        pageKey="contract-fulltime-v3"
        steps={[
          "① 업종을 먼저 고르세요 (음식점·사무직·제조업 등). 근로시간과 수당이 자동 설정됩니다.",
          '② "직원 선택"으로 등록된 직원을 고르면 이름·급여가 자동 입력됩니다.',
          '③ 근로시간: 매일 같으면 "고정", 요일마다 다르면 "요일별 상이"를 선택하세요.',
          "④ 급여: 연봉을 입력하면 월급이 자동 계산됩니다. 최저임금 미달 시 경고가 나타나요.",
          '⑤ "미리보기"로 확인 후 인쇄하세요. 직원에게 반드시 1부를 나눠줘야 합니다 (법적 의무).',
        ]}
      />

      {!showPreview ? (
        <MobileFormWizard
          steps={[
            {
              title: "사업장·근로자",
              icon: "🏢",
              validate: () =>
                !!contract.employee.name && !!contract.employee.residentNumber,
              validationMessage:
                "근로자의 성명과 주민등록번호는 필수 입력 항목입니다.",
              helpText:
                "등록된 직원을 선택하면 모든 정보가 자동 입력됩니다. 신규 직원이면 직접 입력하세요.",
              summary: [
                { label: "회사", value: contract.company.name },
                { label: "근로자", value: contract.employee.name },
              ],
              content: (
                <div className="space-y-6">
                  {/* 회사 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">🏢 사용자(회사) 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">회사명</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.name}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">사업자등록번호</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={formatBusinessNumber(
                            contract.company.businessNumber,
                          )}
                          readOnly
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">주소</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.address}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">대표자</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.ceoName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.phone}
                          readOnly
                        />
                      </div>
                    </div>
                    {!contract.company.name && !companyLoading && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2">
                        <span className="text-amber-500 text-lg shrink-0">
                          ⚠️
                        </span>
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            회사 정보가 등록되지 않았습니다
                          </p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            계약서에 회사명·사업자번호·대표자가 빈칸으로
                            인쇄됩니다.{" "}
                            <a
                              href="/settings"
                              className="font-bold underline hover:text-amber-800"
                            >
                              설정에서 등록하기 →
                            </a>
                          </p>
                        </div>
                      </div>
                    )}
                    {contract.company.name && (
                      <p className="text-xs text-[var(--text-light)] mt-2">
                        * 회사 정보는{" "}
                        <a
                          href="/settings"
                          className="text-[var(--primary)] underline hover:opacity-80"
                        >
                          설정
                        </a>
                        에서 수정할 수 있습니다.
                      </p>
                    )}
                  </div>

                  {/* 근로자 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">👤 근로자 정보</h2>

                    {/* 직원 선택 (연동) */}
                    {employees.length === 0 && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-semibold text-blue-800 mb-1">
                          💡 직원을 먼저 등록하면 훨씬 편합니다
                        </p>
                        <p className="text-xs text-blue-600 mb-2">
                          한 번 등록하면 이름·주소·급여·근무조건이 이 계약서에
                          자동 반영됩니다. 직접 입력도 가능합니다.
                        </p>
                        <a
                          href="/employees"
                          className="inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:opacity-90"
                        >
                          직원 등록하러 가기 →
                        </a>
                      </div>
                    )}
                    {employees.length > 0 && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <label className="input-label text-blue-700">
                          🔗 등록된 직원에서 선택
                        </label>
                        <select
                          className="input-field mt-1"
                          value={selectedEmployeeId}
                          onChange={(e) => handleEmployeeSelect(e.target.value)}
                        >
                          <option value="">직접 입력</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.info.name} ({emp.department || "부서없음"} /{" "}
                              {emp.position || "직위없음"})
                            </option>
                          ))}
                        </select>
                        {selectedEmployeeId ? (
                          <>
                            <p className="text-xs text-green-700 mt-1 font-medium">
                              ✅ 직원 정보가 자동 입력되었습니다. 아래에서
                              필요한 항목을 수정할 수 있습니다.
                            </p>
                            {!contract.employee.residentNumber && (
                              <p className="text-xs text-amber-700 mt-1 font-medium">
                                ⚠️ 주민등록번호가 등록되어 있지 않습니다.
                                아래에서 직접 입력하거나,{" "}
                                <a
                                  href="/employees"
                                  className="underline font-bold hover:text-amber-900"
                                >
                                  직원 관리
                                </a>
                                에서 수정해주세요.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-blue-600 mt-1">
                            💡 직원을 선택하면
                            이름·주민번호·주소·연락처·근무조건·임금 등 모든
                            정보가 자동으로 입력됩니다.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">성명 *</label>
                        <input
                          type="text"
                          className={`input-field ${!contract.employee.name ? "border-red-300" : ""}`}
                          placeholder="홍길동"
                          value={contract.employee.name}
                          onChange={(e) =>
                            updateEmployee("name", e.target.value)
                          }
                        />
                        {!contract.employee.name && (
                          <p className="text-xs text-red-500 mt-1">
                            성명을 입력해주세요
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">주민등록번호 *</label>
                        <input
                          type="text"
                          className={`input-field ${!contract.employee.residentNumber ? "border-red-300" : ""}`}
                          placeholder="990101-1234567"
                          value={contract.employee.residentNumber}
                          onChange={(e) =>
                            updateEmployee(
                              "residentNumber",
                              autoFormatResidentNumber(e.target.value),
                            )
                          }
                          maxLength={14}
                        />
                        {!contract.employee.residentNumber && (
                          <p className="text-xs text-red-500 mt-1">
                            주민등록번호를 입력해주세요
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">주소 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="서울시 강남구 테헤란로 123"
                          value={contract.employee.address}
                          onChange={(e) =>
                            updateEmployee("address", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="010-1234-5678"
                          value={contract.employee.phone}
                          onChange={(e) =>
                            updateEmployee(
                              "phone",
                              autoFormatPhone(e.target.value),
                            )
                          }
                          maxLength={13}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "계약·수습",
              icon: "📅",
              validate: () => !!contract.startDate,
              validationMessage: "근무 시작일을 입력해주세요.",
              helpText:
                "계약 체결일은 오늘 날짜가 기본값입니다. 수습기간은 최대 3개월이며, 수습 급여 감액 시 최저임금의 90% 이상이어야 합니다.",
              summary: [
                { label: "시작일", value: contract.startDate },
                { label: "부서", value: contract.department },
                {
                  label: "수습",
                  value:
                    contract.probationPeriod > 0
                      ? `${contract.probationPeriod}개월`
                      : "없음",
                },
              ],
              content: (
                <div className="space-y-6">
                  {/* 계약 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">📅 계약 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">계약 체결일 *</label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.contractDate}
                          onChange={(e) =>
                            updateContract("contractDate", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">근무 시작일 *</label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.startDate}
                          onChange={(e) =>
                            updateContract("startDate", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">부서</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 개발팀, 영업부"
                          value={contract.department}
                          onChange={(e) =>
                            updateContract("department", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">직위/직책</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 사원, 대리, 과장"
                          value={contract.position}
                          onChange={(e) =>
                            updateContract("position", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">근무 장소 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="본사 사무실"
                          value={contract.workplace}
                          onChange={(e) =>
                            updateContract("workplace", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">업무 내용 *</label>
                        <textarea
                          className="input-field min-h-[80px]"
                          placeholder="예: 소프트웨어 개발 및 유지보수, 고객 상담 업무 등"
                          value={contract.jobDescription}
                          onChange={(e) =>
                            updateContract("jobDescription", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 수습기간 선택 */}
                  <div className="form-section">
                    <h2 className="form-section-title">📝 수습기간</h2>
                    <div>
                      <label className="input-label">
                        수습기간 (개월){" "}
                        <InfoTooltip
                          simple="1년 이상 근로계약 시에만 설정 가능. 3개월 이내 최저임금 90% 감액 가능, 해고예고 30일 적용 제외"
                          legal="근로기준법 제35조, 최저임금법 제5조②"
                        />
                      </label>
                      <select
                        className="input-field"
                        value={contract.probationPeriod}
                        onChange={(e) =>
                          updateContract(
                            "probationPeriod",
                            parseInt(e.target.value),
                          )
                        }
                      >
                        <option value={0}>없음</option>
                        <option value={1}>1개월</option>
                        <option value={2}>2개월</option>
                        <option value={3}>3개월</option>
                      </select>
                      {contract.probationPeriod === 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          수습기간 없이 정식 채용합니다.
                        </p>
                      )}
                      {contract.probationPeriod > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <strong>⚠️ 수습기간 유의사항</strong>
                          <ul className="mt-1 space-y-0.5 list-disc list-inside">
                            <li>
                              수습기간은 <strong>1년 이상 근로계약</strong>을
                              체결한 경우에만 설정 가능합니다 (근로기준법 §35)
                            </li>
                            <li>
                              수습 3개월 이내: 최저임금의 90%까지 감액 가능
                            </li>
                            <li>수습 3개월 초과: 최저임금 감액 불가</li>
                            <li>
                              해고예고 예외: 수습 3개월 이내 근로자는
                              해고예고(30일) 적용 제외
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "수습 상세",
              icon: "📝",
              visible: () => contract.probationPeriod > 0,
              helpText: `수습기간은 ${contract.probationPeriod}개월로 설정되었습니다. 수습 중 급여를 감액할 경우 최저임금의 90% 이상이어야 합니다 (근로기준법 제35조). 수습기간이 3개월을 초과하면 감액이 불가합니다.`,
              summary: [
                {
                  label: "수습",
                  value: `${contract.probationPeriod}개월 (${contract.probationSalaryRate}%)`,
                },
              ],
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      📝 수습기간 급여 설정
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      수습기간 <strong>{contract.probationPeriod}개월</strong>{" "}
                      동안의 급여 조건을 설정합니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">
                          수습기간 급여 비율 (%)
                        </label>
                        <select
                          className="input-field"
                          value={contract.probationSalaryRate}
                          onChange={(e) =>
                            updateContract(
                              "probationSalaryRate",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          <option value={100}>100% (동일)</option>
                          <option value={90}>90% (법정 최저 감액)</option>
                        </select>
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          * 근로기준법상 수습 3개월간 최저임금의 90%까지만 감액
                          가능
                        </p>
                        {contract.probationSalaryRate < 100 &&
                          contract.baseSalary > 0 &&
                          (() => {
                            const probationMonthly = Math.round(
                              (contract.baseSalary *
                                contract.probationSalaryRate) /
                                100,
                            );
                            const minProbationMonthly = Math.round(
                              MINIMUM_WAGE.monthly * 0.9,
                            );
                            return probationMonthly < minProbationMonthly ? (
                              <p className="text-red-500 text-xs mt-1 font-medium">
                                ⚠️ 수습 월급 {formatCurrency(probationMonthly)}
                                이 최저임금 90%(
                                {formatCurrency(minProbationMonthly)})에
                                미달합니다.
                              </p>
                            ) : null;
                          })()}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "근무시간",
              icon: "⏰",
              validate: () => {
                if (contract.scheduleType === "fixed") {
                  return (
                    contract.workDays.length > 0 &&
                    !!contract.workStartTime &&
                    !!contract.workEndTime
                  );
                }
                return contract.flexibleSchedule.some((s) => s.hours > 0);
              },
              validationMessage: "근무 요일과 시간을 입력해주세요.",
              helpText:
                '"고정 스케줄"은 매일 같은 시간 근무, "요일별 상이"는 요일마다 다른 시간 설정이 가능합니다. 주 소정근로시간은 40시간이 법정 상한입니다 (근로기준법 제50조).',
              summary: [
                {
                  label: "근무",
                  value:
                    contract.scheduleType === "fixed"
                      ? `${contract.workStartTime}~${contract.workEndTime}`
                      : "요일별 상이",
                },
                { label: "근무일", value: contract.workDays.join(", ") || "-" },
              ],
              content: (
                <div className="space-y-6">
                  {/* 근로시간 */}
                  <div className="form-section">
                    <h2 className="form-section-title">⏰ 근로시간</h2>

                    <div className="mb-4">
                      <label className="input-label">근무 형태</label>
                      <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scheduleType"
                            checked={contract.scheduleType === "fixed"}
                            onChange={() =>
                              updateContract("scheduleType", "fixed")
                            }
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>고정 스케줄</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="scheduleType"
                            checked={contract.scheduleType === "flexible"}
                            onChange={() =>
                              updateContract("scheduleType", "flexible")
                            }
                            className="w-4 h-4 text-blue-600"
                          />
                          <span>요일별 상이</span>
                        </label>
                      </div>
                    </div>

                    {contract.scheduleType === "fixed" ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="input-label">시작 시간</label>
                            <input
                              type="time"
                              className="input-field"
                              value={contract.workStartTime}
                              onChange={(e) =>
                                updateContract("workStartTime", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="input-label">종료 시간</label>
                            <input
                              type="time"
                              className="input-field"
                              value={contract.workEndTime}
                              onChange={(e) =>
                                updateContract("workEndTime", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="input-label">휴게시간 (분)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={contract.breakTime || ""}
                              onChange={(e) =>
                                updateContract(
                                  "breakTime",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                            {(() => {
                              const [bsh, bsm] = contract.workStartTime
                                .split(":")
                                .map(Number);
                              const [beh, bem] = contract.workEndTime
                                .split(":")
                                .map(Number);
                              const bMins = beh * 60 + bem - (bsh * 60 + bsm);
                              if (bMins >= 480 && contract.breakTime < 60)
                                return (
                                  <p className="text-xs text-red-600 font-medium mt-1">
                                    ⚠️ 8시간 이상 근무 시 휴게 60분 이상 필수
                                    (근로기준법 제54조)
                                  </p>
                                );
                              if (bMins >= 240 && contract.breakTime < 30)
                                return (
                                  <p className="text-xs text-red-600 font-medium mt-1">
                                    ⚠️ 4시간 이상 근무 시 휴게 30분 이상 필수
                                    (근로기준법 제54조)
                                  </p>
                                );
                              return null;
                            })()}
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="input-label">근무 요일</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {WEEKDAYS.map((day) => {
                              const ex = contract.exceptionDays || {};
                              const isException =
                                contract.workDays.includes(day) && !!ex[day];
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleWorkDay(day)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    isException
                                      ? "bg-amber-500 text-white"
                                      : contract.workDays.includes(day)
                                        ? "bg-blue-500 text-white"
                                        : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"
                                  }`}
                                >
                                  {day}
                                  {isException ? " *" : ""}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 예외 요일 설정 UI */}
                        {contract.workDays.length > 0 && (
                          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm font-semibold text-amber-800 mb-2">
                              시간이 다른 요일이 있나요?
                            </p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {contract.workDays.map((day) => {
                                const ex = contract.exceptionDays || {};
                                const isEx = !!ex[day];
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                      setContract((prev) => {
                                        const prevEx = prev.exceptionDays || {};
                                        const newEx = { ...prevEx };
                                        if (newEx[day]) {
                                          delete newEx[day];
                                        } else {
                                          newEx[day] = {
                                            startTime: "09:00",
                                            endTime: "13:00",
                                            breakTime: 30,
                                          };
                                        }
                                        return {
                                          ...prev,
                                          exceptionDays: newEx,
                                        };
                                      });
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      isEx
                                        ? "bg-amber-500 text-white"
                                        : "bg-white text-amber-700 border border-amber-300 hover:bg-amber-100"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            {(() => {
                              const ex = contract.exceptionDays || {};
                              const exDays = contract.workDays.filter(
                                (d) => !!ex[d],
                              );
                              if (exDays.length === 0) {
                                return (
                                  <p className="text-xs text-amber-600">
                                    모든 근무일에 동일한 시간이 적용됩니다
                                  </p>
                                );
                              }
                              return (
                                <div className="space-y-2">
                                  {exDays.map((day) => {
                                    const exd = ex[day] || {
                                      startTime: "09:00",
                                      endTime: "13:00",
                                      breakTime: 30,
                                    };
                                    const exS = exd.startTime
                                      .split(":")
                                      .map(Number);
                                    const exE = exd.endTime
                                      .split(":")
                                      .map(Number);
                                    const exWorkMins =
                                      exE[0] * 60 +
                                      exE[1] -
                                      (exS[0] * 60 + exS[1]);
                                    const needBreak30 =
                                      exWorkMins >= 240 &&
                                      (exd.breakTime || 0) < 30;
                                    const needBreak60 =
                                      exWorkMins >= 480 &&
                                      (exd.breakTime || 0) < 60;
                                    return (
                                      <div key={day}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-medium text-amber-800 w-8">
                                            {day}
                                          </span>
                                          <input
                                            type="time"
                                            className="input-field py-1 w-28 text-sm"
                                            value={exd.startTime}
                                            onChange={(e) =>
                                              setContract((prev) => {
                                                const prevEx =
                                                  prev.exceptionDays || {};
                                                return {
                                                  ...prev,
                                                  exceptionDays: {
                                                    ...prevEx,
                                                    [day]: {
                                                      ...(prevEx[day] || {
                                                        startTime: "09:00",
                                                        endTime: "13:00",
                                                        breakTime: 30,
                                                      }),
                                                      startTime: e.target.value,
                                                    },
                                                  },
                                                };
                                              })
                                            }
                                          />
                                          <span className="text-amber-600">
                                            ~
                                          </span>
                                          <input
                                            type="time"
                                            className="input-field py-1 w-28 text-sm"
                                            value={exd.endTime}
                                            onChange={(e) =>
                                              setContract((prev) => {
                                                const prevEx =
                                                  prev.exceptionDays || {};
                                                return {
                                                  ...prev,
                                                  exceptionDays: {
                                                    ...prevEx,
                                                    [day]: {
                                                      ...(prevEx[day] || {
                                                        startTime: "09:00",
                                                        endTime: "13:00",
                                                        breakTime: 30,
                                                      }),
                                                      endTime: e.target.value,
                                                    },
                                                  },
                                                };
                                              })
                                            }
                                          />
                                          <span className="text-xs text-amber-600">
                                            휴게
                                          </span>
                                          <input
                                            type="number"
                                            className="input-field py-1 w-16 text-sm"
                                            value={exd.breakTime || ""}
                                            onChange={(e) =>
                                              setContract((prev) => {
                                                const prevEx =
                                                  prev.exceptionDays || {};
                                                return {
                                                  ...prev,
                                                  exceptionDays: {
                                                    ...prevEx,
                                                    [day]: {
                                                      ...(prevEx[day] || {
                                                        startTime: "09:00",
                                                        endTime: "13:00",
                                                        breakTime: 30,
                                                      }),
                                                      breakTime:
                                                        parseInt(
                                                          e.target.value,
                                                        ) || 0,
                                                    },
                                                  },
                                                };
                                              })
                                            }
                                          />
                                          <span className="text-xs text-amber-600">
                                            분
                                          </span>
                                        </div>
                                        {(needBreak30 || needBreak60) && (
                                          <p className="text-xs text-red-600 font-medium mt-1 ml-10">
                                            ⚠️{" "}
                                            {needBreak60
                                              ? "8시간 이상 근무 시 휴게 60분 이상 필수"
                                              : "4시간 이상 근무 시 휴게 30분 이상 필수"}{" "}
                                            (근로기준법 제54조)
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-blue-50">
                              <th className="border p-2 text-left">요일</th>
                              <th className="border p-2">시작</th>
                              <th className="border p-2">종료</th>
                              <th className="border p-2">휴게(분)</th>
                              <th className="border p-2">근로시간</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contract.flexibleSchedule.map(
                              (schedule, index) => (
                                <tr key={schedule.day}>
                                  <td className="border p-2 font-medium">
                                    {schedule.day}요일
                                  </td>
                                  <td className="border p-2">
                                    <input
                                      type="time"
                                      className="input-field py-1"
                                      value={schedule.startTime}
                                      onChange={(e) =>
                                        updateFlexibleSchedule(
                                          index,
                                          "startTime",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <input
                                      type="time"
                                      className="input-field py-1"
                                      value={schedule.endTime}
                                      onChange={(e) =>
                                        updateFlexibleSchedule(
                                          index,
                                          "endTime",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="border p-2">
                                    <input
                                      type="number"
                                      className="input-field py-1 w-20"
                                      value={schedule.breakTime || ""}
                                      onChange={(e) =>
                                        updateFlexibleSchedule(
                                          index,
                                          "breakTime",
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="border p-2 text-center font-medium text-blue-600">
                                    {schedule.hours > 0
                                      ? `${schedule.hours}시간`
                                      : "-"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 실시간 근로시간 계산 표시 */}
                    {(() => {
                      let rawWeeklyHours = 0;
                      let dailyHours = 0;
                      let dailyMins = 0;
                      let workDayCount = 0;

                      if (
                        contract.scheduleType === "fixed" &&
                        contract.workDays.length > 0
                      ) {
                        const startHour = parseInt(
                          contract.workStartTime.split(":")[0],
                        );
                        const startMin = parseInt(
                          contract.workStartTime.split(":")[1],
                        );
                        const endHour = parseInt(
                          contract.workEndTime.split(":")[0],
                        );
                        const endMin = parseInt(
                          contract.workEndTime.split(":")[1],
                        );
                        const totalMinutes =
                          endHour * 60 +
                          endMin -
                          (startHour * 60 + startMin) -
                          contract.breakTime;
                        dailyHours = Math.floor(totalMinutes / 60);
                        dailyMins = totalMinutes % 60;
                        const ex = contract.exceptionDays || {};
                        const normalDayCount = contract.workDays.filter(
                          (d) => !ex[d],
                        ).length;
                        rawWeeklyHours = (totalMinutes * normalDayCount) / 60;
                        for (const [, e] of Object.entries(ex)) {
                          const es = e.startTime.split(":").map(Number);
                          const ee = e.endTime.split(":").map(Number);
                          rawWeeklyHours +=
                            Math.max(
                              0,
                              ee[0] * 60 +
                                ee[1] -
                                (es[0] * 60 + es[1]) -
                                (e.breakTime || 0),
                            ) / 60;
                        }
                        workDayCount = contract.workDays.length;
                      } else if (contract.scheduleType === "flexible") {
                        const activeSchedules =
                          contract.flexibleSchedule.filter((s) => s.hours > 0);
                        rawWeeklyHours = activeSchedules.reduce(
                          (sum, s) => sum + s.hours,
                          0,
                        );
                        workDayCount = activeSchedules.length;
                      }

                      if (workDayCount === 0) return null;

                      const weeklyPrescribedHours = Math.min(
                        rawWeeklyHours,
                        40,
                      );
                      const weeklyOvertimeHours = Math.max(
                        rawWeeklyHours - 40,
                        0,
                      );

                      return (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>📊 계산된 근로시간</strong>
                          </p>
                          {contract.scheduleType === "fixed" && (
                            <p className="text-sm text-blue-700 mt-1">
                              • 1일 소정근로시간:{" "}
                              <strong>
                                {dailyHours}시간{" "}
                                {dailyMins > 0 ? `${dailyMins}분` : ""}
                              </strong>
                            </p>
                          )}
                          <p className="text-sm text-blue-700">
                            • 주 소정근로시간:{" "}
                            <strong>{weeklyPrescribedHours}시간</strong>{" "}
                            (법정상한)
                          </p>
                          {weeklyOvertimeHours > 0 && (
                            <p className="text-sm text-red-600 font-medium mt-1">
                              ⚠️ 주 연장근로시간:{" "}
                              <strong>
                                {weeklyOvertimeHours.toFixed(1)}시간
                              </strong>{" "}
                              (통상임금 50% 가산)
                            </p>
                          )}
                          <p className="text-xs text-blue-600 mt-2">
                            ※ 근로기준법 제50조: 주 소정근로시간은 40시간이
                            상한입니다.
                          </p>
                        </div>
                      );
                    })()}

                    {/* 주간 캘린더 시각화 */}
                    {contract.workDays.length > 0 && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          주간 근무 캘린더
                        </p>
                        <div className="grid grid-cols-7 gap-1">
                          {WEEKDAYS.map((day) => {
                            const ex = contract.exceptionDays || {};
                            const isWorkDay = contract.workDays.includes(day);
                            const isHoliday = day === contract.weeklyHolidayDay;
                            const isUnpaid =
                              contract.unpaidRestDays.includes(day);
                            const isException = isWorkDay && !!ex[day];

                            let bgColor = "bg-gray-50 border-gray-200";
                            let textColor = "text-gray-400";
                            let statusText = "무급휴무";

                            if (isHoliday) {
                              bgColor = "bg-red-50 border-red-200";
                              textColor = "text-red-600";
                              statusText = "주휴";
                            } else if (isException) {
                              bgColor = "bg-amber-50 border-amber-200";
                              textColor = "text-amber-700";
                              const es = ex[day].startTime
                                .split(":")
                                .map(Number);
                              const ee = ex[day].endTime.split(":").map(Number);
                              const mins = Math.max(
                                0,
                                ee[0] * 60 +
                                  ee[1] -
                                  (es[0] * 60 + es[1]) -
                                  (ex[day].breakTime || 0),
                              );
                              statusText = `${(mins / 60).toFixed(1)}h`;
                            } else if (isWorkDay) {
                              bgColor = "bg-blue-50 border-blue-200";
                              textColor = "text-blue-700";
                              if (contract.scheduleType === "fixed") {
                                const sh = parseInt(
                                  contract.workStartTime.split(":")[0],
                                );
                                const sm2 = parseInt(
                                  contract.workStartTime.split(":")[1],
                                );
                                const eh2 = parseInt(
                                  contract.workEndTime.split(":")[0],
                                );
                                const em2 = parseInt(
                                  contract.workEndTime.split(":")[1],
                                );
                                const mins =
                                  eh2 * 60 +
                                  em2 -
                                  (sh * 60 + sm2) -
                                  contract.breakTime;
                                statusText = `${(mins / 60).toFixed(1)}h`;
                              } else {
                                statusText = "근무";
                              }
                            } else if (isUnpaid) {
                              statusText = "무급";
                            }

                            return (
                              <div
                                key={day}
                                className={`p-2 rounded border text-center ${bgColor}`}
                              >
                                <p className={`text-xs font-bold ${textColor}`}>
                                  {day}
                                </p>
                                <p
                                  className={`text-[10px] mt-0.5 ${textColor}`}
                                >
                                  {statusText}
                                </p>
                                {isException && (
                                  <p className="text-[9px] text-amber-500 mt-0.5">
                                    {ex[day].startTime}~{ex[day].endTime}
                                  </p>
                                )}
                                {isWorkDay &&
                                  !isException &&
                                  contract.scheduleType === "fixed" && (
                                    <p className="text-[9px] text-blue-400 mt-0.5">
                                      {contract.workStartTime}~
                                      {contract.workEndTime}
                                    </p>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-blue-200"></span>{" "}
                            근무
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-amber-200"></span>{" "}
                            예외시간
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-red-200"></span>{" "}
                            주휴
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-gray-200"></span>{" "}
                            무급휴무
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="input-label">
                        주휴일 (유급, 주 1일) *
                      </label>
                      <select
                        className="input-field"
                        value={contract.weeklyHolidayDay}
                        onChange={(e) =>
                          updateContract("weeklyHolidayDay", e.target.value)
                        }
                      >
                        {WEEKDAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}요일
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-[var(--text-light)] mt-1">
                        근로기준법 제55조 - 1주 1회 유급 주휴일 (토요일은
                        무급휴무일)
                      </p>
                    </div>
                    <div className="mt-4">
                      <label className="input-label">
                        무급휴무일 (해당 시 선택)
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {WEEKDAYS.filter(
                          (day) => day !== contract.weeklyHolidayDay,
                        ).map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleUnpaidRestDay(day)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              contract.unpaidRestDays.includes(day)
                                ? "bg-gray-600 text-white"
                                : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-light)] mt-1">
                        무급휴무일은 유급이 아닌 쉬는 날입니다 (예: 토요일)
                      </p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "급여·보험",
              icon: "💰",
              validate: () => {
                // 기본급이 0이면 진행 차단 (급여 미입력)
                if (
                  contract.baseSalary === 0 &&
                  contract.comprehensiveTotalPay === 0
                )
                  return false;
                // 최저임금 미달은 경고만 (진행은 허용)
                return true;
              },
              validationMessage:
                contract.baseSalary === 0 &&
                contract.comprehensiveTotalPay === 0
                  ? "급여를 입력해주세요. 월 기본급 또는 포괄임금 총액 중 하나를 입력하세요."
                  : contract.useComprehensiveWage
                    ? `포괄임금 역산 기본급(${contract.baseSalary.toLocaleString()}원)이 최저임금(${MINIMUM_WAGE.monthly.toLocaleString()}원)에 미달합니다. 포괄 총액을 높이거나 연장근로시간을 줄여주세요.`
                    : `월 기본급이 2026년 최저임금(${MINIMUM_WAGE.monthly.toLocaleString()}원)에 미달합니다.`,
              helpText:
                "연봉을 입력하면 월급이 자동 계산됩니다. 비과세 수당(식대, 차량유지비 등)은 각각 월 20만원까지 비과세 혜택이 적용됩니다.",
              summary: [
                {
                  label: "기본급",
                  value:
                    contract.baseSalary > 0
                      ? `${contract.baseSalary.toLocaleString()}원`
                      : "",
                },
              ],
              content: (
                <div className="space-y-6">
                  {/* Sticky 급여 요약 바 (포괄임금 수당 포함) */}
                  {contract.baseSalary > 0 &&
                    (() => {
                      let stickyTotal =
                        contract.baseSalary +
                        (contract.mealAllowance || 0) +
                        (contract.vehicleAllowance || 0) +
                        (contract.childcareAllowance || 0) +
                        (contract.researchAllowance || 0) +
                        (contract.otherAllowanceAmount || 0);
                      let stickyOt = 0,
                        stickyHol = 0;
                      if (contract.useComprehensiveWage) {
                        const sTotalPay =
                          contract.comprehensiveTotalPay > 0
                            ? contract.comprehensiveTotalPay
                            : contract.baseSalary;
                        const sCalc = calcWeeklyHours(contract);
                        if (sTotalPay > 0 && sCalc.wh > 0 && sCalc.wd > 0) {
                          try {
                            const sRes = calculateComprehensiveWage({
                              totalMonthlyPay: sTotalPay,
                              weeklyWorkHours: sCalc.wh,
                              weeklyWorkDays: sCalc.wd,
                              dailyWorkHours: sCalc.wh / sCalc.wd,
                              workStartTime:
                                contract.scheduleType === "fixed"
                                  ? contract.workStartTime
                                  : "09:00",
                              workEndTime:
                                contract.scheduleType === "fixed"
                                  ? contract.workEndTime
                                  : "18:00",
                              breakMinutes: contract.breakTime,
                              hasNightWork: contract.comprehensiveHasNightWork,
                              nightBreakMinutes:
                                contract.comprehensiveNightBreakMinutes,
                              fixedHolidayHoursPerWeek:
                                contract.fixedHolidayHours || 0,
                            });
                            stickyOt = sRes.fixedOvertimePay;
                            stickyHol = sRes.fixedHolidayPay;
                            stickyTotal +=
                              stickyOt + (sRes.fixedNightPay || 0) + stickyHol;
                          } catch {
                            /* 무시 */
                          }
                        }
                      }
                      return (
                        <div className="sticky top-0 z-10 p-3 bg-blue-600 text-white rounded-lg shadow-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              월 급여 합계 (세전)
                            </span>
                            <span className="text-lg font-bold">
                              {formatCurrency(stickyTotal)}
                            </span>
                          </div>
                          {(stickyOt > 0 || stickyHol > 0) && (
                            <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-blue-200">
                              <span>
                                기본급 {formatCurrency(contract.baseSalary)}
                              </span>
                              {stickyOt > 0 && (
                                <span>+ 연장 {formatCurrency(stickyOt)}</span>
                              )}
                              {stickyHol > 0 && (
                                <span>+ 휴일 {formatCurrency(stickyHol)}</span>
                              )}
                              {(contract.mealAllowance || 0) > 0 && (
                                <span>+ 수당</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  {/* 급여 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      💰 임금 (근로기준법 제17조 필수)
                    </h2>
                    {contract.baseSalary > 0 &&
                      contract.baseSalary < MINIMUM_WAGE.monthly && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-lg mb-4">
                          <p className="text-sm font-medium text-red-700">
                            ⚠️ 기본급({contract.baseSalary.toLocaleString()}
                            원)이 2026년 최저임금(
                            {MINIMUM_WAGE.monthly.toLocaleString()}원)에
                            미달합니다.
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {contract.useComprehensiveWage
                              ? "포괄임금 총액을 높이거나 연장근로시간을 조정해주세요."
                              : "기본급을 최저임금 이상으로 설정해주세요."}
                          </p>
                        </div>
                      )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">급여 형태 *</label>
                        <select
                          className="input-field"
                          value={contract.salaryType}
                          onChange={(e) =>
                            updateContract("salaryType", e.target.value)
                          }
                        >
                          <option value="월급">월급제</option>
                          <option value="연봉">연봉제</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">연봉 (원)</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="36000000"
                          value={contract.annualSalary || ""}
                          onChange={(e) => {
                            const annual = parseInt(e.target.value) || 0;
                            setContract((prev) => ({
                              ...prev,
                              annualSalary: annual,
                              baseSalary: Math.round(annual / 12),
                            }));
                          }}
                        />
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          {contract.annualSalary > 0 &&
                            `= ${formatCurrency(contract.annualSalary)}`}
                        </p>
                      </div>
                      <div>
                        <label className="input-label">월 기본급 (원) *</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="3000000"
                          value={contract.baseSalary || ""}
                          onChange={(e) => {
                            const monthly = parseInt(e.target.value) || 0;
                            setContract((prev) => ({
                              ...prev,
                              baseSalary: monthly,
                              annualSalary: monthly * 12,
                            }));
                          }}
                        />
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          {contract.baseSalary > 0 &&
                            `= ${formatCurrency(contract.baseSalary)} (세전)`}
                        </p>
                      </div>
                      <div>
                        <label className="input-label">지급방법 *</label>
                        <select
                          className="input-field"
                          value={contract.paymentMethod}
                          onChange={(e) =>
                            updateContract("paymentMethod", e.target.value)
                          }
                        >
                          <option value="근로자 명의 예금통장에 입금">
                            근로자 명의 예금통장 입금
                          </option>
                          <option value="현금 직접 지급">현금 직접 지급</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">급여 지급일</label>
                        <select
                          className="input-field"
                          value={contract.paymentDate}
                          onChange={(e) =>
                            updateContract(
                              "paymentDate",
                              parseInt(e.target.value),
                            )
                          }
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(
                            (day) => (
                              <option key={day} value={day}>
                                매월 {day}일
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">임금산정기간 *</label>
                        <select
                          className="input-field"
                          value={contract.salaryPeriod}
                          onChange={(e) =>
                            updateContract("salaryPeriod", e.target.value)
                          }
                        >
                          <option value="매월 1일 ~ 말일">
                            매월 1일 ~ 말일
                          </option>
                          <option value="매월 16일 ~ 익월 15일">
                            매월 16일 ~ 익월 15일
                          </option>
                          <option value="매월 21일 ~ 익월 20일">
                            매월 21일 ~ 익월 20일
                          </option>
                          <option value="매월 26일 ~ 익월 25일">
                            매월 26일 ~ 익월 25일
                          </option>
                        </select>
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          임금을 산정하는 기간 (필수 기재사항)
                        </p>
                      </div>
                      <div>
                        <label className="input-label">상여금</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 연 400% (설/추석 각 100%, 하계/연말 각 100%)"
                          value={contract.bonusInfo}
                          onChange={(e) =>
                            updateContract("bonusInfo", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">식대 (비과세, 월)</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="200000"
                          value={contract.mealAllowance || ""}
                          onChange={(e) =>
                            updateContract(
                              "mealAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.mealAllowance > 200000 ? (
                          <p className="text-xs text-red-500 mt-1 font-medium">
                            ⚠️ 월 20만원 초과분은 과세 대상 (초과:{" "}
                            {formatCurrency(contract.mealAllowance - 200000)})
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            월 20만원까지 비과세
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">
                          교통비 (월) - 내부 관리용
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="100000"
                          value={contract.transportAllowance || ""}
                          onChange={(e) =>
                            updateContract(
                              "transportAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <p className="text-xs text-amber-600 mt-1">
                          ※ 내부 관리용이며 계약서에는 표시되지 않습니다
                        </p>
                      </div>
                      <div>
                        <label className="input-label">
                          자가운전보조금 (비과세, 월)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="200000"
                          value={contract.vehicleAllowance || ""}
                          onChange={(e) =>
                            updateContract(
                              "vehicleAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.vehicleAllowance > 200000 ? (
                          <p className="text-xs text-red-500 mt-1 font-medium">
                            ⚠️ 월 20만원 초과분은 과세 대상 (초과:{" "}
                            {formatCurrency(contract.vehicleAllowance - 200000)}
                            )
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            본인 차량 업무사용 시 월 20만원 비과세
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">
                          보육수당 (비과세, 월)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="200000"
                          value={contract.childcareAllowance || ""}
                          onChange={(e) =>
                            updateContract(
                              "childcareAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.childcareAllowance > 200000 ? (
                          <p className="text-xs text-red-500 mt-1 font-medium">
                            ⚠️ 월 20만원 초과분은 과세 대상 (초과:{" "}
                            {formatCurrency(
                              contract.childcareAllowance - 200000,
                            )}
                            )
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            6세 이하 자녀 보육 시 월 20만원 비과세
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">
                          연구보조비 (비과세, 월)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="200000"
                          value={contract.researchAllowance || ""}
                          onChange={(e) =>
                            updateContract(
                              "researchAllowance",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.researchAllowance > 200000 ? (
                          <p className="text-xs text-red-500 mt-1 font-medium">
                            ⚠️ 월 20만원 초과분은 과세 대상 (초과:{" "}
                            {formatCurrency(
                              contract.researchAllowance - 200000,
                            )}
                            )
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            기업부설연구소·연구개발전담부서 소속 연구원 한정, 월
                            20만원 비과세
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">기타 수당 내역</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 직책수당, 자격수당"
                          value={contract.otherAllowance}
                          onChange={(e) =>
                            updateContract("otherAllowance", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          기타 수당 금액 (월)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="300000"
                          value={contract.otherAllowanceAmount || ""}
                          onChange={(e) =>
                            updateContract(
                              "otherAllowanceAmount",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.otherAllowanceAmount > 0 && (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            = {formatCurrency(contract.otherAllowanceAmount)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">연차휴가 (일)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={contract.annualLeave}
                          onChange={(e) =>
                            updateContract(
                              "annualLeave",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <p className="text-xs text-amber-600 mt-1">
                          ※ 내부 참조용이며 계약서에는 &apos;근로기준법에
                          따른다&apos;로 표시됩니다
                        </p>
                      </div>
                      <div>
                        <label className="input-label">
                          연차휴가 산정기준 (내부 참조용)
                        </label>
                        <select
                          className="input-field"
                          value={contract.annualLeaveType}
                          onChange={(e) =>
                            updateContract("annualLeaveType", e.target.value)
                          }
                        >
                          <option value="hireDate">
                            입사일 기준 (개인별 입사일로부터 1년)
                          </option>
                          <option value="fiscalYear">
                            회계연도 기준 (1월 1일 ~ 12월 31일)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* 연차미사용수당 선지급 토글 */}
                    <div className="mt-4 p-4 border border-[var(--border)] rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="font-medium text-sm">
                            연차미사용수당 임금 항목 포함
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            연차미사용수당을 임금구성 항목으로 계약서에
                            명시합니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateContract(
                              "includeAnnualLeaveAllowance",
                              !contract.includeAnnualLeaveAllowance,
                            )
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                            contract.includeAnnualLeaveAllowance
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition-transform ${
                              contract.includeAnnualLeaveAllowance
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </label>
                      {contract.includeAnnualLeaveAllowance &&
                        contract.baseSalary > 0 &&
                        (() => {
                          const [sh, sm] = contract.workStartTime
                            .split(":")
                            .map(Number);
                          const [eh, em] = contract.workEndTime
                            .split(":")
                            .map(Number);
                          const totalMins =
                            eh * 60 + em - (sh * 60 + sm) - contract.breakTime;
                          const wh =
                            (totalMins * contract.workDays.length) / 60;
                          const wd = contract.workDays.length;
                          const wph = Math.min(wh, 40);
                          const dph = wd > 0 ? wph / wd : 8;
                          const mph = Math.round(((wph + dph) * 365) / 12 / 7);
                          const hw = mph > 0 ? contract.baseSalary / mph : 0;
                          const annualLeaveMonthly = Math.round(
                            (hw * dph * (contract.annualLeave || 15)) / 12,
                          );
                          return (
                            <div className="mt-3 p-3 bg-blue-50 rounded text-xs text-blue-800">
                              자동 계산:{" "}
                              <strong>
                                {formatCurrency(annualLeaveMonthly)}
                              </strong>
                              /월
                              <span className="text-blue-600 ml-1">
                                (시급 {formatCurrency(Math.round(hw))} ×{" "}
                                {dph.toFixed(1)}h × {contract.annualLeave || 15}
                                일 ÷ 12)
                              </span>
                            </div>
                          );
                        })()}
                    </div>

                    {/* 포괄임금제 */}
                    <div className="form-section mt-6">
                      <h2 className="form-section-title">📋 포괄임금제</h2>
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>
                            월급에 연장/야간 수당을 포함하여 지급하는
                            방식입니다.
                          </strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          포괄 고정급 총액을 입력하면, 기본급과 각종 수당이
                          자동으로 역산됩니다. 실제 초과근로분은 별도
                          지급합니다.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input
                          type="checkbox"
                          checked={!contract.useComprehensiveWage}
                          onChange={(e) =>
                            updateContract(
                              "useComprehensiveWage",
                              !e.target.checked,
                            )
                          }
                          className="w-5 h-5 accent-gray-500"
                        />
                        <span className="font-medium text-[var(--text-muted)]">
                          포괄임금제 미적용
                        </span>
                      </label>
                      {contract.useComprehensiveWage &&
                        (() => {
                          // 근로시간 계산 (예외 요일 반영)
                          const cwCalc = calcWeeklyHours(contract);
                          const wh = cwCalc.wh;
                          const wd = cwCalc.wd;
                          const canCalc =
                            contract.comprehensiveTotalPay > 0 &&
                            wh > 0 &&
                            wd > 0;

                          let cwResult: ComprehensiveWageResult | null = null;
                          if (canCalc) {
                            try {
                              cwResult = calculateComprehensiveWage({
                                totalMonthlyPay: contract.comprehensiveTotalPay,
                                weeklyWorkHours: wh,
                                weeklyWorkDays: wd,
                                dailyWorkHours: wh / wd,
                                workStartTime:
                                  contract.scheduleType === "fixed"
                                    ? contract.workStartTime
                                    : "09:00",
                                workEndTime:
                                  contract.scheduleType === "fixed"
                                    ? contract.workEndTime
                                    : "18:00",
                                breakMinutes: contract.breakTime,
                                hasNightWork:
                                  contract.comprehensiveHasNightWork,
                                nightBreakMinutes:
                                  contract.comprehensiveNightBreakMinutes,
                                fixedHolidayHoursPerWeek:
                                  contract.fixedHolidayHours || 0,
                              });
                            } catch {
                              /* 계산 불가 무시 */
                            }
                          }

                          return (
                            <div className="space-y-4">
                              {/* 포괄 고정급 입력 */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="input-label">
                                    월 총 급여 (포괄 고정급) *{" "}
                                    <InfoTooltip
                                      simple="기본급+고정 연장수당+고정 야간수당을 합산한 총액. 이 금액에서 기본급과 수당을 역산합니다"
                                      legal="대법원 2024.12.19 전합판결 — 통상임금 고정성 요건 폐지"
                                    />
                                  </label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    placeholder="예: 3000000"
                                    min={0}
                                    value={contract.comprehensiveTotalPay || ""}
                                    onChange={(e) =>
                                      updateContract(
                                        "comprehensiveTotalPay",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  <p className="text-xs text-[var(--text-light)] mt-1">
                                    기본급 + 연장수당 + 야간수당을 모두 포함한
                                    월 총 고정급
                                  </p>
                                </div>
                                <div>
                                  <label className="input-label">
                                    야간근무 포함
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                                    <input
                                      type="checkbox"
                                      className="w-5 h-5 accent-blue-600"
                                      checked={
                                        contract.comprehensiveHasNightWork
                                      }
                                      onChange={(e) =>
                                        updateContract(
                                          "comprehensiveHasNightWork",
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    <span className="text-sm">
                                      22:00~06:00 야간 근무 있음
                                    </span>
                                  </label>
                                  {contract.comprehensiveHasNightWork && (
                                    <div className="mt-2">
                                      <label className="input-label">
                                        야간 휴게시간 (분)
                                      </label>
                                      <select
                                        className="input-field"
                                        value={
                                          contract.comprehensiveNightBreakMinutes
                                        }
                                        onChange={(e) =>
                                          updateContract(
                                            "comprehensiveNightBreakMinutes",
                                            parseInt(e.target.value),
                                          )
                                        }
                                      >
                                        <option value={0}>없음 (0분)</option>
                                        <option value={30}>30분</option>
                                        <option value={60}>60분</option>
                                        <option value={90}>90분</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 포함 수당 안내 */}
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                  포함 수당 항목
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={wh > 40}
                                      readOnly
                                      className="w-4 h-4 accent-blue-600"
                                    />
                                    연장근로수당{" "}
                                    {wh > 40 ? (
                                      <span className="text-blue-600 text-xs">
                                        (주 {(wh - 40).toFixed(1)}h 초과 — 자동)
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">
                                        (주 40시간 이하 — 해당없음)
                                      </span>
                                    )}
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 accent-blue-600"
                                      checked={
                                        contract.comprehensiveHasNightWork
                                      }
                                      onChange={(e) =>
                                        updateContract(
                                          "comprehensiveHasNightWork",
                                          e.target.checked,
                                        )
                                      }
                                    />
                                    야간근로수당{" "}
                                    <span className="text-gray-400 text-xs">
                                      (22:00~06:00 근무 시)
                                    </span>
                                  </label>
                                </div>
                              </div>

                              {/* 고정 휴일근로시간 입력 */}
                              <div>
                                <label className="input-label">
                                  고정 휴일근로시간 (주당)
                                </label>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    className="input-field w-24"
                                    placeholder="0"
                                    min={0}
                                    max={24}
                                    value={contract.fixedHolidayHours || ""}
                                    onChange={(e) =>
                                      updateContract(
                                        "fixedHolidayHours",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  <span className="text-sm text-[var(--text-muted)]">
                                    시간/주
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-light)] mt-1">
                                  매주 고정적으로 휴일에 근무하는 시간
                                  (통상임금의 150% 가산)
                                </p>
                                {contract.fixedHolidayHours > 0 && (
                                  <p className="text-xs text-blue-600 mt-1 font-medium">
                                    월{" "}
                                    {(
                                      contract.fixedHolidayHours * 4.345
                                    ).toFixed(1)}
                                    시간 × 150% = 포괄임금에 포함
                                  </p>
                                )}
                              </div>

                              {/* 최저임금 미달 경고 */}
                              {cwResult &&
                                !cwResult.validation.meetsMinimumWage && (
                                  <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                    <p className="text-sm font-bold text-red-700 mb-1">
                                      ⚠️ 최저임금 미달 — 근로계약 체결 불가
                                    </p>
                                    <p className="text-sm text-red-600">
                                      역산 시급{" "}
                                      <strong>
                                        {formatCurrency(
                                          cwResult.validation
                                            .effectiveHourlyWage,
                                        )}
                                      </strong>
                                      이 2026년 최저시급{" "}
                                      <strong>
                                        {formatCurrency(
                                          cwResult.validation.minimumHourlyWage,
                                        )}
                                      </strong>
                                      보다 낮습니다.
                                    </p>
                                    <p className="text-sm text-red-600 mt-1">
                                      최저 포괄 고정급:{" "}
                                      <strong>
                                        {formatCurrency(
                                          Math.ceil(
                                            cwResult.validation
                                              .minimumHourlyWage *
                                              cwResult.breakdown
                                                .totalEquivalentHours,
                                          ),
                                        )}
                                      </strong>{" "}
                                      이상이어야 합니다.
                                    </p>
                                  </div>
                                )}

                              {/* 연장근로 한도 초과 경고 */}
                              {cwResult &&
                                cwResult.validation
                                  .exceedsWeeklyOvertimeLimit && (
                                  <div className="p-3 bg-orange-50 border border-orange-400 rounded-lg">
                                    <p className="text-sm font-medium text-orange-700">
                                      ⚠️ 주당 연장근로가 법정 한도(12시간)를
                                      초과합니다. 특별연장근로 인가가 필요할 수
                                      있습니다.
                                    </p>
                                  </div>
                                )}

                              {/* 역산 결과 분개 */}
                              {cwResult &&
                                cwResult.validation.meetsMinimumWage && (
                                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm font-semibold text-blue-800 mb-3">
                                      📊 임금 역산 결과 (역산 시급:{" "}
                                      {formatCurrency(cwResult.hourlyWage)})
                                    </p>
                                    <div className="grid grid-cols-1 gap-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-blue-700">
                                          기본급 (시급 × 209h)
                                        </span>
                                        <strong className="text-blue-900">
                                          {formatCurrency(cwResult.basePay)}
                                        </strong>
                                      </div>
                                      {cwResult.fixedOvertimePay > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">
                                            고정 연장수당 (월{" "}
                                            {cwResult.breakdown.monthlyOvertimeHours.toFixed(
                                              1,
                                            )}
                                            h × 150%)
                                          </span>
                                          <strong className="text-blue-900">
                                            {formatCurrency(
                                              cwResult.fixedOvertimePay,
                                            )}
                                          </strong>
                                        </div>
                                      )}
                                      {cwResult.fixedNightPay > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">
                                            고정 야간수당 (월{" "}
                                            {cwResult.breakdown.monthlyNightHours.toFixed(
                                              1,
                                            )}
                                            h × 50%)
                                          </span>
                                          <strong className="text-blue-900">
                                            {formatCurrency(
                                              cwResult.fixedNightPay,
                                            )}
                                          </strong>
                                        </div>
                                      )}
                                      {cwResult.fixedHolidayPay > 0 && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">
                                            고정 휴일수당 (월{" "}
                                            {cwResult.breakdown.monthlyHolidayHours.toFixed(
                                              1,
                                            )}
                                            h × 150%)
                                          </span>
                                          <strong className="text-blue-900">
                                            {formatCurrency(
                                              cwResult.fixedHolidayPay,
                                            )}
                                          </strong>
                                        </div>
                                      )}
                                      <div className="flex justify-between pt-2 mt-1 border-t border-blue-300">
                                        <span className="font-bold text-blue-900">
                                          합계
                                        </span>
                                        <strong className="text-blue-900">
                                          {formatCurrency(cwResult.totalPay)}
                                        </strong>
                                      </div>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2">
                                      ※ 위 기본급(
                                      {formatCurrency(cwResult.basePay)})이
                                      근로계약서 기본급에 자동 반영됩니다.
                                    </p>
                                  </div>
                                )}

                              {!canCalc && (
                                <p className="text-xs text-[var(--text-light)]">
                                  포괄 고정급 총액을 입력하고 근무시간(근무조건
                                  섹션)을 설정하면 자동으로 역산됩니다.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                    </div>

                    {/* 실시간 월급 합계 */}
                    {(contract.baseSalary > 0 ||
                      contract.mealAllowance > 0 ||
                      contract.otherAllowanceAmount > 0) && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 font-medium mb-2">
                          💰 월급 합계 (세전)
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-green-700">
                          {contract.baseSalary > 0 && (
                            <p>기본급: {formatCurrency(contract.baseSalary)}</p>
                          )}
                          {contract.mealAllowance > 0 && (
                            <p>
                              식대: {formatCurrency(contract.mealAllowance)}
                            </p>
                          )}
                          {contract.vehicleAllowance > 0 && (
                            <p>
                              차량: {formatCurrency(contract.vehicleAllowance)}
                            </p>
                          )}
                          {contract.childcareAllowance > 0 && (
                            <p>
                              보육:{" "}
                              {formatCurrency(contract.childcareAllowance)}
                            </p>
                          )}
                          {contract.researchAllowance > 0 && (
                            <p>
                              연구: {formatCurrency(contract.researchAllowance)}
                            </p>
                          )}
                          {contract.otherAllowanceAmount > 0 && (
                            <p>
                              기타:{" "}
                              {formatCurrency(contract.otherAllowanceAmount)}
                            </p>
                          )}
                        </div>
                        <p className="text-base font-bold text-green-700 mt-3 pt-3 border-t border-green-300">
                          합계:{" "}
                          {formatCurrency(
                            contract.baseSalary +
                              (contract.mealAllowance || 0) +
                              (contract.vehicleAllowance || 0) +
                              (contract.childcareAllowance || 0) +
                              (contract.researchAllowance || 0) +
                              (contract.otherAllowanceAmount || 0),
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4대보험 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🏥 사회보험 가입{" "}
                      <span className="text-xs font-normal text-zinc-400">
                        2026년 기준
                      </span>
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { key: "national", label: "국민연금", rate: "4.75%" },
                        { key: "health", label: "건강보험", rate: "3.595%" },
                        { key: "employment", label: "고용보험", rate: "0.9%" },
                        {
                          key: "industrial",
                          label: "산재보험",
                          rate: "전액 사업주",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 cursor-pointer p-3 bg-[var(--bg)] rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={
                              contract.insurance[
                                item.key as keyof typeof contract.insurance
                              ]
                            }
                            onChange={() =>
                              toggleInsurance(
                                item.key as keyof typeof contract.insurance,
                              )
                            }
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div>
                            <span className="text-[var(--text)] font-medium">
                              {item.label}
                            </span>
                            <p className="text-xs text-[var(--text-light)]">
                              {item.rate}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "특약·서명",
              icon: "✍️",
              helpText:
                "특약사항은 선택 입력입니다. 비밀유지, 경업금지, 복리후생 등 추가 약정을 자유롭게 기재하세요. 전자서명을 사용할 수 있습니다.",
              content: (
                <div className="space-y-6">
                  {/* 특약사항 */}
                  <div className="form-section">
                    <h2 className="form-section-title">📋 특약사항</h2>
                    <textarea
                      className="input-field min-h-[100px]"
                      placeholder="예: 비밀유지 의무, 경업금지 조항, 특별 복리후생 등"
                      value={contract.specialTerms}
                      onChange={(e) =>
                        updateContract("specialTerms", e.target.value)
                      }
                    />
                  </div>

                  {/* 전자서명 (인라인) */}
                  <div className="form-section">
                    <h2 className="form-section-title">✍️ 전자서명</h2>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                      아래에서 사업주와 근로자의 서명을 직접 입력할 수 있습니다.
                      서명 완료 후 미리보기 및 인쇄 시 서명이 포함됩니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <SignaturePad
                          label="👔 사업주 서명"
                          onSave={(dataUrl) => setEmployerSignature(dataUrl)}
                          width={360}
                          height={150}
                          initialValue={employerSignature || undefined}
                        />
                      </div>
                      <div>
                        <SignaturePad
                          label="👤 근로자 서명"
                          onSave={(dataUrl) => setEmployeeSignature(dataUrl)}
                          width={360}
                          height={150}
                          initialValue={employeeSignature || undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
          onComplete={() => {
            clearAutoSave();
            setShowPreview(true);
          }}
          completeLabel="👁️ 미리보기"
        />
      ) : (
        /* 미리보기 */
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8">
          <ContractPreview
            contract={contract}
            employerSignature={employerSignature}
            employeeSignature={employeeSignature}
          />
        </div>
      )}

      {/* 인쇄용 (숨겨진 영역) */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
        }}
      >
        <div ref={printRef}>
          <ContractPreview
            contract={contract}
            employerSignature={employerSignature}
            employeeSignature={employeeSignature}
          />
        </div>
      </div>

      {/* 전자서명 모달 */}
      <SignatureModal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        onComplete={handleSignComplete}
        docType="contract_fulltime"
        docTitle={`정규직 근로계약서 - ${contract.employee.name || "이름없음"}`}
        mode="dual"
        summary={[
          { label: "사업장", value: contract.company.name },
          { label: "근로자", value: contract.employee.name || "-" },
          { label: "근무시작일", value: contract.startDate || "-" },
          {
            label: "월 기본급",
            value: contract.baseSalary
              ? `${contract.baseSalary.toLocaleString()}원`
              : "-",
          },
        ]}
      />

      {/* 안내 모달 */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="전자서명 안내"
        message="전자서명 기능을 사용할 수 있습니다."
      />
    </div>
  );
}

function ContractPreview({
  contract,
  employerSignature,
  employeeSignature,
}: {
  contract: ContractData;
  employerSignature?: string | null;
  employeeSignature?: string | null;
}) {
  const insuranceList = [];
  if (contract.insurance.national) insuranceList.push("국민연금");
  if (contract.insurance.health) insuranceList.push("건강보험");
  if (contract.insurance.employment) insuranceList.push("고용보험");
  if (contract.insurance.industrial) insuranceList.push("산재보험");

  // 소정근로시간 계산 (예외 요일 반영)
  let dailyHours = 0;
  let dailyMins = 0;
  let rawWeeklyHours = 0;
  let workDayCount = 0;
  const previewEx = contract.exceptionDays || {};

  if (contract.scheduleType === "flexible") {
    const activeSchedules = contract.flexibleSchedule.filter(
      (s) => s.hours > 0,
    );
    rawWeeklyHours = activeSchedules.reduce((sum, s) => sum + s.hours, 0);
    workDayCount = activeSchedules.length;
  } else {
    const startHour = parseInt(contract.workStartTime.split(":")[0]);
    const startMin = parseInt(contract.workStartTime.split(":")[1]);
    const endHour = parseInt(contract.workEndTime.split(":")[0]);
    const endMin = parseInt(contract.workEndTime.split(":")[1]);
    const totalMinutes =
      endHour * 60 + endMin - (startHour * 60 + startMin) - contract.breakTime;
    dailyHours = Math.floor(totalMinutes / 60);
    dailyMins = totalMinutes % 60;
    const normalDays = contract.workDays.filter((d) => !previewEx[d]).length;
    rawWeeklyHours = (totalMinutes * normalDays) / 60;
    for (const [, e] of Object.entries(previewEx)) {
      const es = e.startTime.split(":").map(Number);
      const ee = e.endTime.split(":").map(Number);
      rawWeeklyHours +=
        Math.max(
          0,
          ee[0] * 60 + ee[1] - (es[0] * 60 + es[1]) - (e.breakTime || 0),
        ) / 60;
    }
    workDayCount = contract.workDays.length;
  }
  const hasExceptionDays =
    contract.scheduleType === "fixed" && Object.keys(previewEx).length > 0;

  // 근로기준법 제50조: 주 소정근로시간은 40시간 상한
  const weeklyPrescribedHours = Math.min(rawWeeklyHours, 40);
  const weeklyOvertimeHours = Math.max(rawWeeklyHours - 40, 0);

  // 월 소정근로시간 동적 계산: (주 소정근로시간 + 유급주휴시간) × (365/12/7)
  // 소정근로일수: 주 40시간 초과 시 예외일(토요일 등)은 연장근로일이므로 제외
  let prescribedDayCount = workDayCount;
  if (contract.scheduleType === "fixed" && rawWeeklyHours > 40) {
    const regularDayCount = contract.workDays.filter(
      (d) => !previewEx[d],
    ).length;
    if (regularDayCount > 0 && regularDayCount < workDayCount) {
      prescribedDayCount = regularDayCount;
    }
  }
  const dailyPrescribedHours =
    prescribedDayCount > 0 ? weeklyPrescribedHours / prescribedDayCount : 8;
  const monthlyPrescribedHours = Math.round(
    ((weeklyPrescribedHours + dailyPrescribedHours) * 365) / 12 / 7,
  );

  // 포괄임금 역산 결과 (미리보기용)
  // comprehensiveTotalPay가 0이면 baseSalary를 총액으로 사용 (기본급만 입력한 경우)
  const effectiveTotalPay =
    contract.comprehensiveTotalPay > 0
      ? contract.comprehensiveTotalPay
      : contract.baseSalary;
  let previewCwResult: ComprehensiveWageResult | null = null;
  if (
    contract.useComprehensiveWage &&
    effectiveTotalPay > 0 &&
    rawWeeklyHours > 0 &&
    workDayCount > 0
  ) {
    try {
      previewCwResult = calculateComprehensiveWage({
        totalMonthlyPay: effectiveTotalPay,
        weeklyWorkHours: rawWeeklyHours,
        weeklyWorkDays: workDayCount,
        dailyWorkHours: rawWeeklyHours / workDayCount,
        workStartTime:
          contract.scheduleType === "fixed" ? contract.workStartTime : "09:00",
        workEndTime:
          contract.scheduleType === "fixed" ? contract.workEndTime : "18:00",
        breakMinutes: contract.breakTime,
        hasNightWork: contract.comprehensiveHasNightWork,
        nightBreakMinutes: contract.comprehensiveNightBreakMinutes,
        fixedHolidayHoursPerWeek: contract.fixedHolidayHours || 0,
      });
    } catch {
      /* 무시 */
    }
  }

  const fixedOvertimePay = previewCwResult
    ? previewCwResult.fixedOvertimePay
    : 0;
  const fixedNightPay = previewCwResult ? previewCwResult.fixedNightPay : 0;
  const fixedHolidayPay = previewCwResult ? previewCwResult.fixedHolidayPay : 0;
  const comprehensiveTotal = fixedOvertimePay + fixedNightPay + fixedHolidayPay;

  // 총 월급 계산 (기본급 + 비과세수당 + 포괄수당)
  // 포괄임금 시: 포괄총액(basePay+수당 포함) + 비과세수당 = 총 월급
  // 포괄총액이 설정되면 baseSalary+comprehensiveTotal 대신 포괄총액 사용 (이중 합산 방지)
  const nonTaxAllowances =
    (contract.mealAllowance || 0) +
    (contract.childcareAllowance || 0) +
    (contract.researchAllowance || 0) +
    (contract.vehicleAllowance || 0) +
    (contract.otherAllowanceAmount || 0);
  const comprehensivePortion =
    contract.useComprehensiveWage && previewCwResult
      ? effectiveTotalPay // 포괄총액 = basePay + 연장/야간/휴일수당 포함
      : contract.baseSalary;
  const totalMonthlySalary = comprehensivePortion + nonTaxAllowances;

  const cellStyle = {
    border: "1px solid #d1d5db",
    padding: "10px 14px",
    verticalAlign: "top" as const,
  };
  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#f8fafc",
    fontWeight: 600,
    width: "140px",
    color: "#374151",
  };
  const sectionHeaderStyle = {
    backgroundColor: "#1e40af",
    color: "white",
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "0.5px",
  };

  return (
    <div
      className="contract-document"
      style={{
        fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif",
        color: "#1f2937",
        lineHeight: 1.6,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "32px",
          borderBottom: "3px solid #1e40af",
          paddingBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1e40af",
            marginBottom: "8px",
            letterSpacing: "2px",
          }}
        >
          근 로 계 약 서
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Standard Employment Contract
        </p>
      </div>

      {/* 서문 */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #e5e7eb",
        }}
      >
        <p style={{ fontSize: "14px", lineHeight: 1.8 }}>
          <strong style={{ color: "#1e40af" }}>{contract.company.name}</strong>{" "}
          (이하 {'"'}사용자{'"'}라 함)과
          <strong style={{ color: "#1e40af" }}>
            {" "}
            {contract.employee.name}
          </strong>{" "}
          (이하 {'"'}근로자{'"'}라 함)은 다음과 같이 근로계약을 체결하고, 이를
          성실히 이행할 것을 약정한다.
        </p>
      </div>

      {/* 제1조 계약기간 및 근무 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제1조 [계약기간 및 근무]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>계약기간</th>
            <td style={cellStyle}>
              <strong>{formatDate(contract.startDate)}</strong> 부터{" "}
              <strong>정함이 없음</strong> (정규직)
              {contract.probationPeriod > 0 && (
                <>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 수습기간: 입사일로부터 {contract.probationPeriod}개월
                    {contract.probationSalaryRate < 100
                      ? ` (기본급의 ${contract.probationSalaryRate}% 적용, 단 최저임금의 90% 이상이어야 함)`
                      : " (급여 동일)"}
                  </span>
                </>
              )}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>근무장소</th>
            <td style={cellStyle}>{contract.workplace}</td>
          </tr>
          <tr>
            <th style={headerStyle}>소속부서</th>
            <td style={cellStyle}>{contract.department || "추후 지정"}</td>
          </tr>
          <tr>
            <th style={headerStyle}>직위/직책</th>
            <td style={cellStyle}>{contract.position || "사원"}</td>
          </tr>
          <tr>
            <th style={headerStyle}>담당업무</th>
            <td style={cellStyle}>{contract.jobDescription}</td>
          </tr>
        </tbody>
      </table>

      {/* 제2조 근로시간 및 휴게 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제2조 [근로시간 및 휴게]
            </th>
          </tr>
        </thead>
        <tbody>
          {contract.scheduleType === "flexible" ? (
            <tr>
              <th style={headerStyle}>근로시간</th>
              <td style={cellStyle}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "8px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "6px 8px",
                          fontSize: "12px",
                        }}
                      >
                        요일
                      </th>
                      <th
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "6px 8px",
                          fontSize: "12px",
                        }}
                      >
                        근무시간
                      </th>
                      <th
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "6px 8px",
                          fontSize: "12px",
                        }}
                      >
                        휴게
                      </th>
                      <th
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "6px 8px",
                          fontSize: "12px",
                        }}
                      >
                        근로시간
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.flexibleSchedule
                      .filter((s) => s.startTime && s.endTime)
                      .map((schedule) => (
                        <tr key={schedule.day}>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "6px 8px",
                              textAlign: "center",
                              fontSize: "13px",
                            }}
                          >
                            {schedule.day}요일
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "6px 8px",
                              textAlign: "center",
                              fontSize: "13px",
                            }}
                          >
                            {schedule.startTime} ~ {schedule.endTime}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "6px 8px",
                              textAlign: "center",
                              fontSize: "13px",
                            }}
                          >
                            {schedule.breakTime}분
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "6px 8px",
                              textAlign: "center",
                              fontSize: "13px",
                              fontWeight: 600,
                            }}
                          >
                            {schedule.hours}시간
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>
                  (주 소정근로시간: {weeklyPrescribedHours}시간)
                </span>
                {weeklyOvertimeHours > 0 && (
                  <>
                    <br />
                    <span
                      style={{
                        color: "#dc2626",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      ※ 주 연장근로시간: {weeklyOvertimeHours.toFixed(1)}시간
                      (통상임금의 50% 가산)
                    </span>
                  </>
                )}
              </td>
            </tr>
          ) : (
            <>
              <tr>
                <th style={headerStyle}>근로시간</th>
                <td style={cellStyle}>
                  <strong>{contract.workStartTime}</strong> ~{" "}
                  <strong>{contract.workEndTime}</strong>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    (1일 소정근로시간: {dailyHours}시간{" "}
                    {dailyMins > 0 ? `${dailyMins}분` : ""}, 주 소정근로시간:{" "}
                    {weeklyPrescribedHours}시간)
                  </span>
                  {weeklyOvertimeHours > 0 && (
                    <>
                      <br />
                      <span
                        style={{
                          color: "#dc2626",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        ※ 주 연장근로시간: {weeklyOvertimeHours}시간 (통상임금의
                        50% 가산)
                      </span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <th style={headerStyle}>휴게시간</th>
                <td style={cellStyle}>
                  {contract.breakTime}분 (근로시간 도중 자유롭게 이용)
                </td>
              </tr>
              <tr>
                <th style={headerStyle}>근무요일</th>
                <td style={cellStyle}>
                  {contract.workDays.join(", ")} (주 {contract.workDays.length}
                  일)
                  {hasExceptionDays && (
                    <div style={{ marginTop: "8px" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#fffbeb" }}>
                            <th
                              style={{
                                border: "1px solid #d1d5db",
                                padding: "4px 8px",
                                fontSize: "12px",
                              }}
                            >
                              요일
                            </th>
                            <th
                              style={{
                                border: "1px solid #d1d5db",
                                padding: "4px 8px",
                                fontSize: "12px",
                              }}
                            >
                              근무시간
                            </th>
                            <th
                              style={{
                                border: "1px solid #d1d5db",
                                padding: "4px 8px",
                                fontSize: "12px",
                              }}
                            >
                              휴게
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {contract.workDays.map((day) => {
                            const exDay = previewEx[day];
                            const dayBreak = exDay
                              ? exDay.breakTime || 0
                              : contract.breakTime;
                            const dayStart = exDay
                              ? exDay.startTime
                              : contract.workStartTime;
                            const dayEnd = exDay
                              ? exDay.endTime
                              : contract.workEndTime;
                            const [ds, dm] = dayStart.split(":").map(Number);
                            const [de, dme] = dayEnd.split(":").map(Number);
                            const dayWorkMins = de * 60 + dme - (ds * 60 + dm);
                            const breakViolation =
                              (dayWorkMins >= 480 && dayBreak < 60) ||
                              (dayWorkMins >= 240 && dayBreak < 30);
                            return (
                              <tr key={day}>
                                <td
                                  style={{
                                    border: "1px solid #d1d5db",
                                    padding: "4px 8px",
                                    textAlign: "center",
                                    fontSize: "12px",
                                  }}
                                >
                                  {day}
                                </td>
                                <td
                                  style={{
                                    border: "1px solid #d1d5db",
                                    padding: "4px 8px",
                                    textAlign: "center",
                                    fontSize: "12px",
                                    color: exDay ? "#b45309" : undefined,
                                  }}
                                >
                                  {exDay
                                    ? `${exDay.startTime} ~ ${exDay.endTime}`
                                    : `${contract.workStartTime} ~ ${contract.workEndTime}`}
                                </td>
                                <td
                                  style={{
                                    border: "1px solid #d1d5db",
                                    padding: "4px 8px",
                                    textAlign: "center",
                                    fontSize: "12px",
                                    color: breakViolation
                                      ? "#dc2626"
                                      : undefined,
                                  }}
                                >
                                  {dayBreak}분{breakViolation && " ⚠️"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </td>
              </tr>
            </>
          )}
          <tr>
            <th style={headerStyle}>연장근로</th>
            <td style={cellStyle}>
              당사자 합의에 의해 1주 12시간 한도 내에서 연장근로 가능
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 연장·야간·휴일 근로 시 통상임금의 50% 가산 지급 (근로기준법
                제56조)
              </span>
              {contract.useComprehensiveWage && (
                <>
                  <br />
                  <span
                    style={{
                      color: "#1e40af",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ※ 포괄임금 약정에 따라 제4조의 고정수당에 포함하여 지급
                    (초과분은 별도 지급)
                  </span>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제3조 휴일 및 휴가 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제3조 [휴일 및 휴가] (근로기준법 제55조, 제60조)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>주휴일</th>
            <td style={cellStyle}>
              매주 <strong>{contract.weeklyHolidayDay}요일</strong> (유급, 주
              1일)
            </td>
          </tr>
          {contract.unpaidRestDays.length > 0 && (
            <tr>
              <th style={headerStyle}>무급휴무일</th>
              <td style={cellStyle}>
                매주 {contract.unpaidRestDays.map((d) => `${d}요일`).join(", ")}{" "}
                (무급)
              </td>
            </tr>
          )}
          <tr>
            <th style={headerStyle}>유급휴일</th>
            <td style={cellStyle}>
              • 근로자의 날 (5월 1일)
              <br />• 관공서 공휴일에 관한 규정에 따른 공휴일 및 대체공휴일
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>연차유급휴가</th>
            <td style={cellStyle}>
              근로기준법 제60조에 따라 산정·부여한다.
              {contract.annualLeaveType === "fiscalYear" && (
                <>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 회계연도 기준 (1.1~12.31) 산정
                  </span>
                </>
              )}
            </td>
          </tr>
          {contract.includeAnnualLeaveAllowance && (
            <tr>
              <th style={headerStyle}>연차미사용수당</th>
              <td style={cellStyle}>
                ① 사용자는 근로자의 계속근로를 전제로 연차미사용수당을 임금에
                포함하여 선지급할 수 있다.
                <br />
                ② 연차미사용수당 발생 전 근로자가 퇴사하는 경우, 이미 지급된
                연차미사용수당은 마지막 임금에서 공제하여 정산한다.
                <br />
                <span style={{ color: "#6b7280", fontSize: "12px" }}>
                  ※ 선지급을 이유로 연차유급휴가 사용을 제한하지 아니한다.
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 제4조 임금 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제4조 [임금] (근로기준법 제17조 필수 명시사항)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>임금형태</th>
            <td style={cellStyle}>
              <strong>{contract.salaryType}제</strong>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>임금구성</th>
            <td style={cellStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", width: "160px" }}>
                      기본급 (주휴수당 포함)
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      {formatCurrency(contract.baseSalary)}
                    </td>
                  </tr>
                  {contract.includeAnnualLeaveAllowance &&
                    (() => {
                      const hw =
                        monthlyPrescribedHours > 0
                          ? contract.baseSalary / monthlyPrescribedHours
                          : 0;
                      const dh =
                        workDayCount > 0
                          ? weeklyPrescribedHours / workDayCount
                          : 8;
                      const amount = Math.round(
                        (hw * dh * (contract.annualLeave || 15)) / 12,
                      );
                      return (
                        <tr>
                          <td style={{ padding: "4px 0", color: "#1e40af" }}>
                            연차미사용수당
                          </td>
                          <td
                            style={{
                              padding: "4px 0",
                              textAlign: "right",
                              color: "#1e40af",
                            }}
                          >
                            {formatCurrency(amount)}
                            <span
                              style={{ fontSize: "11px", color: "#6b7280" }}
                            >
                              {" "}
                              ({contract.annualLeave || 15}일 ÷ 12)
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  {contract.mealAllowance > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>식대 (비과세)</td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.mealAllowance)}
                      </td>
                    </tr>
                  )}
                  {contract.vehicleAllowance > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        자가운전보조금 (비과세)
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.vehicleAllowance)}
                      </td>
                    </tr>
                  )}
                  {contract.childcareAllowance > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>보육수당 (비과세)</td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.childcareAllowance)}
                      </td>
                    </tr>
                  )}
                  {contract.researchAllowance > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>연구보조비 (비과세)</td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.researchAllowance)}
                      </td>
                    </tr>
                  )}
                  {(contract.otherAllowance ||
                    contract.otherAllowanceAmount > 0) && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        기타수당
                        {contract.otherAllowance
                          ? ` (${contract.otherAllowance})`
                          : ""}
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.otherAllowanceAmount)}
                      </td>
                    </tr>
                  )}
                  {contract.useComprehensiveWage &&
                    fixedOvertimePay > 0 &&
                    previewCwResult && (
                      <tr>
                        <td style={{ padding: "4px 0", color: "#1e40af" }}>
                          고정 연장근로수당
                        </td>
                        <td
                          style={{
                            padding: "4px 0",
                            textAlign: "right",
                            color: "#1e40af",
                          }}
                        >
                          {formatCurrency(fixedOvertimePay)}
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            {" "}
                            (월{" "}
                            {previewCwResult.breakdown.monthlyOvertimeHours.toFixed(
                              1,
                            )}
                            h × 150%)
                          </span>
                        </td>
                      </tr>
                    )}
                  {contract.useComprehensiveWage &&
                    fixedNightPay > 0 &&
                    previewCwResult && (
                      <tr>
                        <td style={{ padding: "4px 0", color: "#1e40af" }}>
                          고정 야간근로수당
                        </td>
                        <td
                          style={{
                            padding: "4px 0",
                            textAlign: "right",
                            color: "#1e40af",
                          }}
                        >
                          {formatCurrency(fixedNightPay)}
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            {" "}
                            (월{" "}
                            {previewCwResult.breakdown.monthlyNightHours.toFixed(
                              1,
                            )}
                            h × 50%)
                          </span>
                        </td>
                      </tr>
                    )}
                  {contract.useComprehensiveWage &&
                    fixedHolidayPay > 0 &&
                    previewCwResult && (
                      <tr>
                        <td style={{ padding: "4px 0", color: "#1e40af" }}>
                          고정 휴일근로수당
                        </td>
                        <td
                          style={{
                            padding: "4px 0",
                            textAlign: "right",
                            color: "#1e40af",
                          }}
                        >
                          {formatCurrency(fixedHolidayPay)}
                          <span style={{ fontSize: "11px", color: "#6b7280" }}>
                            {" "}
                            (월{" "}
                            {previewCwResult.breakdown.monthlyHolidayHours.toFixed(
                              1,
                            )}
                            h × 150%)
                          </span>
                        </td>
                      </tr>
                    )}
                  <tr
                    style={{ borderTop: "1px solid #d1d5db", fontWeight: 600 }}
                  >
                    <td style={{ padding: "8px 0" }}>월 합계</td>
                    <td
                      style={{
                        padding: "8px 0",
                        textAlign: "right",
                        color: "#1e40af",
                      }}
                    >
                      {formatCurrency(totalMonthlySalary)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {contract.annualSalary > 0 && (
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                    marginTop: "8px",
                  }}
                >
                  <p>
                    ※ 총 연간 보수액: {formatCurrency(totalMonthlySalary * 12)}{" "}
                    (세전)
                  </p>
                  <p style={{ marginTop: "2px" }}>
                    (과세대상 연봉: {formatCurrency(contract.annualSalary)} /
                    비과세 수당:{" "}
                    {formatCurrency(
                      totalMonthlySalary * 12 - contract.annualSalary,
                    )}
                    )
                  </p>
                </div>
              )}
              {contract.useComprehensiveWage && (
                <p
                  style={{
                    color: "#1e40af",
                    fontSize: "12px",
                    marginTop: "8px",
                    lineHeight: 1.6,
                  }}
                >
                  ※ 위 임금은 포괄임금 약정에 따른 것으로, 기본급
                  {(weeklyOvertimeHours > 0 ||
                    (previewCwResult &&
                      previewCwResult.fixedOvertimePay > 0)) &&
                    "·고정 연장근로수당"}
                  {contract.comprehensiveHasNightWork && "·고정 야간근로수당"}
                  {(contract.fixedHolidayHours || 0) > 0 &&
                    "·고정 휴일근로수당"}
                  을 포함한 총액이다. 실제 근로시간이 약정시간을 초과하는 경우
                  그 초과분에 대하여 추가 수당을 지급한다.
                  {previewCwResult && (
                    <>
                      {" "}
                      (역산 시급: {formatCurrency(previewCwResult.hourlyWage)}/h
                      {previewCwResult.breakdown.monthlyOvertimeHours > 0 &&
                        `, 월 연장 ${previewCwResult.breakdown.monthlyOvertimeHours.toFixed(1)}h`}
                      {previewCwResult.breakdown.monthlyNightHours > 0 &&
                        `, 야간 ${previewCwResult.breakdown.monthlyNightHours.toFixed(1)}h`}
                      {previewCwResult.breakdown.monthlyHolidayHours > 0 &&
                        `, 휴일 ${previewCwResult.breakdown.monthlyHolidayHours.toFixed(1)}h`}
                      )
                    </>
                  )}
                </p>
              )}
            </td>
          </tr>
          {contract.bonusInfo && (
            <tr>
              <th style={headerStyle}>상여금</th>
              <td style={cellStyle}>{contract.bonusInfo}</td>
            </tr>
          )}
          <tr>
            <th style={headerStyle}>임금산정기간</th>
            <td style={cellStyle}>{contract.salaryPeriod}</td>
          </tr>
          <tr>
            <th style={headerStyle}>임금지급일</th>
            <td style={cellStyle}>
              매월 <strong>{contract.paymentDate}일</strong> (휴일인 경우 그
              전일 지급)
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>지급방법</th>
            <td style={cellStyle}>{contract.paymentMethod}</td>
          </tr>
          <tr>
            <th style={headerStyle}>임금계산</th>
            <td style={cellStyle}>
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                • 통상시급 = 월 기본급 ÷ {monthlyPrescribedHours}시간 (월
                소정근로시간)
                {contract.baseSalary > 0 && (
                  <>
                    <br /> →{" "}
                    {formatCurrency(
                      Math.round(contract.baseSalary / monthlyPrescribedHours),
                    )}
                    /시간
                  </>
                )}
                <br />• 초과근로 시 통상임금의 50% 가산 (근로기준법 제56조)
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>일할계산</th>
            <td style={cellStyle}>
              ① 근로자가 결근·중도입사·중도퇴사·휴직 등의 사유로 소정근로일을
              만근하지 못한 경우, 모든 임금 항목은 해당 월의{" "}
              <strong>총 일수를 기준</strong>으로 일할 계산하여 지급한다.
              <br />
              ② 무단결근 시 해당 주의 주휴수당 1일분을 감액한다.
              <br />
              <span style={{ color: "#6b7280", fontSize: "12px" }}>
                ※ 일할계산 산식: 월 임금 × 실근무일수 ÷ 해당 월 총 일수
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제5조 사회보험 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제5조 [사회보험]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>가입보험</th>
            <td style={cellStyle}>
              {insuranceList.length > 0 ? (
                <>
                  <strong>{insuranceList.join(", ")}</strong> 가입
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 근로자 부담분은 급여에서 원천공제
                  </span>
                </>
              ) : (
                "해당 없음"
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제6조 근로계약의 해지 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제6조 [근로계약의 해지]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>해고예고</th>
            <td style={cellStyle}>
              사용자가 근로자를 해고하고자 할 때에는 30일 전에 예고하거나,
              30일분 이상의 통상임금을 지급하여야 한다. (근로기준법 제26조)
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 단, 수습기간 3개월 이내 또는 천재·사변 등 불가피한 사유는 예외
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>자발적 퇴직</th>
            <td style={cellStyle}>
              근로자가 퇴직하고자 할 때에는 30일 전에 사용자에게 통보하여야
              한다.
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>퇴직급여제도</th>
            <td style={cellStyle}>
              사용자는 근로자퇴직급여보장법에 따라 퇴직급여제도를 설정한다.
              <br />
              <span style={{ fontWeight: 500 }}>① 퇴직금제도:</span>{" "}
              계속근로기간 1년 이상인 근로자가 퇴직할 경우, 30일분 이상의
              평균임금을 퇴직금으로 지급한다. (근로자퇴직급여보장법 제8조)
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 퇴직금 = 1일 평균임금 × 30일 × (계속근로년수)
                <br />
                ※ 평균임금이 통상임금보다 낮은 경우 통상임금을 평균임금으로 적용
                (근로기준법 제2조 ②항)
                <br />※ 확정기여형(DC) 또는 확정급여형(DB) 퇴직연금제도 도입 시
                별도 규약에 따름
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제7조 기타 의무 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제7조 [기타 의무]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>비밀유지</th>
            <td style={cellStyle}>
              ① 근로자는 재직 중 및 퇴직 후에도 업무상 알게 된 회사의 영업비밀
              및 기밀사항을 누설하여서는 아니 된다.
              <br />② 제①항을 위반하여 회사에 손해를 끼친 경우, 근로자는 손해
              전액을 회사에 배상하여야 한다.
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>겸업금지</th>
            <td style={cellStyle}>
              근로자는 회사의 사전 서면 동의 없이 회사의 업무와 경쟁관계에 있는
              타 업체에 취업하거나 동종의 자영업을 영위하여서는 아니 된다.
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제9조 의원사직 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sectionHeaderStyle}>
              제8조 [의원사직]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...cellStyle, lineHeight: 2 }}>
              ① 근로자가 사직하고자 할 경우 사직하고자 하는 날의{" "}
              <strong>30일 이전</strong>에 <strong>서면으로</strong> 사직서를
              제출하여야 하며, 후임자를 선임할 때까지 업무의 인수인계를 부족함이
              없도록 성실히 하여야 한다. 퇴직일은 사직서 제출 후 사용자와
              협의하여 확정하되, 합의가 이루어지지 않는 경우 민법 제660조
              제3항에 따른다.
              <br />
              ② 사직서 제출 후 퇴직일까지의 근무기간 중 정당한 사유 없이
              출근하지 않은 날은 무단결근으로 처리하며, 해당 주의 주휴수당을
              공제한다. 근로자가 퇴직절차를 위반하여 회사에 손해를 끼칠 경우
              회사는 손해배상을 청구할 수 있다.
              <br />
              ③ 근로자는 퇴직 전 소속 부서장의 인수인계 완료 확인을 받아야 한다.
              <br />④ 근로자가 퇴직하는 경우 퇴직 월 급여 및 퇴직금은
              퇴직일로부터 <strong>14일 이내</strong>에 지급한다 (근로기준법
              제36조). 단, 당사자 간 합의가 있는 경우 다음 정기 임금지급일에
              지급할 수 있다.
            </td>
          </tr>
        </tbody>
      </table>

      {/* 특약사항 */}
      {contract.specialTerms && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr>
              <th colSpan={2} style={sectionHeaderStyle}>
                제10조 [특약사항]
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} style={{ ...cellStyle, whiteSpace: "pre-wrap" }}>
                {contract.specialTerms}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 제9조 계약서 교부 */}
      <div
        style={{
          backgroundColor: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <p style={{ fontSize: "13px", margin: 0 }}>
          <strong style={{ color: "#92400e" }}>
            📋 근로계약서 교부 (근로기준법 제17조)
          </strong>
          <br />
          사용자는 근로계약을 체결함과 동시에 본 계약서를 사본하여 근로자의 교부
          요구와 관계없이 근로자에게 교부하여야 한다. 본 계약서는 2부를 작성하여
          사용자와 근로자가 각 1부씩 보관한다.
        </p>
      </div>

      {/* 기타 조항 */}
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "32px" }}>
        <p style={{ marginBottom: "8px" }}>
          • 본 계약에 명시되지 않은 사항은 근로기준법 및 관계 법령, 취업규칙에
          따른다.
        </p>
        <p style={{ marginBottom: "8px" }}>
          • 사용자와 근로자는 본 계약의 내용을 성실히 이행하여야 한다.
        </p>
        <p>
          • 본 계약 내용 중 근로기준법 등 관계 법령에 미달하는 부분은 해당
          법령에 따른다.
        </p>
      </div>

      {/* 계약 체결일 */}
      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          fontWeight: 600,
          marginBottom: "40px",
        }}
      >
        {formatDate(contract.contractDate)}
      </p>

      {/* 서명란 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
        }}
      >
        {/* 사용자 */}
        <div
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontWeight: 700,
              color: "#1e40af",
              marginBottom: "16px",
              fontSize: "15px",
              borderBottom: "2px solid #1e40af",
              paddingBottom: "8px",
            }}
          >
            [ 사용자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: "6px 0", width: "100px", color: "#6b7280" }}
                >
                  사업체명
                </td>
                <td style={{ padding: "6px 0", fontWeight: 500 }}>
                  {contract.company.name}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>
                  사업자번호
                </td>
                <td style={{ padding: "6px 0" }}>
                  {formatBusinessNumber(contract.company.businessNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>소재지</td>
                <td style={{ padding: "6px 0" }}>{contract.company.address}</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>연락처</td>
                <td style={{ padding: "6px 0" }}>{contract.company.phone}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", color: "#6b7280" }}>대표자</td>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>
                  {contract.company.ceoName}
                  {employerSignature ? (
                    <img
                      src={employerSignature}
                      alt="사업주 서명"
                      style={{
                        height: "48px",
                        display: "inline-block",
                        marginLeft: "12px",
                        verticalAlign: "middle",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: "#6b7280",
                        marginLeft: "20px",
                        borderBottom: "1px solid #d1d5db",
                        paddingBottom: "2px",
                        display: "inline-block",
                        minWidth: "120px",
                      }}
                    >
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                        (인)
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 근로자 */}
        <div
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontWeight: 700,
              color: "#1e40af",
              marginBottom: "16px",
              fontSize: "15px",
              borderBottom: "2px solid #1e40af",
              paddingBottom: "8px",
            }}
          >
            [ 근로자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: "6px 0", width: "100px", color: "#6b7280" }}
                >
                  성명
                </td>
                <td style={{ padding: "6px 0", fontWeight: 500 }}>
                  {contract.employee.name}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>
                  주민등록번호
                </td>
                <td style={{ padding: "6px 0" }}>
                  {formatResidentNumber(contract.employee.residentNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>주소</td>
                <td style={{ padding: "6px 0" }}>
                  {contract.employee.address}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>연락처</td>
                <td style={{ padding: "6px 0" }}>{contract.employee.phone}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", color: "#6b7280" }}>서명</td>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>
                  {contract.employee.name}
                  {employeeSignature ? (
                    <img
                      src={employeeSignature}
                      alt="근로자 서명"
                      style={{
                        height: "48px",
                        display: "inline-block",
                        marginLeft: "12px",
                        verticalAlign: "middle",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: "#6b7280",
                        marginLeft: "20px",
                        borderBottom: "1px solid #d1d5db",
                        paddingBottom: "2px",
                        display: "inline-block",
                        minWidth: "120px",
                      }}
                    >
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                        (인)
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 계약서 수령 확인란 */}
      <div
        style={{
          marginTop: "40px",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "16px", fontSize: "14px" }}>
          [ 근로계약서 수령 확인 ]
        </p>
        <p style={{ fontSize: "13px", marginBottom: "20px", lineHeight: 1.8 }}>
          본인은 위 근로계약서 사본 1부를 교부받았음을 확인합니다.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "40px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px" }}>
            {formatDate(contract.contractDate)}
          </span>
          <span style={{ fontSize: "13px" }}>
            근로자: {contract.employee.name}
            <span
              style={{
                borderBottom: "1px solid #d1d5db",
                display: "inline-block",
                minWidth: "100px",
                marginLeft: "12px",
                paddingBottom: "2px",
              }}
            >
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                (서명 또는 인)
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
