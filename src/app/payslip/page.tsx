"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, EmployeeInfo, Employee, PaymentRecord } from "@/types";
import {
  formatCurrency,
  formatBusinessNumber,
  generateId,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { usePaymentRecords } from "@/hooks/usePaymentRecords";
import { getWorkingDays, MINIMUM_WAGE } from "@/lib/constants";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import { useToast } from "@/contexts/ToastContext";
import { useAutoSave } from "@/hooks/useAutoSave";
import Breadcrumb from "@/components/Breadcrumb";
import InfoTooltip from "@/components/InfoTooltip";
import AutoSaveStatus from "@/components/AutoSaveStatus";
import MobileFormWizard from "@/components/MobileFormWizard";
import LegalDisclaimer from "@/components/LegalDisclaimer";

// ============================================
// 통상임금·통상시급 및 가산수당 자동 계산
// 근거: 근로기준법 제56조, 시행령 제6조
// ============================================

/**
 * 통상시급 계산
 * - 월급제: 통상임금(월) ÷ 209시간
 *   통상임금 = 기본급 + 고정·정기·일률적 수당 (직책수당, 근속수당 등)
 *   209시간 = (주40h + 주휴8h) × 365 ÷ 7 ÷ 12
 * - 시급제: 약정 시급
 *
 * 【통상임금 3요건】 (대법원 전원합의체 기준)
 *  ① 정기성: 일정 간격으로 계속 지급
 *  ② 일률성: 모든 근로자 또는 일정 조건 충족 시 전원 지급
 *  ③ 고정성: 업적·성과 무관하게 확정 지급
 *
 * 포함: 기본급, 식대, 직책수당, 근속수당, 가족수당, 주택수당, 기술수당 등
 * 제외: 연장·야간·휴일수당(사후계산), 성과급(변동), 실비변상 등
 */
function calcOrdinaryHourlyRate(
  baseSalary: number,
  ordinaryAllowances: number,
  salaryType: "monthly" | "hourly",
  hourlyWage?: number,
): number {
  if (salaryType === "hourly" && hourlyWage) return hourlyWage;
  return (baseSalary + ordinaryAllowances) / MINIMUM_WAGE.monthlyHours;
}

/** 통상임금에 포함되는 고정수당 합계 (식대 + 추가수당 중 ordinaryWage 항목) */
function getOrdinaryAllowanceTotal(
  earnings: Record<string, number>,
  enabledKeys: readonly string[],
): number {
  const additionalOrdinary = enabledKeys.reduce((sum, key) => {
    const item = ADDITIONAL_EARNINGS.find((e) => e.key === key);
    return item?.ordinaryWage ? sum + (earnings[key] || 0) : sum;
  }, 0);
  return (earnings.mealAllowance || 0) + additionalOrdinary;
}

/**
 * 연장·야간·휴일 근로수당 자동 계산 (중복 가산 반영)
 *
 * 【법적 근거】
 * - 근로기준법 제56조 (연장·야간 및 휴일 근로)
 *   제1항: 연장근로 → 통상임금의 50% 이상 가산
 *   제2항: 휴일근로 → 8h이내 50%, 8h초과 100% 가산
 *   제3항: 야간근로(22시~06시) → 50% 이상 가산
 * - 2018.3 근로기준법 개정: 휴일 8h초과 = +100% 명문화
 * - 대법원 전원합의체 2018.6.21. 선고 2011다112391:
 *   "휴일근로는 연장근로에 포함되지 않음" → 중복 할증 정리
 *
 * ※ 5인 미만 사업장은 제56조 미적용 (가산수당 지급의무 없음)
 *
 * ┌───────────────────────┬────────┬────────┐
 * │ 근로 유형             │ 가산율 │ 합산   │
 * ├───────────────────────┼────────┼────────┤
 * │ 연장                  │ +50%   │ 1.5배  │
 * │ 야간 (단독, 가산분)   │ +50%   │ 0.5배  │
 * │ 연장+야간             │+50+50% │ 2.0배  │
 * │ 휴일 8h이내           │ +50%   │ 1.5배  │
 * │ 휴일 8h초과           │+100%   │ 2.0배  │
 * │ 휴일(8h이내)+야간     │+50+50% │ 2.0배  │
 * │ 휴일(8h초과)+야간     │+100+50%│ 2.5배  │ ← 최대
 * └───────────────────────┴────────┴────────┘
 *
 * @param useAddition 가산 적용 여부 (true: 가산 적용, false: 기본금액만)
 */
function calcOvertimeAllowances(
  rate: number,
  overtimeHours: number,
  nightHours: number,
  holidayHours: number,
  overtimeNightHours: number,
  holidayNightHours: number,
  useAddition: boolean = true,
) {
  if (rate <= 0) return { overtime: 0, nightWork: 0, holidayWork: 0 };

  if (!useAddition) {
    // 가산 미적용: 기본 금액만 (1.0배)
    const overtime = Math.round(overtimeHours * rate);
    const nightWork = Math.round(nightHours * rate);
    const holidayWork = Math.round(holidayHours * rate);
    return { overtime, nightWork, holidayWork };
  }

  // 가산 적용: 법정 가산율 적용
  // ── 연장근로수당 (중복 가산) ──
  const otDay = Math.max(0, overtimeHours - overtimeNightHours);
  const overtime = Math.round(
    otDay * rate * 1.5 + // 연장(주간): 1.5배
      overtimeNightHours * rate * 2.0, // 연장+야간: 2.0배
  );

  // ── 야간근로수당 (단독 야간, 가산분만) ──
  const nightWork = Math.round(nightHours * rate * 0.5);

  // ── 휴일근로수당 (중복 가산) ──
  const holNormal = Math.min(holidayHours, 8);
  const holOver = Math.max(0, holidayHours - 8);
  // 야간을 높은 배율(초과분)에 우선 배분
  const nightInOver = Math.min(holidayNightHours, holOver);
  const nightInNormal = Math.min(holidayNightHours - nightInOver, holNormal);
  const holidayWork = Math.round(
    (holNormal - nightInNormal) * rate * 1.5 + // 휴일 8h이내: 1.5배
      nightInNormal * rate * 2.0 + // 휴일 8h이내+야간: 2.0배
      (holOver - nightInOver) * rate * 2.0 + // 휴일 8h초과: 2.0배
      nightInOver * rate * 2.5, // 휴일 8h초과+야간: 2.5배 (최대)
  );

  return { overtime, nightWork, holidayWork };
}

// 추가 가능한 지급 항목 목록 (2026년 기준)
// ordinaryWage: 통상임금에 포함되는 고정·정기·일률적 수당 여부
const ADDITIONAL_EARNINGS = [
  {
    key: "fuelAllowance",
    label: "유류비",
    taxable: false,
    ordinaryWage: false,
    description: "업무용 차량 유류비 (비과세, 월 20만원 한도)",
  },
  {
    key: "carMaintenanceAllowance",
    label: "차량유지비",
    taxable: false,
    ordinaryWage: false,
    description: "업무용 차량 유지보수비 (비과세)",
  },
  {
    key: "childEducationAllowance",
    label: "자녀학자금",
    taxable: true,
    ordinaryWage: false,
    description: "자녀 교육비 지원",
  },
  {
    key: "childcareAllowance",
    label: "보육수당",
    taxable: false,
    ordinaryWage: false,
    description: "6세 이하 자녀 1인당 월 20만원 (2026년~)",
  },
  {
    key: "birthSupportAllowance",
    label: "출산지원금",
    taxable: false,
    ordinaryWage: false,
    description: "출산 후 2년 내 지급 시 전액 비과세",
  },
  {
    key: "positionAllowance",
    label: "직책수당",
    taxable: true,
    ordinaryWage: true,
    description: "직급/직책에 따른 수당",
  },
  {
    key: "tenureAllowance",
    label: "근속수당",
    taxable: true,
    ordinaryWage: true,
    description: "장기근속 보상",
  },
  {
    key: "familyAllowance",
    label: "가족수당",
    taxable: true,
    ordinaryWage: true,
    description: "부양가족 수당",
  },
  {
    key: "housingAllowance",
    label: "주택수당",
    taxable: true,
    ordinaryWage: true,
    description: "주거 지원비",
  },
  {
    key: "nightWorkAllowance",
    label: "야간근로수당",
    taxable: true,
    ordinaryWage: false,
    description: "22시~06시 근무",
  },
  {
    key: "holidayWorkAllowance",
    label: "휴일근로수당",
    taxable: true,
    ordinaryWage: false,
    description: "휴일 근무 수당",
  },
  {
    key: "researchAllowance",
    label: "연구활동비",
    taxable: false,
    ordinaryWage: false,
    description: "연구원 한정 (비과세, 월 20만원 한도)",
  },
  {
    key: "communicationAllowance",
    label: "통신비",
    taxable: true,
    ordinaryWage: false,
    description: "업무용 통신비 지원",
  },
  {
    key: "welfareAllowance",
    label: "복리후생비",
    taxable: true,
    ordinaryWage: false,
    description: "기타 복리후생",
  },
] as const;

type AdditionalEarningKey = (typeof ADDITIONAL_EARNINGS)[number]["key"];

interface PayslipData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  employeeId: string; // 사원번호 (필수)
  birthDate: string; // 생년월일 (법정 필수 - 근로자 특정 정보)
  year: number;
  month: number;
  paymentDate: string;

  // 👨‍👩‍👧 부양가족 정보 (간이세액표용)
  dependents: number; // 공제대상 부양가족 수 (본인 포함, 기본값 1)
  childrenUnder20: number; // 20세 이하 자녀 수 (자녀세액공제용)

  // 💰 소득세 원천징수 비율 (간이세액표 기준, 80/100/120%)
  taxWithholdingRate: 80 | 100 | 120;

  // 🏢 사업장 규모 (가산수당 적용 여부 결정)
  businessSize: "5이상" | "5미만";

  // 📋 법적 필수 기재사항 (근로기준법 시행령 제27조의2)
  workInfo: {
    workDays: number; // 출근일수 (필수)
    totalWorkHours: number; // 총 근로시간수 (필수)
    prescribedWorkHours: number; // 소정근로시간수 (필수)
    overtimeHours: number; // 연장근로시간
    nightHours: number; // 야간근로시간 (단독, 연장·휴일에 포함되지 않는 시간)
    holidayHours: number; // 휴일근로시간
    overtimeNightHours: number; // 연장근로 중 야간시간 (중복 가산)
    holidayNightHours: number; // 휴일근로 중 야간시간 (중복 가산)
    salaryType: "monthly" | "hourly"; // 임금계산방법
    hourlyWage?: number; // 시급 (시급제인 경우)
  };

  earnings: {
    baseSalary: number;
    overtime: number;
    nightWork: number;
    holidayWork: number;
    bonus: number;
    mealAllowance: number;
    transportAllowance: number;
    otherAllowance: number;
    [key: string]: number;
  };
  deductions: {
    nationalPension: number;
    healthInsurance: number;
    longTermCare: number;
    employmentInsurance: number;
    incomeTax: number;
    localTax: number;
  };
  enabledAdditionalEarnings: AdditionalEarningKey[];
}

const defaultEmployee: EmployeeInfo = {
  name: "",
  residentNumber: "",
  address: "",
  phone: "",
};

function createDefaultPayslip(): PayslipData {
  const today = new Date();
  return {
    company: defaultCompanyInfo,
    employee: defaultEmployee,
    employeeId: "",
    birthDate: "",
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    paymentDate: today.toISOString().split("T")[0],
    dependents: 1,
    childrenUnder20: 0,
    taxWithholdingRate: 100,
    businessSize: "5이상",
    workInfo: {
      workDays: 0,
      totalWorkHours: 0,
      prescribedWorkHours: 0,
      overtimeHours: 0,
      nightHours: 0,
      holidayHours: 0,
      overtimeNightHours: 0,
      holidayNightHours: 0,
      salaryType: "monthly",
    },
    earnings: {
      baseSalary: 0,
      overtime: 0,
      nightWork: 0,
      holidayWork: 0,
      bonus: 0,
      mealAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
    },
    deductions: {
      nationalPension: 0,
      healthInsurance: 0,
      longTermCare: 0,
      employmentInsurance: 0,
      incomeTax: 0,
      localTax: 0,
    },
    enabledAdditionalEarnings: [],
  };
}

export default function PayslipPage() {
  const [payslip, setPayslip] = useState<PayslipData>(() => {
    const today = new Date();
    const defaultPayslip = createDefaultPayslip();
    const initialWork = getWorkingDays(
      today.getFullYear(),
      today.getMonth() + 1,
    );
    return {
      ...defaultPayslip,
      workInfo: {
        ...defaultPayslip.workInfo,
        workDays: initialWork.days,
        totalWorkHours: MINIMUM_WAGE.monthlyHours,
        prescribedWorkHours: MINIMUM_WAGE.monthlyHours,
      },
    };
  });
  const toast = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [enableOvertimeAllowances, setEnableOvertimeAllowances] =
    useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // 자동저장
  const {
    restore: restorePayslip,
    clear: clearPayslipAutoSave,
    hasSaved: hasPayslipSaved,
    lastSavedAt,
  } = useAutoSave("payslip_form", payslip, true);

  useEffect(() => {
    if (hasPayslipSaved()) setShowRestoreBanner(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const { addPaymentRecord: savePaymentRecord } = usePaymentRecords();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [simpleMode, setSimpleMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const {
    saveDocument,
    saving: archiveSaving,
    saved: archiveSaved,
  } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "payslip",
      title: `급여명세서 - ${payslip.employee.name || "이름없음"} ${payslip.year}년 ${payslip.month}월`,
      employeeId: selectedEmployeeId || undefined,
      data: payslip as unknown as Record<string, unknown>,
    });
  };

  // Supabase 훅에서 회사 정보 반영
  useEffect(() => {
    setPayslip((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);

  // 급여명세서 → PaymentRecord 저장
  const handleSaveToLedger = async () => {
    if (!payslip.employee.name || !selectedEmployeeId) {
      toast.warning("직원을 선택해주세요.");
      return;
    }

    const record: PaymentRecord = {
      id: generateId(),
      employeeId: selectedEmployeeId,
      year: payslip.year,
      month: payslip.month,
      paymentDate: payslip.paymentDate,
      earnings: {
        baseSalary: payslip.earnings.baseSalary,
        overtime: payslip.earnings.overtime,
        nightWork: payslip.earnings.nightWork || 0,
        holidayWork: payslip.earnings.holidayWork || 0,
        bonus: payslip.earnings.bonus,
        mealAllowance: payslip.earnings.mealAllowance,
        carAllowance: payslip.earnings.transportAllowance,
        childcareAllowance: payslip.earnings.childcareAllowance || 0,
        researchAllowance: payslip.earnings.researchAllowance || 0,
        otherAllowances: payslip.enabledAdditionalEarnings
          .filter(
            (key) => !["childcareAllowance", "researchAllowance"].includes(key),
          )
          .map((key) => {
            const item = ADDITIONAL_EARNINGS.find((e) => e.key === key);
            return {
              name: item?.label || key,
              amount: payslip.earnings[key] || 0,
              taxable: item?.taxable || true,
            };
          }),
      },
      deductions: {
        nationalPension: deductions.nationalPension,
        healthInsurance: deductions.healthInsurance,
        longTermCare: deductions.longTermCare,
        employmentInsurance: deductions.employmentInsurance,
        incomeTax: deductions.incomeTax,
        localTax: deductions.localTax,
        otherDeductions: [],
      },
      summary: {
        totalEarnings,
        totalTaxable:
          totalEarnings -
          (payslip.earnings.mealAllowance +
            payslip.earnings.transportAllowance),
        totalNonTaxable:
          payslip.earnings.mealAllowance + payslip.earnings.transportAllowance,
        totalDeductions,
        netPay,
      },
      status: "paid",
      paidAt: payslip.paymentDate,
      createdAt: new Date().toISOString(),
    };

    setSaveStatus("saving");
    try {
      await savePaymentRecord(record);
      clearPayslipAutoSave();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      toast.error(
        "급여 기록 저장 실패: " +
          (err instanceof Error ? err.message : "알 수 없는 오류"),
      );
      setSaveStatus("idle");
    }
  };

  // 근로일수/근로시간 자동 계산
  // 월급제: 209시간 고정 (주휴시간 포함 월 소정근로시간)
  // 시급제: 실제 근로일수 × 일 소정근로시간
  const calcWorkInfo = useCallback(
    (
      year: number,
      month: number,
      emp?: Employee,
      salaryType?: "monthly" | "hourly",
    ) => {
      const workDays = emp?.workCondition.workDays || [
        "월",
        "화",
        "수",
        "목",
        "금",
      ];
      let dailyHours = 8;
      if (emp) {
        const [sh, sm] = emp.workCondition.workStartTime.split(":").map(Number);
        const [eh, em] = emp.workCondition.workEndTime.split(":").map(Number);
        dailyHours =
          (eh * 60 + em - (sh * 60 + sm) - emp.workCondition.breakTime) / 60;
      }
      const actual = getWorkingDays(year, month, workDays, dailyHours);
      const type = salaryType || emp?.salary.type || "monthly";
      return {
        days: actual.days,
        hours: type === "monthly" ? MINIMUM_WAGE.monthlyHours : actual.hours,
      };
    },
    [],
  );

  // 근로시간 필드 변경 → workInfo + 수당 한번에 갱신
  const updateWorkHoursAndAllowances = useCallback(
    (
      field:
        | "overtimeHours"
        | "nightHours"
        | "holidayHours"
        | "overtimeNightHours"
        | "holidayNightHours",
      value: number,
    ) => {
      setPayslip((prev) => {
        const wi = { ...prev.workInfo, [field]: value };
        // 야간 중복시간이 원래 시간보다 클 수 없도록 보정
        wi.overtimeNightHours = Math.min(
          wi.overtimeNightHours,
          wi.overtimeHours,
        );
        wi.holidayNightHours = Math.min(wi.holidayNightHours, wi.holidayHours);

        // 근로시간이 없으면 계산 불필요
        const hasExtraHours =
          wi.overtimeHours > 0 || wi.nightHours > 0 || wi.holidayHours > 0;
        if (!hasExtraHours) {
          return {
            ...prev,
            workInfo: wi,
            earnings: {
              ...prev.earnings,
              overtime: 0,
              nightWork: 0,
              holidayWork: 0,
            },
          };
        }

        // 가산 적용 여부: 5인 이상이거나 5인 미만이면서 자동계산 활성화된 경우
        const useAddition =
          prev.businessSize === "5이상" || enableOvertimeAllowances;

        const ordAllow = getOrdinaryAllowanceTotal(
          prev.earnings,
          prev.enabledAdditionalEarnings,
        );
        const rate = calcOrdinaryHourlyRate(
          prev.earnings.baseSalary,
          ordAllow,
          wi.salaryType,
          wi.hourlyWage,
        );
        const { overtime, nightWork, holidayWork } = calcOvertimeAllowances(
          rate,
          wi.overtimeHours,
          wi.nightHours,
          wi.holidayHours,
          wi.overtimeNightHours,
          wi.holidayNightHours,
          useAddition,
        );
        return {
          ...prev,
          workInfo: wi,
          earnings: { ...prev.earnings, overtime, nightWork, holidayWork },
        };
      });
    },
    [enableOvertimeAllowances],
  );

  // 직원 선택 시 정보 자동 입력
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);

    if (!employeeId) return;

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const deptPosition =
      [employee.department, employee.position].filter(Boolean).join(" / ") ||
      "";

    // 주민번호에서 생년월일 추출 (YYMMDD-X...)
    let extractedBirthDate = "";
    const rn = employee.info.residentNumber?.replace(/[^0-9]/g, "") || "";
    if (rn.length >= 7) {
      const yy = rn.substring(0, 2);
      const mm = rn.substring(2, 4);
      const dd = rn.substring(4, 6);
      const genderDigit = parseInt(rn.substring(6, 7));
      const century = genderDigit <= 2 ? "19" : "20";
      extractedBirthDate = `${century}${yy}-${mm}-${dd}`;
    }

    const work = calcWorkInfo(payslip.year, payslip.month, employee);
    setPayslip((prev) => ({
      ...prev,
      birthDate: extractedBirthDate || prev.birthDate,
      employee: {
        ...employee.info,
        address: deptPosition,
      },
      dependents: employee.taxDependents?.dependents ?? prev.dependents,
      childrenUnder20:
        employee.taxDependents?.childrenUnder20 ?? prev.childrenUnder20,
      workInfo: {
        ...prev.workInfo,
        workDays: work.days,
        totalWorkHours: work.hours,
        prescribedWorkHours: work.hours,
      },
      earnings: {
        ...prev.earnings,
        baseSalary: employee.salary.baseSalary,
        mealAllowance: employee.salary.mealAllowance,
        transportAllowance: employee.salary.carAllowance,
        childcareAllowance: employee.salary.childcareAllowance,
        researchAllowance: employee.salary.researchAllowance || 0,
      },
      enabledAdditionalEarnings: [
        ...prev.enabledAdditionalEarnings,
        ...(employee.salary.childcareAllowance > 0
          ? ["childcareAllowance" as AdditionalEarningKey]
          : []),
        ...(employee.salary.researchAllowance > 0
          ? ["researchAllowance" as AdditionalEarningKey]
          : []),
      ],
    }));
  };

  // 추가 항목 토글 (통상임금 포함 항목이면 수당 재계산)
  const toggleAdditionalEarning = (key: AdditionalEarningKey) => {
    setPayslip((prev) => {
      const isEnabled = prev.enabledAdditionalEarnings.includes(key);
      const newEnabled = isEnabled
        ? prev.enabledAdditionalEarnings.filter((k) => k !== key)
        : [...prev.enabledAdditionalEarnings, key];
      const newEarnings = isEnabled
        ? { ...prev.earnings, [key]: 0 }
        : prev.earnings;
      const item = ADDITIONAL_EARNINGS.find((e) => e.key === key);
      const wi = prev.workInfo;
      const hasExtraHours =
        wi.overtimeHours > 0 || wi.nightHours > 0 || wi.holidayHours > 0;

      if (item?.ordinaryWage && hasExtraHours) {
        const useAddition =
          prev.businessSize === "5이상" || enableOvertimeAllowances;
        const ordA = getOrdinaryAllowanceTotal(newEarnings, newEnabled);
        const r = calcOrdinaryHourlyRate(
          newEarnings.baseSalary,
          ordA,
          wi.salaryType,
          wi.hourlyWage,
        );
        const { overtime, nightWork, holidayWork } = calcOvertimeAllowances(
          r,
          wi.overtimeHours,
          wi.nightHours,
          wi.holidayHours,
          wi.overtimeNightHours,
          wi.holidayNightHours,
          useAddition,
        );
        return {
          ...prev,
          enabledAdditionalEarnings: newEnabled,
          earnings: { ...newEarnings, overtime, nightWork, holidayWork },
        };
      }
      return {
        ...prev,
        enabledAdditionalEarnings: newEnabled,
        earnings: newEarnings,
      };
    });
  };

  // 통상임금 관련 계산값 (렌더링 시 사용)
  const ordinaryAllowances = getOrdinaryAllowanceTotal(
    payslip.earnings,
    payslip.enabledAdditionalEarnings,
  );
  const hourlyRate = calcOrdinaryHourlyRate(
    payslip.earnings.baseSalary,
    ordinaryAllowances,
    payslip.workInfo.salaryType,
    payslip.workInfo.hourlyWage,
  );
  // 4대보험 자동 계산 (render-time)
  const deductions = (() => {
    if (!autoCalculate) return payslip.deductions;

    // 과세소득 계산 (비과세 항목 제외)
    let taxableIncome =
      payslip.earnings.baseSalary +
      payslip.earnings.overtime +
      payslip.earnings.bonus +
      (payslip.earnings.nightWork || 0) +
      (payslip.earnings.holidayWork || 0);

    // 기타수당은 과세
    taxableIncome += payslip.earnings.otherAllowance;

    // 추가 항목 중 과세 항목만 합산
    payslip.enabledAdditionalEarnings.forEach((key) => {
      const item = ADDITIONAL_EARNINGS.find((e) => e.key === key);
      if (item?.taxable) {
        taxableIncome += payslip.earnings[key] || 0;
      }
    });

    // 총 지급액이 0이면 공제도 0
    if (taxableIncome <= 0) {
      return {
        nationalPension: 0,
        healthInsurance: 0,
        longTermCare: 0,
        employmentInsurance: 0,
        incomeTax: 0,
        localTax: 0,
      };
    }

    // 2026년 4대보험료율 적용
    const nationalPensionBase = Math.min(
      Math.max(taxableIncome, 400000),
      6370000,
    );

    return {
      nationalPension: Math.round(nationalPensionBase * 0.0475),
      healthInsurance: Math.round(taxableIncome * 0.03595),
      longTermCare: Math.round(taxableIncome * 0.03595 * 0.1314), // 13.14% (2026년, 0.9448%÷7.19%)
      employmentInsurance: Math.round(taxableIncome * 0.009),
      incomeTax:
        Math.floor(
          (calculateIncomeTax(
            taxableIncome,
            payslip.dependents,
            payslip.childrenUnder20,
          ) *
            (payslip.taxWithholdingRate / 100)) /
            10,
        ) * 10,
      localTax:
        Math.floor(
          (calculateIncomeTax(
            taxableIncome,
            payslip.dependents,
            payslip.childrenUnder20,
          ) *
            (payslip.taxWithholdingRate / 100) *
            0.1) /
            10,
        ) * 10,
    };
  })();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `급여명세서_${payslip.employee.name}_${payslip.year}년${payslip.month}월`,
  });

  const updateEmployee = (field: keyof EmployeeInfo, value: string) => {
    setPayslip((prev) => ({
      ...prev,
      employee: { ...prev.employee, [field]: value },
    }));
  };

  const updateEarnings = (field: string, value: number) => {
    setPayslip((prev) => {
      const newEarnings = { ...prev.earnings, [field]: value };
      const wi = prev.workInfo;
      const hasExtraHours =
        wi.overtimeHours > 0 || wi.nightHours > 0 || wi.holidayHours > 0;

      // 통상임금 포함 항목(식대, ordinaryWage 수당) 변경 시 가산수당 재계산
      const isOrdinaryField =
        field === "mealAllowance" ||
        ADDITIONAL_EARNINGS.some((e) => e.key === field && e.ordinaryWage);
      if (isOrdinaryField && hasExtraHours) {
        const useAddition =
          prev.businessSize === "5이상" || enableOvertimeAllowances;
        const ordA = getOrdinaryAllowanceTotal(
          newEarnings,
          prev.enabledAdditionalEarnings,
        );
        const r = calcOrdinaryHourlyRate(
          newEarnings.baseSalary,
          ordA,
          wi.salaryType,
          wi.hourlyWage,
        );
        const { overtime, nightWork, holidayWork } = calcOvertimeAllowances(
          r,
          wi.overtimeHours,
          wi.nightHours,
          wi.holidayHours,
          wi.overtimeNightHours,
          wi.holidayNightHours,
          useAddition,
        );
        return {
          ...prev,
          earnings: { ...newEarnings, overtime, nightWork, holidayWork },
        };
      }
      return { ...prev, earnings: newEarnings };
    });
  };

  const updateDeductions = (
    field: keyof PayslipData["deductions"],
    value: number,
  ) => {
    setPayslip((prev) => ({
      ...prev,
      deductions: { ...prev.deductions, [field]: value },
    }));
  };

  // 총 지급액 계산
  const totalEarnings =
    payslip.earnings.baseSalary +
    payslip.earnings.overtime +
    (payslip.earnings.nightWork || 0) +
    (payslip.earnings.holidayWork || 0) +
    payslip.earnings.bonus +
    payslip.earnings.mealAllowance +
    payslip.earnings.transportAllowance +
    payslip.earnings.otherAllowance +
    payslip.enabledAdditionalEarnings.reduce(
      (sum, key) => sum + (payslip.earnings[key] || 0),
      0,
    );

  const totalDeductions = Object.values(deductions).reduce(
    (sum, val) => sum + val,
    0,
  );
  const netPay = totalEarnings - totalDeductions;

  // 법정 필수기재사항 검증 (근로기준법 제48조 ②항)
  const validatePayslip = useCallback((): string[] => {
    const warnings: string[] = [];
    if (!payslip.employee.name)
      warnings.push("근로자 성명이 입력되지 않았습니다.");
    if (!payslip.birthDate && !payslip.employeeId)
      warnings.push(
        "생년월일 또는 사원번호 등 근로자를 특정할 수 있는 정보가 필요합니다.",
      );
    if (!payslip.paymentDate)
      warnings.push("임금 지급일이 입력되지 않았습니다.");
    if (totalEarnings <= 0) warnings.push("임금 총액이 0원입니다.");
    if (payslip.earnings.baseSalary <= 0)
      warnings.push("기본급이 입력되지 않았습니다.");
    if (payslip.workInfo.workDays <= 0)
      warnings.push("출근일수가 입력되지 않았습니다.");
    if (payslip.workInfo.totalWorkHours <= 0)
      warnings.push("총 근로시간수가 입력되지 않았습니다.");
    if (payslip.workInfo.prescribedWorkHours <= 0)
      warnings.push("소정근로시간수가 입력되지 않았습니다.");
    return warnings;
  }, [payslip, totalEarnings]);

  const validationWarnings = validatePayslip();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "급여/임금", href: "/documents" },
          { label: "급여명세서" },
        ]}
      />
      {/* 자동저장 복원 배너 */}
      {showRestoreBanner && (
        <div className="flex items-center justify-between px-4 py-3 mb-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <span className="text-blue-800">
            이전에 작성하던 급여명세서가 있습니다.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const saved = restorePayslip();
                if (saved) setPayslip(saved);
                setShowRestoreBanner(false);
              }}
              className="px-3 py-1 bg-[var(--primary)] text-white rounded-lg text-xs font-medium hover:opacity-90"
            >
              복원하기
            </button>
            <button
              onClick={() => {
                clearPayslipAutoSave();
                setShowRestoreBanner(false);
              }}
              className="px-3 py-1 text-blue-600 hover:text-blue-800 text-xs"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            💰 급여명세서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            개인별 급여명세서를 작성합니다.
          </p>
          <AutoSaveStatus lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
          >
            {showPreview ? "✏️ 수정하기" : "👁️ 미리보기"}
          </button>
          <button
            onClick={handleSaveToLedger}
            disabled={!selectedEmployeeId || saveStatus === "saving"}
            className="btn-secondary disabled:opacity-50"
          >
            {saveStatus === "saving"
              ? "💾 저장중..."
              : saveStatus === "saved"
                ? "✅ 저장완료"
                : "💾 임금대장에 저장"}
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
          {showPreview && (
            <EmailSendButton
              documentTitle={`급여명세서 — ${payslip.employee.name || "미입력"} ${payslip.year}년 ${payslip.month}월`}
              documentType="급여명세서"
              recipientName={payslip.employee.name}
              printRef={printRef}
            />
          )}
          <button onClick={() => handlePrint()} className="btn-primary">
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="payslip"
        steps={[
          '먼저 "직원 선택"에서 급여를 줄 직원을 고르세요. 기본급과 수당이 자동으로 채워집니다.',
          "연장근무나 야간근무가 있었다면 시간을 입력하세요. 수당이 자동 계산됩니다.",
          '오른쪽(또는 하단)에 실시간으로 실수령액이 표시됩니다. 확인 후 "미리보기 → 인쇄"하세요.',
          '💾 "임금대장에 저장"을 누르면 매월 급여 기록이 쌓여서 연말정산이나 퇴직금 계산에 활용됩니다.',
        ]}
      />

      {/* 법정 필수기재사항 누락 경고 — 직원 선택 전에는 부드러운 안내, 선택 후에는 경고 */}
      {validationWarnings.length > 0 &&
        !selectedEmployeeId &&
        !payslip.employee.name && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              💡 시작하려면 아래에서 직원을 선택하거나 정보를 입력하세요
            </p>
            <p className="text-sm text-blue-600">
              직원을 선택하면 성명·급여·4대보험이 자동으로 채워집니다.
            </p>
          </div>
        )}
      {validationWarnings.length > 0 &&
        (selectedEmployeeId || payslip.employee.name) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              ⚠️ 법정 필수기재사항 누락 (근로기준법 제48조 ②항)
            </p>
            <ul className="text-sm text-amber-700 space-y-1">
              {validationWarnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

      <div className="flex gap-6">
        <div className="flex-1 min-w-0 max-w-4xl">
          {!showPreview ? (
            <div className="space-y-6">
              {/* 간편/상세 모드 토글 */}
              <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {simpleMode ? "간편 모드" : "상세 모드"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {simpleMode
                      ? "기본급·식대·교통비·연장/야간수당 5개 항목만 표시"
                      : "근로시간·부양가족·추가수당까지 상세 설정"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimpleMode(!simpleMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${simpleMode ? "bg-[var(--border)]" : "bg-[var(--primary)]"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[var(--bg-card)] transition-transform ${simpleMode ? "translate-x-1" : "translate-x-6"}`}
                  />
                </button>
              </div>

              <MobileFormWizard
                completeLabel="미리보기"
                onComplete={() => setShowPreview(true)}
                steps={[
                  {
                    title: "기본 정보",
                    icon: "📅",
                    validate: () => !!payslip.employee.name,
                    validationMessage: "직원 성명은 필수 입력 항목입니다.",
                    summary: [
                      {
                        label: "기간",
                        value: `${payslip.year}년 ${payslip.month}월`,
                      },
                      { label: "직원", value: payslip.employee.name },
                    ],
                    content: (
                      <div className="space-y-6">
                        {/* 기본 정보 */}
                        <div className="form-section">
                          <h2 className="form-section-title">📅 귀속 기간</h2>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="input-label">연도</label>
                              <select
                                className="input-field"
                                value={payslip.year}
                                onChange={(e) => {
                                  const newYear = parseInt(e.target.value);
                                  const emp = employees.find(
                                    (emp) => emp.id === selectedEmployeeId,
                                  );
                                  const work = calcWorkInfo(
                                    newYear,
                                    payslip.month,
                                    emp,
                                    payslip.workInfo.salaryType,
                                  );
                                  setPayslip((prev) => ({
                                    ...prev,
                                    year: newYear,
                                    workInfo: {
                                      ...prev.workInfo,
                                      workDays: work.days,
                                      totalWorkHours: work.hours,
                                      prescribedWorkHours: work.hours,
                                    },
                                  }));
                                }}
                              >
                                {[2024, 2025, 2026].map((year) => (
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
                                value={payslip.month}
                                onChange={(e) => {
                                  const newMonth = parseInt(e.target.value);
                                  const emp = employees.find(
                                    (emp) => emp.id === selectedEmployeeId,
                                  );
                                  const work = calcWorkInfo(
                                    payslip.year,
                                    newMonth,
                                    emp,
                                    payslip.workInfo.salaryType,
                                  );
                                  setPayslip((prev) => ({
                                    ...prev,
                                    month: newMonth,
                                    workInfo: {
                                      ...prev.workInfo,
                                      workDays: work.days,
                                      totalWorkHours: work.hours,
                                      prescribedWorkHours: work.hours,
                                    },
                                  }));
                                }}
                              >
                                {Array.from(
                                  { length: 12 },
                                  (_, i) => i + 1,
                                ).map((month) => (
                                  <option key={month} value={month}>
                                    {month}월
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="input-label">지급일</label>
                              <input
                                type="date"
                                className="input-field"
                                value={payslip.paymentDate}
                                onChange={(e) =>
                                  setPayslip((prev) => ({
                                    ...prev,
                                    paymentDate: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* 직원 정보 */}
                        <div className="form-section">
                          <h2 className="form-section-title">👤 직원 정보</h2>

                          {employees.length === 0 && (
                            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-semibold text-blue-800 mb-1">
                                💡 직원을 먼저 등록하면 훨씬 편합니다
                              </p>
                              <p className="text-xs text-blue-600 mb-2">
                                한 번 등록하면 급여명세서·근로계약서·4대보험 등
                                30종 서류에 자동 반영됩니다.
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
                                onChange={(e) =>
                                  handleEmployeeSelect(e.target.value)
                                }
                              >
                                <option value="">직접 입력</option>
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.info.name} (
                                    {emp.department || "부서없음"} /{" "}
                                    {emp.position || "직위없음"})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="input-label">성명 *</label>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="홍길동"
                                value={payslip.employee.name}
                                onChange={(e) =>
                                  updateEmployee("name", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="input-label">생년월일 *</label>
                              <input
                                type="date"
                                className="input-field"
                                value={payslip.birthDate}
                                onChange={(e) =>
                                  setPayslip((prev) => ({
                                    ...prev,
                                    birthDate: e.target.value,
                                  }))
                                }
                              />
                              <p className="text-xs text-zinc-400 mt-1">
                                근로자 특정 정보 (법정 필수)
                              </p>
                            </div>
                            <div>
                              <label className="input-label">사원번호 *</label>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="EMP-001"
                                value={payslip.employeeId}
                                onChange={(e) =>
                                  setPayslip((prev) => ({
                                    ...prev,
                                    employeeId: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <label className="input-label">부서/직책</label>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="개발팀 / 대리"
                                value={payslip.employee.address}
                                onChange={(e) =>
                                  updateEmployee("address", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          {/* 부양가족 정보 (간이세액표용) — 상세 모드에서만 */}
                          {!simpleMode && (
                            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                              <label className="input-label text-indigo-800">
                                👨‍👩‍👧 부양가족 정보 (간이세액표 적용)
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                  <label className="text-xs text-indigo-700">
                                    공제대상 부양가족 수 (본인 포함)
                                  </label>
                                  <select
                                    className="input-field mt-1"
                                    value={payslip.dependents}
                                    onChange={(e) =>
                                      setPayslip((prev) => ({
                                        ...prev,
                                        dependents: parseInt(e.target.value),
                                      }))
                                    }
                                  >
                                    {Array.from(
                                      { length: 11 },
                                      (_, i) => i + 1,
                                    ).map((n) => (
                                      <option key={n} value={n}>
                                        {n}명{n === 1 ? " (본인만)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-indigo-700">
                                    20세 이하 자녀 수 (자녀세액공제)
                                  </label>
                                  <select
                                    className="input-field mt-1"
                                    value={payslip.childrenUnder20}
                                    onChange={(e) =>
                                      setPayslip((prev) => ({
                                        ...prev,
                                        childrenUnder20: parseInt(
                                          e.target.value,
                                        ),
                                      }))
                                    }
                                  >
                                    {Array.from({ length: 8 }, (_, i) => i).map(
                                      (n) => (
                                        <option key={n} value={n}>
                                          {n}명{n === 0 ? " (해당 없음)" : ""}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                  <p className="text-xs text-indigo-600 mt-1">
                                    공제: 1명 12,500원 / 2명 29,160원 / 3명+
                                    29,160+(n-2)×25,000원
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-indigo-700">
                                    소득세 원천징수 비율
                                  </label>
                                  <select
                                    className="input-field mt-1"
                                    value={payslip.taxWithholdingRate}
                                    onChange={(e) =>
                                      setPayslip((prev) => ({
                                        ...prev,
                                        taxWithholdingRate: parseInt(
                                          e.target.value,
                                        ) as 80 | 100 | 120,
                                      }))
                                    }
                                  >
                                    <option value={80}>
                                      80% — 매월 적게 공제 (연말정산 시 추가
                                      납부 가능)
                                    </option>
                                    <option value={100}>
                                      100% — 기본 (간이세액표 그대로)
                                    </option>
                                    <option value={120}>
                                      120% — 매월 많이 공제 (연말정산 시 환급
                                      가능)
                                    </option>
                                  </select>
                                  <p className="text-xs text-indigo-600 mt-1">
                                    {payslip.taxWithholdingRate === 80 &&
                                      "💡 실수령액↑ · 연말정산 추가납부 가능성↑"}
                                    {payslip.taxWithholdingRate === 100 &&
                                      "💡 기본값 · 별도 신청 없으면 자동 적용"}
                                    {payslip.taxWithholdingRate === 120 &&
                                      "💡 실수령액↓ · 연말정산 환급 가능성↑"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "근로시간",
                    icon: "⏱️",
                    visible: () => !simpleMode,
                    summary: [
                      {
                        label: "출근",
                        value: `${payslip.workInfo.workDays}일`,
                      },
                      {
                        label: "근로",
                        value: `${payslip.workInfo.totalWorkHours}시간`,
                      },
                    ],
                    content: (
                      <div className="form-section">
                        <h2 className="form-section-title">
                          ⏱️ 근로시간 정보
                          <span className="ml-2 text-xs font-normal text-red-500">
                            (법적 필수)
                          </span>
                        </h2>
                        <p className="text-xs text-zinc-500 mb-4">
                          근로기준법 시행령 제27조의2에 따라 반드시 기재해야
                          합니다.
                        </p>

                        {/* 사업장 규모 선택 */}
                        <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <label className="input-label text-amber-800">
                            🏢 사업장 규모 (가산수당 적용 여부)
                          </label>
                          <select
                            className="input-field mt-1"
                            value={payslip.businessSize}
                            onChange={(e) => {
                              const newSize = e.target.value as
                                | "5이상"
                                | "5미만";
                              setPayslip((prev) => ({
                                ...prev,
                                businessSize: newSize,
                              }));
                              // 5인 이상으로 변경 시 가산수당 자동계산 활성화
                              if (newSize === "5이상") {
                                setEnableOvertimeAllowances(false);
                              }
                            }}
                          >
                            <option value="5이상">
                              5인 이상 (가산수당 법적 의무)
                            </option>
                            <option value="5미만">
                              5인 미만 (가산수당 법적 의무 없음)
                            </option>
                          </select>
                          <p className="text-xs text-amber-700 mt-2">
                            근로기준법 제11조: 5인 미만 사업장은
                            제56조(가산수당) 미적용
                          </p>
                        </div>

                        {/* 5인 미만 사업장 가산수당 자동계산 옵션 */}
                        {payslip.businessSize === "5미만" && (
                          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={enableOvertimeAllowances}
                                onChange={(e) => {
                                  const newValue = e.target.checked;
                                  setEnableOvertimeAllowances(newValue);

                                  // 체크박스 상태 변경 시 가산수당 재계산
                                  setPayslip((prev) => {
                                    const wi = prev.workInfo;
                                    const hasExtraHours =
                                      wi.overtimeHours > 0 ||
                                      wi.nightHours > 0 ||
                                      wi.holidayHours > 0;

                                    if (
                                      !hasExtraHours ||
                                      prev.earnings.baseSalary === 0
                                    ) {
                                      return prev;
                                    }

                                    const useAddition =
                                      prev.businessSize === "5이상" || newValue;
                                    const ordA = getOrdinaryAllowanceTotal(
                                      prev.earnings,
                                      prev.enabledAdditionalEarnings,
                                    );
                                    const r = calcOrdinaryHourlyRate(
                                      prev.earnings.baseSalary,
                                      ordA,
                                      wi.salaryType,
                                      wi.hourlyWage,
                                    );
                                    const { overtime, nightWork, holidayWork } =
                                      calcOvertimeAllowances(
                                        r,
                                        wi.overtimeHours,
                                        wi.nightHours,
                                        wi.holidayHours,
                                        wi.overtimeNightHours,
                                        wi.holidayNightHours,
                                        useAddition,
                                      );
                                    return {
                                      ...prev,
                                      earnings: {
                                        ...prev.earnings,
                                        overtime,
                                        nightWork,
                                        holidayWork,
                                      },
                                    };
                                  });
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-blue-800">
                                가산수당 자동계산 (법적 의무는 아니지만
                                자발적으로 지급하는 경우)
                              </span>
                            </label>
                            <p className="text-xs text-blue-600 mt-1 ml-6">
                              체크 해제 시 가산수당을 수동으로 입력할 수
                              있습니다.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="input-label">
                              임금계산방법 *
                            </label>
                            <select
                              className="input-field"
                              value={payslip.workInfo.salaryType}
                              onChange={(e) => {
                                const newType = e.target.value as
                                  | "monthly"
                                  | "hourly";
                                const emp = employees.find(
                                  (emp) => emp.id === selectedEmployeeId,
                                );
                                const work = calcWorkInfo(
                                  payslip.year,
                                  payslip.month,
                                  emp,
                                  newType,
                                );
                                setPayslip((prev) => {
                                  const wi = {
                                    ...prev.workInfo,
                                    salaryType: newType,
                                    totalWorkHours: work.hours,
                                    prescribedWorkHours: work.hours,
                                  };
                                  const hasExtraHours =
                                    wi.overtimeHours > 0 ||
                                    wi.nightHours > 0 ||
                                    wi.holidayHours > 0;

                                  if (!hasExtraHours)
                                    return { ...prev, workInfo: wi };

                                  const useAddition =
                                    prev.businessSize === "5이상" ||
                                    enableOvertimeAllowances;
                                  const ordA = getOrdinaryAllowanceTotal(
                                    prev.earnings,
                                    prev.enabledAdditionalEarnings,
                                  );
                                  const r = calcOrdinaryHourlyRate(
                                    prev.earnings.baseSalary,
                                    ordA,
                                    newType,
                                    wi.hourlyWage,
                                  );
                                  const { overtime, nightWork, holidayWork } =
                                    calcOvertimeAllowances(
                                      r,
                                      wi.overtimeHours,
                                      wi.nightHours,
                                      wi.holidayHours,
                                      wi.overtimeNightHours,
                                      wi.holidayNightHours,
                                      useAddition,
                                    );
                                  return {
                                    ...prev,
                                    workInfo: wi,
                                    earnings: {
                                      ...prev.earnings,
                                      overtime,
                                      nightWork,
                                      holidayWork,
                                    },
                                  };
                                });
                              }}
                            >
                              <option value="monthly">월급제</option>
                              <option value="hourly">시급제</option>
                            </select>
                          </div>
                          <div>
                            <label className="input-label">출근일수 *</label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="22"
                              value={payslip.workInfo.workDays || ""}
                              onChange={(e) =>
                                setPayslip((prev) => ({
                                  ...prev,
                                  workInfo: {
                                    ...prev.workInfo,
                                    workDays: parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="input-label">
                              소정근로시간 *
                            </label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="209"
                              value={payslip.workInfo.prescribedWorkHours || ""}
                              onChange={(e) =>
                                setPayslip((prev) => ({
                                  ...prev,
                                  workInfo: {
                                    ...prev.workInfo,
                                    prescribedWorkHours:
                                      parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                            />
                            <p className="text-xs text-zinc-400 mt-1">
                              월급제: 209시간
                            </p>
                          </div>
                          <div>
                            <label className="input-label">총 근로시간 *</label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="176"
                              value={payslip.workInfo.totalWorkHours || ""}
                              onChange={(e) =>
                                setPayslip((prev) => ({
                                  ...prev,
                                  workInfo: {
                                    ...prev.workInfo,
                                    totalWorkHours:
                                      parseInt(e.target.value) || 0,
                                  },
                                }))
                              }
                            />
                          </div>
                          {payslip.workInfo.salaryType === "hourly" && (
                            <div>
                              <label className="input-label">시급 (원)</label>
                              <input
                                type="number"
                                className="input-field"
                                placeholder="10320"
                                value={payslip.workInfo.hourlyWage || ""}
                                onChange={(e) => {
                                  const newWage = parseInt(e.target.value) || 0;
                                  setPayslip((prev) => {
                                    const wi = {
                                      ...prev.workInfo,
                                      hourlyWage: newWage,
                                    };
                                    const hasExtraHours =
                                      wi.overtimeHours > 0 ||
                                      wi.nightHours > 0 ||
                                      wi.holidayHours > 0;

                                    if (!hasExtraHours)
                                      return { ...prev, workInfo: wi };

                                    const useAddition =
                                      prev.businessSize === "5이상" ||
                                      enableOvertimeAllowances;
                                    const ordA = getOrdinaryAllowanceTotal(
                                      prev.earnings,
                                      prev.enabledAdditionalEarnings,
                                    );
                                    const r = calcOrdinaryHourlyRate(
                                      prev.earnings.baseSalary,
                                      ordA,
                                      wi.salaryType,
                                      newWage,
                                    );
                                    const { overtime, nightWork, holidayWork } =
                                      calcOvertimeAllowances(
                                        r,
                                        wi.overtimeHours,
                                        wi.nightHours,
                                        wi.holidayHours,
                                        wi.overtimeNightHours,
                                        wi.holidayNightHours,
                                        useAddition,
                                      );
                                    return {
                                      ...prev,
                                      workInfo: wi,
                                      earnings: {
                                        ...prev.earnings,
                                        overtime,
                                        nightWork,
                                        holidayWork,
                                      },
                                    };
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="input-label">연장근로시간</label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="0"
                              value={payslip.workInfo.overtimeHours || ""}
                              onChange={(e) =>
                                updateWorkHoursAndAllowances(
                                  "overtimeHours",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                            <p className="text-xs text-zinc-400 mt-1">
                              주 40시간 초과분
                            </p>
                            {payslip.workInfo.overtimeHours > 0 && (
                              <div className="mt-2">
                                <label className="text-xs text-amber-700 font-medium">
                                  이 중 야간
                                </label>
                                <input
                                  type="number"
                                  className="input-field mt-1 !text-sm !py-1"
                                  placeholder="0"
                                  max={payslip.workInfo.overtimeHours}
                                  value={
                                    payslip.workInfo.overtimeNightHours || ""
                                  }
                                  onChange={(e) =>
                                    updateWorkHoursAndAllowances(
                                      "overtimeNightHours",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                                <p className="text-xs text-amber-600 mt-0.5">
                                  연장+야간 → 2.0배
                                </p>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="input-label">야간근로시간</label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="0"
                              value={payslip.workInfo.nightHours || ""}
                              onChange={(e) =>
                                updateWorkHoursAndAllowances(
                                  "nightHours",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                            <p className="text-xs text-zinc-400 mt-1">
                              22시~06시 (단독 야간, 가산분 0.5배)
                            </p>
                          </div>
                          <div>
                            <label className="input-label">휴일근로시간</label>
                            <input
                              type="number"
                              className="input-field"
                              placeholder="0"
                              value={payslip.workInfo.holidayHours || ""}
                              onChange={(e) =>
                                updateWorkHoursAndAllowances(
                                  "holidayHours",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                            <p className="text-xs text-zinc-400 mt-1">
                              휴일 근무 (8h이내 1.5배, 초과 2.0배)
                            </p>
                            {payslip.workInfo.holidayHours > 0 && (
                              <div className="mt-2">
                                <label className="text-xs text-amber-700 font-medium">
                                  이 중 야간
                                </label>
                                <input
                                  type="number"
                                  className="input-field mt-1 !text-sm !py-1"
                                  placeholder="0"
                                  max={payslip.workInfo.holidayHours}
                                  value={
                                    payslip.workInfo.holidayNightHours || ""
                                  }
                                  onChange={(e) =>
                                    updateWorkHoursAndAllowances(
                                      "holidayNightHours",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                                <p className="text-xs text-amber-600 mt-0.5">
                                  최대 2.5배 (8h초과+야간)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 주 52시간 상한 경고 */}
                        {(() => {
                          const totalOvertime =
                            (payslip.workInfo.overtimeHours || 0) +
                            (payslip.workInfo.holidayHours || 0);
                          const weeklyTotal =
                            40 + (payslip.workInfo.overtimeHours || 0);
                          const monthlyExtended =
                            payslip.workInfo.overtimeHours || 0;
                          if (
                            monthlyExtended <= 0 &&
                            (payslip.workInfo.holidayHours || 0) <= 0
                          )
                            return null;
                          // 월 기준 연장근로 환산: 주 12시간 × 4.345 ≈ 52시간/월
                          const isOver = monthlyExtended > 52;
                          const isNearLimit = monthlyExtended > 40;
                          if (!isOver && !isNearLimit) return null;
                          return (
                            <div
                              className={`mt-4 p-3 rounded-lg border ${isOver ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-300"}`}
                            >
                              <p
                                className={`text-sm font-medium ${isOver ? "text-red-800" : "text-amber-800"}`}
                              >
                                {isOver
                                  ? "🚨 월 연장근로시간이 법정 한도를 초과했습니다"
                                  : "⚠️ 월 연장근로시간이 법정 한도에 근접합니다"}
                              </p>
                              <p
                                className={`text-xs mt-1 ${isOver ? "text-red-700" : "text-amber-700"}`}
                              >
                                이번 달 연장근로 {monthlyExtended}시간 (법정
                                한도: 약 52시간/월 = 주 12시간 × 4.345주)
                              </p>
                              {isOver && (
                                <p className="text-xs text-red-700 mt-1 font-medium">
                                  근로기준법 제53조 위반 — 2년 이하 징역 또는
                                  2천만원 이하 벌금
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* 통상시급 안내 (기본급이 입력된 경우) */}
                        {payslip.earnings.baseSalary > 0 && (
                          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm text-amber-800">
                              <span className="font-medium">통상시급:</span>{" "}
                              {formatCurrency(Math.round(hourlyRate))}
                              <span className="text-xs text-amber-600 ml-2">
                                (
                                {payslip.workInfo.salaryType === "monthly"
                                  ? ordinaryAllowances > 0
                                    ? `(기본급 ${formatCurrency(payslip.earnings.baseSalary)} + 고정수당 ${formatCurrency(ordinaryAllowances)}) ÷ ${MINIMUM_WAGE.monthlyHours}h`
                                    : `기본급 ${formatCurrency(payslip.earnings.baseSalary)} ÷ ${MINIMUM_WAGE.monthlyHours}h`
                                  : `시급 ${formatCurrency(payslip.workInfo.hourlyWage || 0)}`}
                                )
                              </span>
                            </p>
                            <p className="text-xs text-amber-600 mt-1">
                              통상임금 = 정기성·일률성·고정성을 갖춘 임금
                              (기본급 + 식대 + 직책·근속·가족·주택수당 등)
                            </p>
                            {(payslip.workInfo.overtimeHours > 0 ||
                              payslip.workInfo.nightHours > 0 ||
                              payslip.workInfo.holidayHours > 0) && (
                              <>
                                {payslip.businessSize === "5이상" ? (
                                  <p className="text-xs text-amber-600 mt-1">
                                    ✅ 5인 이상 사업장: 연장·야간·휴일 수당 자동
                                    계산 (근로기준법 제56조, 최대 2.5배)
                                  </p>
                                ) : enableOvertimeAllowances ? (
                                  <p className="text-xs text-blue-600 mt-1">
                                    💡 5인 미만 사업장: 법적 의무는 없으나
                                    자발적 가산수당 자동 계산 중
                                  </p>
                                ) : (
                                  <p className="text-xs text-zinc-500 mt-1">
                                    ℹ️ 5인 미만 사업장: 가산수당 법적 의무 없음
                                    (근로기준법 제11조)
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: "지급 내역",
                    icon: "📈",
                    validate: () => payslip.earnings.baseSalary > 0,
                    validationMessage: "기본급을 입력해주세요.",
                    summary: [
                      {
                        label: "기본급",
                        value: formatCurrency(payslip.earnings.baseSalary),
                      },
                    ],
                    content: (
                      <div className="space-y-6">
                        {/* 지급 내역 - 기본 항목 */}
                        <div className="form-section">
                          <h2 className="form-section-title">
                            📈 지급 내역 (기본)
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="input-label">기본급 *</label>
                              <input
                                type="number"
                                className="input-field"
                                placeholder="3000000"
                                value={payslip.earnings.baseSalary || ""}
                                onChange={(e) => {
                                  const newBase = parseInt(e.target.value) || 0;
                                  setPayslip((prev) => {
                                    const wi = prev.workInfo;
                                    const hasExtraHours =
                                      wi.overtimeHours > 0 ||
                                      wi.nightHours > 0 ||
                                      wi.holidayHours > 0;

                                    if (!hasExtraHours) {
                                      return {
                                        ...prev,
                                        earnings: {
                                          ...prev.earnings,
                                          baseSalary: newBase,
                                        },
                                      };
                                    }

                                    const useAddition =
                                      prev.businessSize === "5이상" ||
                                      enableOvertimeAllowances;
                                    const ordA = getOrdinaryAllowanceTotal(
                                      { ...prev.earnings, baseSalary: newBase },
                                      prev.enabledAdditionalEarnings,
                                    );
                                    const r = calcOrdinaryHourlyRate(
                                      newBase,
                                      ordA,
                                      wi.salaryType,
                                      wi.hourlyWage,
                                    );
                                    const { overtime, nightWork, holidayWork } =
                                      calcOvertimeAllowances(
                                        r,
                                        wi.overtimeHours,
                                        wi.nightHours,
                                        wi.holidayHours,
                                        wi.overtimeNightHours,
                                        wi.holidayNightHours,
                                        useAddition,
                                      );
                                    return {
                                      ...prev,
                                      earnings: {
                                        ...prev.earnings,
                                        baseSalary: newBase,
                                        overtime,
                                        nightWork,
                                        holidayWork,
                                      },
                                    };
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                연장근로수당{" "}
                                <InfoTooltip
                                  simple="법정 근로시간(주 40시간) 초과 시 통상임금의 50%를 가산합니다"
                                  legal="근로기준법 제56조"
                                />
                                {payslip.businessSize === "5미만" && (
                                  <span className="ml-1 text-xs text-amber-600 font-normal">
                                    (법적의무없음)
                                  </span>
                                )}
                                {payslip.workInfo.overtimeHours > 0 &&
                                  (payslip.businessSize === "5이상" ||
                                    enableOvertimeAllowances) && (
                                    <span className="ml-1 text-xs text-blue-500 font-normal">
                                      (자동계산)
                                    </span>
                                  )}
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={payslip.earnings.overtime || ""}
                                onChange={(e) =>
                                  updateEarnings(
                                    "overtime",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                              {payslip.workInfo.overtimeHours > 0 &&
                                payslip.earnings.baseSalary > 0 && (
                                  <p className="text-xs text-blue-500 mt-1">
                                    {(() => {
                                      const useAddition =
                                        payslip.businessSize === "5이상" ||
                                        enableOvertimeAllowances;
                                      const rate = formatCurrency(
                                        Math.round(hourlyRate),
                                      );
                                      if (
                                        payslip.workInfo.overtimeNightHours >
                                          0 &&
                                        useAddition
                                      ) {
                                        return `${rate}/h × (${payslip.workInfo.overtimeHours - payslip.workInfo.overtimeNightHours}h×1.5 + ${payslip.workInfo.overtimeNightHours}h×2.0)`;
                                      }
                                      const multiplier = useAddition
                                        ? "1.5"
                                        : "1.0";
                                      return `${rate}/h × ${multiplier} × ${payslip.workInfo.overtimeHours}h`;
                                    })()}
                                  </p>
                                )}
                            </div>
                            <div>
                              <label className="input-label">
                                야간근로수당
                                {payslip.businessSize === "5미만" && (
                                  <span className="ml-1 text-xs text-amber-600 font-normal">
                                    (법적의무없음)
                                  </span>
                                )}
                                {payslip.workInfo.nightHours > 0 &&
                                  (payslip.businessSize === "5이상" ||
                                    enableOvertimeAllowances) && (
                                    <span className="ml-1 text-xs text-blue-500 font-normal">
                                      (자동계산)
                                    </span>
                                  )}
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={payslip.earnings.nightWork || ""}
                                onChange={(e) =>
                                  updateEarnings(
                                    "nightWork",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                              {payslip.workInfo.nightHours > 0 &&
                                payslip.earnings.baseSalary > 0 && (
                                  <p className="text-xs text-blue-500 mt-1">
                                    {formatCurrency(Math.round(hourlyRate))}/h ×
                                    0.5 × {payslip.workInfo.nightHours}h (단독
                                    야간 가산)
                                  </p>
                                )}
                            </div>
                            {!simpleMode && (
                              <>
                                <div>
                                  <label className="input-label">
                                    휴일근로수당
                                    {payslip.businessSize === "5미만" && (
                                      <span className="ml-1 text-xs text-amber-600 font-normal">
                                        (법적의무없음)
                                      </span>
                                    )}
                                    {payslip.workInfo.holidayHours > 0 &&
                                      (payslip.businessSize === "5이상" ||
                                        enableOvertimeAllowances) && (
                                        <span className="ml-1 text-xs text-blue-500 font-normal">
                                          (자동계산)
                                        </span>
                                      )}
                                  </label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    value={payslip.earnings.holidayWork || ""}
                                    onChange={(e) =>
                                      updateEarnings(
                                        "holidayWork",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                  {payslip.workInfo.holidayHours > 0 &&
                                    payslip.earnings.baseSalary > 0 && (
                                      <p className="text-xs text-blue-500 mt-1">
                                        {(() => {
                                          const useAddition =
                                            payslip.businessSize === "5이상" ||
                                            enableOvertimeAllowances;
                                          const hh =
                                            payslip.workInfo.holidayHours;
                                          const hn =
                                            payslip.workInfo.holidayNightHours;
                                          const rateStr = formatCurrency(
                                            Math.round(hourlyRate),
                                          );
                                          if (hn > 0 && useAddition)
                                            return `${rateStr}/h × 휴일${hh}h (야간${hn}h 중복, 최대 2.5배)`;
                                          const multiplier = useAddition
                                            ? "1.5"
                                            : "1.0";
                                          if (hh <= 8)
                                            return `${rateStr}/h × ${multiplier} × ${hh}h`;
                                          if (useAddition)
                                            return `${rateStr}/h × (8h×1.5 + ${hh - 8}h×2.0)`;
                                          return `${rateStr}/h × 1.0 × ${hh}h`;
                                        })()}
                                      </p>
                                    )}
                                </div>
                                <div>
                                  <label className="input-label">상여금</label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    value={payslip.earnings.bonus || ""}
                                    onChange={(e) =>
                                      updateEarnings(
                                        "bonus",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                              </>
                            )}
                            <div>
                              <label className="input-label">
                                식대{" "}
                                <InfoTooltip
                                  simple="식대·교통비 등 월 20만원까지 소득세가 면제됩니다"
                                  legal="소득세법 시행령 제12조"
                                />
                                <span className="ml-1 text-xs text-emerald-600 font-normal">
                                  (비과세)
                                </span>
                                <span className="ml-1 text-xs text-amber-600 font-normal">
                                  ◆통상
                                </span>
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                placeholder="200000"
                                value={payslip.earnings.mealAllowance || ""}
                                onChange={(e) =>
                                  updateEarnings(
                                    "mealAllowance",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                자가운전보조금
                                <span className="ml-1 text-xs text-emerald-600 font-normal">
                                  (비과세)
                                </span>
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                placeholder="200000"
                                value={
                                  payslip.earnings.transportAllowance || ""
                                }
                                onChange={(e) =>
                                  updateEarnings(
                                    "transportAllowance",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            {!simpleMode && (
                              <>
                                <div>
                                  <label className="input-label">
                                    기타수당
                                  </label>
                                  <input
                                    type="number"
                                    className="input-field"
                                    value={
                                      payslip.earnings.otherAllowance || ""
                                    }
                                    onChange={(e) =>
                                      updateEarnings(
                                        "otherAllowance",
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 추가 지급 항목 옵션 — 상세 모드에서만 */}
                        {!simpleMode && (
                          <div className="form-section">
                            <div className="flex items-center justify-between mb-4">
                              <h2 className="form-section-title mb-0">
                                ➕ 추가 지급 항목
                              </h2>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAdditionalOptions(
                                    !showAdditionalOptions,
                                  )
                                }
                                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                              >
                                {showAdditionalOptions
                                  ? "접기 ▲"
                                  : "항목 선택 ▼"}
                              </button>
                            </div>

                            {showAdditionalOptions && (
                              <div className="mb-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                                <p className="text-xs text-zinc-500 mb-3">
                                  필요한 항목을 선택하세요. 선택한 항목만
                                  입력란이 표시됩니다.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {ADDITIONAL_EARNINGS.map((item) => (
                                    <label
                                      key={item.key}
                                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                        payslip.enabledAdditionalEarnings.includes(
                                          item.key,
                                        )
                                          ? "bg-blue-50 border border-blue-200"
                                          : "hover:bg-zinc-100"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={payslip.enabledAdditionalEarnings.includes(
                                          item.key,
                                        )}
                                        onChange={() =>
                                          toggleAdditionalEarning(item.key)
                                        }
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">
                                        {item.label}
                                        {!item.taxable && (
                                          <span className="ml-1 text-xs text-emerald-600">
                                            ✓
                                          </span>
                                        )}
                                        {item.ordinaryWage && (
                                          <span className="ml-1 text-xs text-amber-600">
                                            ◆
                                          </span>
                                        )}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                                <p className="text-xs text-zinc-400 mt-3">
                                  <span className="text-emerald-600">✓</span> =
                                  비과세 항목
                                  <span className="ml-3 text-amber-600">
                                    ◆
                                  </span>{" "}
                                  = 통상임금 포함 (시급 산정 기준)
                                </p>
                              </div>
                            )}

                            {/* 선택된 추가 항목 입력 */}
                            {payslip.enabledAdditionalEarnings.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {payslip.enabledAdditionalEarnings.map(
                                  (key) => {
                                    const item = ADDITIONAL_EARNINGS.find(
                                      (e) => e.key === key,
                                    );
                                    if (!item) return null;
                                    return (
                                      <div key={key}>
                                        <label className="input-label">
                                          {item.label}
                                          {!item.taxable && (
                                            <span className="ml-1 text-xs text-emerald-600 font-normal">
                                              (비과세)
                                            </span>
                                          )}
                                        </label>
                                        <input
                                          type="number"
                                          className="input-field"
                                          placeholder={item.description}
                                          value={payslip.earnings[key] || ""}
                                          onChange={(e) =>
                                            updateEarnings(
                                              key,
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}

                            {payslip.enabledAdditionalEarnings.length === 0 &&
                              !showAdditionalOptions && (
                                <p className="text-sm text-zinc-400">
                                  선택된 추가 항목이 없습니다. {'"'}항목 선택
                                  {'"'}을 클릭해 추가하세요.
                                </p>
                              )}

                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <p className="text-blue-800 font-medium">
                                지급 합계: {formatCurrency(totalEarnings)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: "공제·실수령",
                    icon: "📉",
                    summary: [
                      {
                        label: "지급합계",
                        value: formatCurrency(totalEarnings),
                      },
                    ],
                    content: (
                      <div className="space-y-6">
                        {/* 공제 내역 */}
                        <div className="form-section">
                          <h2 className="form-section-title">📉 공제 내역</h2>
                          <div className="flex flex-wrap items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="autoCalc"
                                checked={autoCalculate}
                                onChange={(e) =>
                                  setAutoCalculate(e.target.checked)
                                }
                                className="w-4 h-4"
                              />
                              <label
                                htmlFor="autoCalc"
                                className="text-sm text-[var(--text-muted)]"
                              >
                                4대보험/세금 자동 계산
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-[var(--text-muted)]">
                                소득세 비율
                              </label>
                              <select
                                className="input-field py-1 w-auto text-sm"
                                value={payslip.taxWithholdingRate}
                                onChange={(e) =>
                                  setPayslip((prev) => ({
                                    ...prev,
                                    taxWithholdingRate: parseInt(
                                      e.target.value,
                                    ) as 80 | 100 | 120,
                                  }))
                                }
                              >
                                <option value={80}>80%</option>
                                <option value={100}>100% (기본)</option>
                                <option value={120}>120%</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="input-label">
                                국민연금 (4.75%){" "}
                                <span className="text-xs text-zinc-400">
                                  2026
                                </span>
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.nationalPension || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "nationalPension",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                건강보험 (3.595%){" "}
                                <span className="text-xs text-zinc-400">
                                  2026
                                </span>
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.healthInsurance || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "healthInsurance",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                장기요양 (13.14%)
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.longTermCare || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "longTermCare",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                고용보험 (0.9%)
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.employmentInsurance || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "employmentInsurance",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                            <div>
                              <label className="input-label">소득세</label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.incomeTax || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "incomeTax",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                            <div>
                              <label className="input-label">
                                지방소득세 (10%)
                              </label>
                              <input
                                type="number"
                                className="input-field"
                                value={deductions.localTax || ""}
                                onChange={(e) =>
                                  updateDeductions(
                                    "localTax",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                disabled={autoCalculate}
                              />
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-red-50 rounded-lg">
                            <p className="text-red-800 font-medium">
                              공제 합계: {formatCurrency(totalDeductions)}
                            </p>
                          </div>
                        </div>

                        {/* 실수령액 */}
                        <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-xl p-6 text-white">
                          <p className="text-lg opacity-90">실수령액</p>
                          <p className="text-4xl font-bold mt-2">
                            {formatCurrency(netPay)}
                          </p>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8">
              <PayslipPreview
                payslip={{ ...payslip, deductions }}
                enableOvertimeAllowances={enableOvertimeAllowances}
              />
            </div>
          )}
        </div>

        {/* Desktop: sticky right sidebar - 실시간 계산 패널 */}
        {!showPreview && totalEarnings > 0 && (
          <div className="hidden lg:block">
            <div className="sticky top-20 w-64 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                실시간 계산
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">총 지급액</span>
                  <span className="font-semibold text-[var(--text)]">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">총 공제액</span>
                  <span className="font-semibold text-red-500">
                    -{formatCurrency(totalDeductions)}
                  </span>
                </div>
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--text)]">
                      실수령액
                    </span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatCurrency(netPay)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Breakdown */}
              {totalEarnings > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text)]">
                    상세 내역 보기
                  </summary>
                  <div className="mt-2 space-y-1">
                    {payslip.earnings.baseSalary > 0 && (
                      <div className="flex justify-between">
                        <span>기본급</span>
                        <span>
                          {formatCurrency(payslip.earnings.baseSalary)}
                        </span>
                      </div>
                    )}
                    {payslip.earnings.overtime > 0 && (
                      <div className="flex justify-between">
                        <span>연장수당</span>
                        <span>{formatCurrency(payslip.earnings.overtime)}</span>
                      </div>
                    )}
                    {payslip.earnings.mealAllowance > 0 && (
                      <div className="flex justify-between">
                        <span>식대</span>
                        <span>
                          {formatCurrency(payslip.earnings.mealAllowance)}
                        </span>
                      </div>
                    )}
                    {deductions.nationalPension > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>국민연금</span>
                        <span>
                          -{formatCurrency(deductions.nationalPension)}
                        </span>
                      </div>
                    )}
                    {deductions.healthInsurance > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>건강보험</span>
                        <span>
                          -{formatCurrency(deductions.healthInsurance)}
                        </span>
                      </div>
                    )}
                    {deductions.incomeTax > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>소득세</span>
                        <span>-{formatCurrency(deductions.incomeTax)}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: fixed bottom bar - 실시간 계산 요약 (탭바 위) */}
      {!showPreview && totalEarnings > 0 && (
        <div
          className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-[var(--bg-card)] border-t border-[var(--border)] px-4 py-2 shadow-lg"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-4">
              <div>
                <span className="text-[var(--text-muted)] text-xs">지급</span>
                <p className="font-semibold">{formatCurrency(totalEarnings)}</p>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-xs">공제</span>
                <p className="font-semibold text-red-500">
                  -{formatCurrency(totalDeductions)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[var(--text-muted)] text-xs">실수령액</span>
              <p className="font-bold text-blue-600">
                {formatCurrency(netPay)}
              </p>
            </div>
          </div>
        </div>
      )}

      <LegalDisclaimer compact />

      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
        }}
      >
        <div ref={printRef}>
          <PayslipPreview
            payslip={{ ...payslip, deductions }}
            enableOvertimeAllowances={enableOvertimeAllowances}
          />
        </div>
      </div>
    </div>
  );
}

// 간이세액표 기반 소득세 계산 → src/lib/simple-tax-table.ts로 이관
import { calculateSimpleIncomeTax as calculateIncomeTax } from "@/lib/simple-tax-table";

function PayslipPreview({
  payslip,
  enableOvertimeAllowances,
}: {
  payslip: PayslipData;
  enableOvertimeAllowances: boolean;
}) {
  // 총액 계산
  const additionalTotal = payslip.enabledAdditionalEarnings.reduce(
    (sum, key) => sum + (payslip.earnings[key] || 0),
    0,
  );
  const totalEarnings =
    payslip.earnings.baseSalary +
    payslip.earnings.overtime +
    (payslip.earnings.nightWork || 0) +
    (payslip.earnings.holidayWork || 0) +
    payslip.earnings.bonus +
    payslip.earnings.mealAllowance +
    payslip.earnings.transportAllowance +
    payslip.earnings.otherAllowance +
    additionalTotal;
  const totalDeductions = Object.values(payslip.deductions).reduce(
    (sum, val) => sum + val,
    0,
  );
  const netPay = totalEarnings - totalDeductions;

  // 지급 항목 목록 생성 (계산방법 포함)
  const earningItems: {
    label: string;
    amount: number;
    taxFree?: boolean;
    calcMethod?: string;
  }[] = [
    {
      label: "기본급",
      amount: payslip.earnings.baseSalary,
      calcMethod:
        payslip.workInfo.salaryType === "monthly"
          ? "월급제"
          : `시급 ${formatCurrency(payslip.workInfo.hourlyWage || 0)} × ${payslip.workInfo.totalWorkHours}h`,
    },
  ];
  const prevOrdAllow = getOrdinaryAllowanceTotal(
    payslip.earnings,
    payslip.enabledAdditionalEarnings,
  );
  const previewHourlyRate = calcOrdinaryHourlyRate(
    payslip.earnings.baseSalary,
    prevOrdAllow,
    payslip.workInfo.salaryType,
    payslip.workInfo.hourlyWage,
  );
  const previewHourlyStr = formatCurrency(Math.round(previewHourlyRate));

  // 가산 적용 여부: 5인 이상이거나 5인 미만이면서 자동계산 활성화된 경우
  const useAddition =
    payslip.businessSize === "5이상" || enableOvertimeAllowances;

  if (payslip.earnings.overtime > 0) {
    const otDay =
      payslip.workInfo.overtimeHours - payslip.workInfo.overtimeNightHours;
    const otNight = payslip.workInfo.overtimeNightHours;
    earningItems.push({
      label: "연장근로수당",
      amount: payslip.earnings.overtime,
      calcMethod:
        otNight > 0 && useAddition
          ? `${otDay}h×1.5 + ${otNight}h×2.0 (야간중복)`
          : `${payslip.workInfo.overtimeHours}h × ${previewHourlyStr} × ${useAddition ? "1.5" : "1.0"}`,
    });
  }
  if (payslip.earnings.nightWork && payslip.earnings.nightWork > 0) {
    earningItems.push({
      label: "야간근로수당",
      amount: payslip.earnings.nightWork,
      calcMethod: useAddition
        ? `${payslip.workInfo.nightHours}h × ${previewHourlyStr} × 0.5`
        : `${payslip.workInfo.nightHours}h × ${previewHourlyStr} × 1.0`,
    });
  }
  if (payslip.earnings.holidayWork && payslip.earnings.holidayWork > 0) {
    const hh = payslip.workInfo.holidayHours;
    const hn = payslip.workInfo.holidayNightHours;
    let holMethod: string;
    if (hn > 0 && useAddition) {
      holMethod = `휴일 ${hh}h (야간 ${hn}h 중복, 최대 2.5배)`;
    } else if (hh <= 8) {
      holMethod = `${hh}h × ${previewHourlyStr} × ${useAddition ? "1.5" : "1.0"}`;
    } else if (useAddition) {
      holMethod = `8h×1.5 + ${hh - 8}h×2.0`;
    } else {
      holMethod = `${hh}h × ${previewHourlyStr} × 1.0`;
    }
    earningItems.push({
      label: "휴일근로수당",
      amount: payslip.earnings.holidayWork,
      calcMethod: holMethod,
    });
  }
  if (payslip.earnings.bonus > 0) {
    earningItems.push({ label: "상여금", amount: payslip.earnings.bonus });
  }
  if (payslip.earnings.mealAllowance > 0) {
    earningItems.push({
      label: "식대",
      amount: payslip.earnings.mealAllowance,
      taxFree: true,
    });
  }
  if (payslip.earnings.transportAllowance > 0) {
    earningItems.push({
      label: "자가운전보조금",
      amount: payslip.earnings.transportAllowance,
      taxFree: true,
    });
  }

  // 추가 항목
  payslip.enabledAdditionalEarnings.forEach((key) => {
    const item = ADDITIONAL_EARNINGS.find((e) => e.key === key);
    const amount = payslip.earnings[key] || 0;
    if (item && amount > 0) {
      earningItems.push({ label: item.label, amount, taxFree: !item.taxable });
    }
  });

  if (payslip.earnings.otherAllowance > 0) {
    earningItems.push({
      label: "기타수당",
      amount: payslip.earnings.otherAllowance,
    });
  }

  return (
    <div style={{ fontFamily: "'Nanum Gothic', sans-serif", padding: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h1
          style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}
        >
          급 여 명 세 서
        </h1>
        <p style={{ color: "#666" }}>
          {payslip.year}년 {payslip.month}월분
        </p>
      </div>

      {/* 회사/직원 정보 (법적 필수) */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <tbody>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
                width: "15%",
              }}
            >
              회사명
            </th>
            <td
              style={{ border: "1px solid #333", padding: "8px", width: "35%" }}
            >
              {payslip.company.name}
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
                width: "15%",
              }}
            >
              성명
            </th>
            <td
              style={{ border: "1px solid #333", padding: "8px", width: "35%" }}
            >
              {payslip.employee.name}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              사업자번호
            </th>
            <td style={{ border: "1px solid #333", padding: "8px" }}>
              {formatBusinessNumber(payslip.company.businessNumber)}
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              생년월일
            </th>
            <td style={{ border: "1px solid #333", padding: "8px" }}>
              {payslip.birthDate || "-"}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              사원번호
            </th>
            <td style={{ border: "1px solid #333", padding: "8px" }}>
              {payslip.employeeId || "-"}
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              부서/직책
            </th>
            <td style={{ border: "1px solid #333", padding: "8px" }}>
              {payslip.employee.address || "-"}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              지급일
            </th>
            <td style={{ border: "1px solid #333", padding: "8px" }}>
              {payslip.paymentDate}
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              임금 총액
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "8px",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(totalEarnings)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 📋 근로시간 정보 (법적 필수) */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <thead>
          <tr>
            <th
              colSpan={8}
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#1e3a5f",
                color: "white",
                fontSize: "13px",
              }}
            >
              근로시간 정보 (근로기준법 시행령 제27조의2)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              출근일수
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.workDays}일
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              소정근로시간
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.prescribedWorkHours}시간
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              총 근로시간
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.totalWorkHours}시간
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              임금계산
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.salaryType === "monthly"
                ? "월급제"
                : `시급제 (${formatCurrency(payslip.workInfo.hourlyWage || 0)})`}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              연장근로
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.overtimeHours || 0}시간
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              야간근로
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.nightHours || 0}시간
            </td>
            <th
              style={{
                border: "1px solid #333",
                padding: "6px",
                backgroundColor: "#f3f4f6",
                fontSize: "12px",
              }}
            >
              휴일근로
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "6px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              {payslip.workInfo.holidayHours || 0}시간
            </td>
            <td
              colSpan={2}
              style={{ border: "1px solid #333", padding: "6px" }}
            ></td>
          </tr>
        </tbody>
      </table>

      {/* 지급/공제 내역 */}
      <div style={{ display: "flex", gap: "20px" }}>
        {/* 지급 */}
        <div style={{ flex: 1.2 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  colSpan={3}
                  style={{
                    border: "1px solid #333",
                    padding: "10px",
                    backgroundColor: "#18181b",
                    color: "white",
                  }}
                >
                  지 급 내 역
                </th>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "6px",
                    backgroundColor: "#f3f4f6",
                    width: "30%",
                    fontSize: "12px",
                  }}
                >
                  항목
                </th>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "6px",
                    backgroundColor: "#f3f4f6",
                    width: "40%",
                    fontSize: "12px",
                  }}
                >
                  계산방법
                </th>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "6px",
                    backgroundColor: "#f3f4f6",
                    width: "30%",
                    fontSize: "12px",
                  }}
                >
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {earningItems.map((item, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      border: "1px solid #333",
                      padding: "6px",
                      fontSize: "12px",
                    }}
                  >
                    {item.label}
                    {item.taxFree && (
                      <span
                        style={{
                          color: "#059669",
                          fontSize: "10px",
                          marginLeft: "2px",
                        }}
                      >
                        (비)
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      border: "1px solid #333",
                      padding: "6px",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    {item.calcMethod || "-"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #333",
                      padding: "6px",
                      textAlign: "right",
                      fontSize: "12px",
                    }}
                  >
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
              <tr>
                <th
                  colSpan={2}
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#e5e5e5",
                    fontSize: "12px",
                  }}
                >
                  지급 합계
                </th>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#e5e5e5",
                    textAlign: "right",
                    fontSize: "13px",
                  }}
                >
                  {formatCurrency(totalEarnings)}
                </th>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 공제 */}
        <div style={{ flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  colSpan={2}
                  style={{
                    border: "1px solid #333",
                    padding: "10px",
                    backgroundColor: "#dc2626",
                    color: "white",
                  }}
                >
                  공 제 내 역
                </th>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#f3f4f6",
                    width: "50%",
                  }}
                >
                  항목
                </th>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#f3f4f6",
                    width: "50%",
                  }}
                >
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  국민연금
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.nationalPension)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  건강보험
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.healthInsurance)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  장기요양
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.longTermCare)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  고용보험
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.employmentInsurance)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  소득세
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.incomeTax)}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #333", padding: "8px" }}>
                  지방소득세
                </td>
                <td
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(payslip.deductions.localTax)}
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#fecaca",
                  }}
                >
                  공제 합계
                </th>
                <th
                  style={{
                    border: "1px solid #333",
                    padding: "8px",
                    backgroundColor: "#fecaca",
                    textAlign: "right",
                  }}
                >
                  {formatCurrency(totalDeductions)}
                </th>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 실수령액 */}
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}
      >
        <tbody>
          <tr>
            <th
              style={{
                border: "2px solid #333",
                padding: "16px",
                backgroundColor: "#18181b",
                color: "white",
                fontSize: "18px",
                width: "50%",
              }}
            >
              실 수 령 액
            </th>
            <td
              style={{
                border: "2px solid #333",
                padding: "16px",
                textAlign: "right",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(netPay)}
            </td>
          </tr>
        </tbody>
      </table>

      <p
        style={{
          textAlign: "center",
          marginTop: "24px",
          color: "#666",
          fontSize: "12px",
        }}
      >
        지급일: {payslip.paymentDate} | {payslip.company.name}
      </p>

      <p
        style={{
          textAlign: "center",
          marginTop: "12px",
          color: "#999",
          fontSize: "11px",
          borderTop: "1px solid #ddd",
          paddingTop: "12px",
        }}
      >
        ※ 본 임금명세서는 근로기준법 제48조 제2항에 따라 교부합니다.
      </p>
    </div>
  );
}
