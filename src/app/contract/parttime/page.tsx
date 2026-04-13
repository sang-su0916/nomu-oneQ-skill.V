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
import { useDocumentSave } from "@/hooks/useDocumentSave";
import MobileFormWizard from "@/components/MobileFormWizard";
import { useAutoSave } from "@/hooks/useAutoSave";
import Breadcrumb from "@/components/Breadcrumb";
import AutoSaveStatus from "@/components/AutoSaveStatus";

interface WorkSchedule {
  day: string;
  startTime: string;
  endTime: string;
  breakTime: number;
  hours: number;
}

interface ParttimeContractData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  contractDate: string;
  startDate: string;
  endDate: string;
  isOpenEnded: boolean;
  workplace: string;
  jobDescription: string;
  scheduleType: "fixed" | "flexible";
  fixedSchedule: {
    workStartTime: string;
    workEndTime: string;
    breakTime: number;
    workDays: string[];
  };
  flexibleSchedule: WorkSchedule[];
  weeklyHours: number;
  weeklyHoliday: string;
  weeklyHolidayDays: string[];
  hourlyWage: number;
  mealAllowance: number;
  vehicleAllowance: number;
  childcareAllowance: number;
  researchAllowance: number;
  weeklyAllowance: boolean;
  paymentMethod: string;
  paymentDate: number;
  probationPeriod: number;
  insurance: {
    national: boolean;
    health: boolean;
    employment: boolean;
    industrial: boolean;
  };
  specialTerms: string;
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

const defaultContract: ParttimeContractData = {
  company: defaultCompanyInfo,
  employee: defaultEmployee,
  contractDate: new Date().toISOString().split("T")[0],
  startDate: "",
  endDate: "",
  isOpenEnded: false,
  workplace: "",
  jobDescription: "",
  scheduleType: "fixed",
  fixedSchedule: {
    workStartTime: "09:00",
    workEndTime: "14:00",
    breakTime: 30,
    workDays: ["월", "수", "금"],
  },
  flexibleSchedule: defaultFlexibleSchedule,
  weeklyHours: 15,
  weeklyHoliday: "매주 일요일",
  weeklyHolidayDays: [],
  hourlyWage: 10320, // 2026년 최저임금
  mealAllowance: 0,
  vehicleAllowance: 0,
  childcareAllowance: 0,
  researchAllowance: 0,
  weeklyAllowance: true,
  paymentMethod: "근로자 명의 예금통장에 입금",
  paymentDate: 10,
  probationPeriod: 0,
  insurance: {
    national: false,
    health: false,
    employment: true,
    industrial: true,
  },
  specialTerms: "",
};

export default function ParttimeContractPage() {
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter(
    (e) => e.status === "active" && e.employmentType === "parttime",
  );

  const [contract, setContract] =
    useState<ParttimeContractData>(defaultContract);
  const [showPreview, setShowPreview] = useState(false);

  // ② 자동저장 연동
  const {
    restore,
    clear: clearAutoSave,
    hasSaved,
    lastSavedAt,
  } = useAutoSave("contract_parttime", contract, !showPreview);
  const [autoSaveRestored, setAutoSaveRestored] = useState(false);

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
        setContract((prev) => ({
          ...saved,
          company: prev.company,
          workplace: prev.company.address,
        }));
        setAutoSaveRestored(true);
      }
    }
  }, [companyLoading, autoSaveRestored, restore]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "contract_parttime",
      title: `단시간 근로계약서 - ${contract.employee.name || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: contract as unknown as Record<string, unknown>,
    });
  };

  // 직원 선택 시 정보 자동 입력
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) return;

    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setContract((prev) => ({
      ...prev,
      employee: emp.info,
      startDate: emp.hireDate,
      fixedSchedule: {
        ...prev.fixedSchedule,
        workStartTime: emp.workCondition.workStartTime,
        workEndTime: emp.workCondition.workEndTime,
        breakTime: emp.workCondition.breakTime,
        workDays: emp.workCondition.workDays,
      },
      weeklyHours: emp.workCondition.weeklyHours,
      hourlyWage: emp.salary.hourlyWage || 10320,
      mealAllowance: emp.salary.mealAllowance || 0,
      vehicleAllowance: emp.salary.carAllowance || 0,
      childcareAllowance: emp.salary.childcareAllowance || 0,
      researchAllowance: emp.salary.researchAllowance || 0,
      insurance: emp.insurance,
    }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `단시간근로자_근로계약서_${contract.employee.name || "이름없음"}`,
  });

  // 주간 근로시간 자동 계산
  const calcWeeklyHours = (c: ParttimeContractData): number => {
    if (c.scheduleType === "fixed") {
      const start = c.fixedSchedule.workStartTime.split(":").map(Number);
      const end = c.fixedSchedule.workEndTime.split(":").map(Number);
      const dailyMinutes =
        end[0] * 60 +
        end[1] -
        (start[0] * 60 + start[1]) -
        c.fixedSchedule.breakTime;
      return (
        Math.round(
          ((dailyMinutes * c.fixedSchedule.workDays.length) / 60) * 10,
        ) / 10
      );
    } else {
      return c.flexibleSchedule.reduce((sum, s) => sum + (s.hours || 0), 0);
    }
  };

  // 주 15시간 기준 국민연금/건강보험 자동 토글
  const autoAdjustInsurance = (
    c: ParttimeContractData,
  ): ParttimeContractData => {
    const hours = c.weeklyHours;
    return {
      ...c,
      insurance: {
        ...c.insurance,
        national: hours >= 15,
        health: hours >= 15,
      },
    };
  };

  const updateContract = (field: string, value: unknown) => {
    setContract((prev) => {
      const next = { ...prev, [field]: value };
      if (
        ["scheduleType", "fixedSchedule", "flexibleSchedule"].includes(field)
      ) {
        next.weeklyHours = calcWeeklyHours(next);
        return autoAdjustInsurance(next);
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

  const updateFixedSchedule = (field: string, value: unknown) => {
    setContract((prev) => {
      const next = {
        ...prev,
        fixedSchedule: { ...prev.fixedSchedule, [field]: value },
      };
      next.weeklyHours = calcWeeklyHours(next);
      return autoAdjustInsurance(next);
    });
  };

  const toggleWorkDay = (day: string) => {
    setContract((prev) => {
      const next = {
        ...prev,
        fixedSchedule: {
          ...prev.fixedSchedule,
          workDays: prev.fixedSchedule.workDays.includes(day)
            ? prev.fixedSchedule.workDays.filter((d) => d !== day)
            : [...prev.fixedSchedule.workDays, day],
        },
      };
      next.weeklyHours = calcWeeklyHours(next);
      return autoAdjustInsurance(next);
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

      // 시간 자동 계산
      if (newSchedule[index].startTime && newSchedule[index].endTime) {
        const start = newSchedule[index].startTime.split(":").map(Number);
        const end = newSchedule[index].endTime.split(":").map(Number);
        const minutes =
          end[0] * 60 +
          end[1] -
          (start[0] * 60 + start[1]) -
          (newSchedule[index].breakTime || 0);
        newSchedule[index].hours = Math.round((minutes / 60) * 10) / 10;
      }

      const next = { ...prev, flexibleSchedule: newSchedule };
      next.weeklyHours = calcWeeklyHours(next);
      return autoAdjustInsurance(next);
    });
  };

  const toggleWeeklyHolidayDay = (day: string) => {
    setContract((prev) => ({
      ...prev,
      weeklyHolidayDays: prev.weeklyHolidayDays.includes(day)
        ? prev.weeklyHolidayDays.filter((d) => d !== day)
        : [...prev.weeklyHolidayDays, day],
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
          { label: "단시간 근로계약서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-purple-800">
            📄 단시간 근로자 계약서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            알바, 파트타임용 (주 40시간 미만)
          </p>
          <AutoSaveStatus lastSavedAt={lastSavedAt} />
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
              disabled={saving}
              className="btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="btn-primary bg-purple-600 hover:bg-purple-700"
            disabled={
              !contract.employee.name ||
              (contract.hourlyWage > 0 &&
                contract.hourlyWage < MINIMUM_WAGE.hourly)
            }
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
            }}
            className="text-xs text-amber-600 underline hover:text-amber-800"
          >
            새로 작성
          </button>
        </div>
      )}

      <HelpGuide
        pageKey="contract-parttime-v2"
        steps={[
          '직원 선택: "등록된 직원에서 선택"을 누르면 정보가 자동 입력됩니다. 등록된 직원이 없으면 직접 입력하세요.',
          '근로시간: "고정 스케줄"은 매일 같은 시간, "요일별 상이"는 요일마다 다른 시간을 설정합니다. 주 소정근로시간이 자동 계산되며, 15시간 이상이면 주휴수당이 발생합니다.',
          '주휴일: "직접 선택"을 고르면 원하는 요일을 자유롭게 지정할 수 있습니다.',
          "시급: 2026년 최저임금(10,320원) 미만이면 경고가 표시되고 인쇄가 차단됩니다. 반드시 최저임금 이상으로 입력하세요.",
          '출력: "미리보기"로 확인 후 "인쇄/PDF"로 출력하세요. 단시간 근로자는 근로일별 근로시간을 반드시 서면 명시해야 합니다 (근로기준법 제17조).',
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
                "등록된 파트타임 직원을 선택하면 모든 정보가 자동 입력됩니다.",
              summary: [
                { label: "회사", value: contract.company.name },
                { label: "근로자", value: contract.employee.name },
              ],
              content: (
                <div className="space-y-6">
                  {/* 회사 정보 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      🏢 사용자(회사) 정보
                    </h2>
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
                    </div>
                  </div>

                  {/* 근로자 정보 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      👤 근로자 정보
                    </h2>

                    {/* 직원 선택 (연동) */}
                    {employees.length > 0 && (
                      <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <label className="input-label text-purple-700">
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
                              {emp.info.name} (주{" "}
                              {emp.workCondition.weeklyHours}시간)
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-purple-600 mt-1">
                          💡 직원을 선택하면 모든 정보가 자동으로 입력됩니다.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">성명 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="홍길동"
                          value={contract.employee.name}
                          onChange={(e) =>
                            updateEmployee("name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">주민등록번호 *</label>
                        <input
                          type="text"
                          className="input-field"
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
              title: "계약 정보",
              icon: "📅",
              validate: () => !!contract.startDate,
              validationMessage: "근무 시작일을 입력해주세요.",
              helpText:
                "단시간 근로자는 계약 종료일을 명시하는 것이 일반적입니다. 기간 미정인 경우 체크하세요.",
              summary: [
                { label: "시작일", value: contract.startDate },
                {
                  label: "종료일",
                  value: contract.isOpenEnded ? "기간 미정" : contract.endDate,
                },
              ],
              content: (
                <div className="space-y-6">
                  {/* 계약 정보 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      📅 계약 정보
                    </h2>
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
                        <label className="flex items-center gap-2 mt-6">
                          <input
                            type="checkbox"
                            checked={contract.isOpenEnded}
                            onChange={(e) =>
                              updateContract("isOpenEnded", e.target.checked)
                            }
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <span className="text-[var(--text)]">
                            기간의 정함이 없음
                          </span>
                        </label>
                      </div>
                      {!contract.isOpenEnded && (
                        <div>
                          <label className="input-label">근무 종료일</label>
                          <input
                            type="date"
                            className="input-field"
                            value={contract.endDate}
                            onChange={(e) =>
                              updateContract("endDate", e.target.value)
                            }
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="input-label">근무 장소 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="본사 사무실, OO점 매장"
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
                          placeholder="예: 매장 판매 및 고객 응대, 서빙 업무 등"
                          value={contract.jobDescription}
                          onChange={(e) =>
                            updateContract("jobDescription", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">수습기간</label>
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
                  return contract.fixedSchedule.workDays.length > 0;
                }
                return contract.flexibleSchedule.some((s) => s.hours > 0);
              },
              validationMessage: "근무 요일과 시간을 입력해주세요.",
              helpText:
                "주 소정근로시간이 15시간 이상이면 국민연금·건강보험이 자동 적용되고 주휴수당이 발생합니다. 단시간 근로자는 근로일별 근로시간을 서면에 반드시 명시해야 합니다 (근로기준법 제17조).",
              summary: [
                { label: "주간근로", value: `${contract.weeklyHours}시간` },
              ],
              content: (
                <div className="space-y-6">
                  {/* 근로시간 - 고용노동부 필수 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      ⏰ 근로일 및 근로시간 (필수)
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      단시간 근로자는 근로일별 근로시간을 서면으로 명시해야
                      합니다. (근로기준법 제17조)
                    </p>

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
                            className="w-4 h-4 text-purple-600"
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
                            className="w-4 h-4 text-purple-600"
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
                              value={contract.fixedSchedule.workStartTime}
                              onChange={(e) =>
                                updateFixedSchedule(
                                  "workStartTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="input-label">종료 시간</label>
                            <input
                              type="time"
                              className="input-field"
                              value={contract.fixedSchedule.workEndTime}
                              onChange={(e) =>
                                updateFixedSchedule(
                                  "workEndTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="input-label">휴게시간 (분)</label>
                            <input
                              type="number"
                              className="input-field"
                              value={contract.fixedSchedule.breakTime}
                              onChange={(e) =>
                                updateFixedSchedule(
                                  "breakTime",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="input-label">근무 요일</label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {WEEKDAYS.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleWorkDay(day)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  contract.fixedSchedule.workDays.includes(day)
                                    ? "bg-purple-500 text-white"
                                    : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-purple-50">
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
                                  <td className="border p-2 text-center font-medium text-purple-600">
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

                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                      <p className="text-purple-800 font-medium">
                        📊 주 소정근로시간:{" "}
                        <strong>{contract.weeklyHours}시간</strong>
                        {contract.weeklyHours >= 15 && (
                          <span className="text-green-600 ml-2">
                            ✓ 주휴수당 발생
                          </span>
                        )}
                        {contract.weeklyHours < 15 &&
                          contract.weeklyHours > 0 && (
                            <span className="text-amber-600 ml-2">
                              ⚠ 초단시간근로자
                            </span>
                          )}
                      </p>
                      {contract.weeklyHours > 0 &&
                        contract.weeklyHours < 15 && (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                            <strong>
                              ⚠️ 초단시간근로자 (주 15시간 미만) 특례
                            </strong>
                            <ul className="mt-1 space-y-0.5 list-disc list-inside">
                              <li>
                                주휴일·주휴수당 <strong>미적용</strong>
                              </li>
                              <li>
                                연차유급휴가 <strong>미적용</strong>
                              </li>
                              <li>
                                퇴직급여 <strong>미적용</strong> (근속 4주 평균
                                15시간 미만)
                              </li>
                              <li>
                                국민연금·건강보험 <strong>가입 제외</strong>{" "}
                                (고용보험·산재보험만 적용)
                              </li>
                            </ul>
                          </div>
                        )}
                    </div>

                    <div className="mt-4">
                      <label className="input-label">주휴일 *</label>
                      <select
                        className="input-field"
                        value={contract.weeklyHoliday}
                        onChange={(e) => {
                          updateContract("weeklyHoliday", e.target.value);
                          if (e.target.value !== "직접 선택") {
                            updateContract("weeklyHolidayDays", []);
                          }
                        }}
                      >
                        <option value="매주 일요일">매주 일요일</option>
                        <option value="매주 토요일">매주 토요일</option>
                        <option value="주 1회 (별도 지정)">
                          주 1회 (별도 지정)
                        </option>
                        <option value="직접 선택">직접 선택</option>
                      </select>
                      {contract.weeklyHoliday === "직접 선택" && (
                        <>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {WEEKDAYS.map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleWeeklyHolidayDay(day)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  contract.weeklyHolidayDays.includes(day)
                                    ? "bg-green-500 text-white"
                                    : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                          {contract.weeklyHolidayDays.length === 0 && (
                            <p className="text-red-500 text-xs mt-1 font-medium">
                              주휴일을 1일 이상 선택해주세요.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "급여·보험",
              icon: "💰",
              validate: () => contract.hourlyWage >= MINIMUM_WAGE.hourly,
              validationMessage: `시급이 2026년 최저임금(${MINIMUM_WAGE.hourly.toLocaleString()}원)에 미달합니다.`,
              helpText:
                "시급은 최저임금 이상이어야 합니다. 비과세 수당(식대, 차량유지비 등)은 각각 월 20만원까지 비과세 혜택이 적용됩니다.",
              summary: [
                {
                  label: "시급",
                  value: `${contract.hourlyWage.toLocaleString()}원`,
                },
              ],
              content: (
                <div className="space-y-6">
                  {/* 급여 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      💰 임금
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">시급 (원) *</label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="10320"
                          value={contract.hourlyWage || ""}
                          onChange={(e) =>
                            updateContract(
                              "hourlyWage",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <p className="text-xs text-purple-600 mt-1 font-medium">
                          {MINIMUM_WAGE.year}년 최저시급:{" "}
                          {MINIMUM_WAGE.hourly.toLocaleString()}원
                          {contract.hourlyWage < MINIMUM_WAGE.hourly &&
                            contract.hourlyWage > 0 && (
                              <span className="text-red-500 ml-2">
                                ⚠️ 최저임금 미달! 인쇄가 차단됩니다.
                              </span>
                            )}
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
                            예금통장 입금
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
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer mt-6">
                          <input
                            type="checkbox"
                            checked={contract.weeklyAllowance}
                            onChange={(e) =>
                              updateContract(
                                "weeklyAllowance",
                                e.target.checked,
                              )
                            }
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <span className="text-[var(--text)]">
                            주휴수당 지급
                          </span>
                        </label>
                        <span className="text-xs text-[var(--text-light)] ml-2">
                          (주 15시간 이상 시 필수)
                        </span>
                      </div>
                    </div>

                    {/* 비과세 수당 */}
                    <div className="mt-6 pt-4 border-t border-purple-100">
                      <h3 className="text-sm font-bold text-purple-700 mb-3">
                        비과세 수당 (월 정액)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="input-label">
                            식대 (비과세, 월)
                          </label>
                          <input
                            type="number"
                            className="input-field"
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
                            자가운전보조금 (비과세, 월)
                          </label>
                          <input
                            type="number"
                            className="input-field"
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
                              {formatCurrency(
                                contract.vehicleAllowance - 200000,
                              )}
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
                              연구활동종사자 월 20만원 비과세
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 예상 급여 계산 */}
                    <div className="mt-4 p-4 bg-[var(--bg)] rounded-lg">
                      <p className="text-[var(--text)] font-medium mb-2">
                        💵 예상 월급 (4주 기준)
                      </p>
                      <div className="text-sm text-[var(--text-muted)]">
                        <p>
                          • 기본급:{" "}
                          {formatCurrency(
                            contract.hourlyWage * contract.weeklyHours * 4,
                          )}
                        </p>
                        {contract.weeklyAllowance &&
                          contract.weeklyHours >= 15 && (
                            <p>
                              • 주휴수당:{" "}
                              {formatCurrency(
                                contract.hourlyWage *
                                  (contract.weeklyHours / 5) *
                                  4,
                              )}{" "}
                              (주 {(contract.weeklyHours / 5).toFixed(1)}시간 ×
                              4주)
                            </p>
                          )}
                        {(contract.mealAllowance > 0 ||
                          contract.vehicleAllowance > 0 ||
                          contract.childcareAllowance > 0 ||
                          contract.researchAllowance > 0) && (
                          <p>
                            • 비과세 수당:{" "}
                            {formatCurrency(
                              contract.mealAllowance +
                                contract.vehicleAllowance +
                                contract.childcareAllowance +
                                contract.researchAllowance,
                            )}
                          </p>
                        )}
                        <p className="font-bold text-purple-700 mt-2">
                          합계:{" "}
                          {formatCurrency(
                            contract.hourlyWage * contract.weeklyHours * 4 +
                              (contract.weeklyAllowance &&
                              contract.weeklyHours >= 15
                                ? contract.hourlyWage *
                                  (contract.weeklyHours / 5) *
                                  4
                                : 0) +
                              contract.mealAllowance +
                              contract.vehicleAllowance +
                              contract.childcareAllowance +
                              contract.researchAllowance,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4대보험 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      🏥 사회보험
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      ※ 월 60시간(주 15시간) 이상 근무 시 국민연금·건강보험
                      의무가입
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { key: "national", label: "국민연금" },
                        { key: "health", label: "건강보험" },
                        { key: "employment", label: "고용보험" },
                        { key: "industrial", label: "산재보험" },
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
                            className="w-5 h-5 text-purple-600 rounded"
                          />
                          <span className="text-[var(--text)]">
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 특약사항 */}
                  <div className="form-section border-purple-200">
                    <h2 className="form-section-title text-purple-800">
                      📋 특약사항
                    </h2>
                    <textarea
                      className="input-field min-h-[80px]"
                      placeholder="예: 근무일 변경 시 3일 전 통보, 업무복 지급 등"
                      value={contract.specialTerms}
                      onChange={(e) =>
                        updateContract("specialTerms", e.target.value)
                      }
                    />
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
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8">
          <ParttimeContractPreview contract={contract} />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
        }}
      >
        <div ref={printRef}>
          <ParttimeContractPreview contract={contract} />
        </div>
      </div>
    </div>
  );
}

function ParttimeContractPreview({
  contract,
}: {
  contract: ParttimeContractData;
}) {
  const insuranceList = [];
  if (contract.insurance.national) insuranceList.push("국민연금");
  if (contract.insurance.health) insuranceList.push("건강보험");
  if (contract.insurance.employment) insuranceList.push("고용보험");
  if (contract.insurance.industrial) insuranceList.push("산재보험");

  // 연차휴가 비례 계산 (주 15시간 이상일 경우)
  const annualLeaveRatio =
    contract.weeklyHours >= 15 ? (contract.weeklyHours / 40) * 15 : 0;

  // 주휴일 표시 텍스트
  const weeklyHolidayDisplay =
    contract.weeklyHoliday === "직접 선택"
      ? contract.weeklyHolidayDays.length > 0
        ? `매주 ${contract.weeklyHolidayDays.map((d) => `${d}요일`).join(", ")}`
        : "별도 지정"
      : contract.weeklyHoliday;

  const cellStyle = {
    border: "1px solid #d1d5db",
    padding: "10px 14px",
    verticalAlign: "top" as const,
  };
  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#faf5ff",
    fontWeight: 600,
    width: "140px",
    color: "#6b21a8",
  };
  const sectionHeaderStyle = {
    backgroundColor: "#7c3aed",
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
          borderBottom: "3px solid #7c3aed",
          paddingBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "#7c3aed",
            marginBottom: "8px",
            letterSpacing: "1px",
          }}
        >
          단시간 근로자 근로계약서
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Part-time Employment Contract (근로기준법 제17조, 제18조)
        </p>
      </div>

      {/* 서문 */}
      <div
        style={{
          backgroundColor: "#faf5ff",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #e9d5ff",
        }}
      >
        <p style={{ fontSize: "14px", lineHeight: 1.8 }}>
          <strong style={{ color: "#7c3aed" }}>{contract.company.name}</strong>{" "}
          (이하 {'"'}사용자{'"'}라 함)과
          <strong style={{ color: "#7c3aed" }}>
            {" "}
            {contract.employee.name}
          </strong>{" "}
          (이하 {'"'}근로자{'"'}라 함)은 다음과 같이 단시간 근로계약을 체결한다.
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
              제1조 [계약기간 및 업무]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>계약기간</th>
            <td style={cellStyle}>
              <strong>{formatDate(contract.startDate)}</strong> ~{" "}
              {contract.isOpenEnded ? (
                <strong>정함이 없음</strong>
              ) : (
                <strong>{formatDate(contract.endDate)}</strong>
              )}
              {contract.probationPeriod > 0 && (
                <>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 수습기간: {contract.probationPeriod}개월
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
            <th style={headerStyle}>담당업무</th>
            <td style={cellStyle}>{contract.jobDescription}</td>
          </tr>
        </tbody>
      </table>

      {/* 제2조 근로일 및 근로시간 - 핵심! */}
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
              제2조 [근로일 및 근로시간] ★ 필수 명시사항
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} style={cellStyle}>
              {contract.scheduleType === "fixed" ? (
                <>
                  <p style={{ marginBottom: "12px" }}>
                    <strong>• 근무시간:</strong>{" "}
                    {contract.fixedSchedule.workStartTime} ~{" "}
                    {contract.fixedSchedule.workEndTime}
                  </p>
                  <p style={{ marginBottom: "12px" }}>
                    <strong>• 휴게시간:</strong>{" "}
                    {contract.fixedSchedule.breakTime}분
                  </p>
                  <p style={{ marginBottom: "12px" }}>
                    <strong>• 근무요일:</strong>{" "}
                    {contract.fixedSchedule.workDays.join(", ")} (주{" "}
                    {contract.fixedSchedule.workDays.length}일)
                  </p>
                </>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "12px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f5f3ff" }}>
                      <th
                        style={{ border: "1px solid #d1d5db", padding: "8px" }}
                      >
                        요일
                      </th>
                      <th
                        style={{ border: "1px solid #d1d5db", padding: "8px" }}
                      >
                        근무시간
                      </th>
                      <th
                        style={{ border: "1px solid #d1d5db", padding: "8px" }}
                      >
                        휴게
                      </th>
                      <th
                        style={{ border: "1px solid #d1d5db", padding: "8px" }}
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
                              padding: "8px",
                              textAlign: "center",
                            }}
                          >
                            {schedule.day}요일
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                            }}
                          >
                            {schedule.startTime} ~ {schedule.endTime}
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                            }}
                          >
                            {schedule.breakTime}분
                          </td>
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: "8px",
                              textAlign: "center",
                              fontWeight: 600,
                            }}
                          >
                            {schedule.hours}시간
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              <p
                style={{
                  backgroundColor: "#faf5ff",
                  padding: "10px",
                  borderRadius: "4px",
                  fontWeight: 600,
                  color: "#7c3aed",
                }}
              >
                📊 주 소정근로시간: {contract.weeklyHours}시간
              </p>
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
              제3조 [휴일 및 휴가] (근로기준법 제55조, 제18조)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>주휴일</th>
            <td style={cellStyle}>
              <strong>{weeklyHolidayDisplay}</strong>{" "}
              {contract.weeklyHours >= 15 ? "(유급)" : "(무급)"}
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 주 15시간 이상 근무 시 유급 주휴일 부여
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>연차유급휴가</th>
            <td style={cellStyle}>
              {contract.weeklyHours >= 15 ? (
                <>
                  통상 근로자의 근로시간에 비례하여{" "}
                  <strong>연 약 {annualLeaveRatio.toFixed(1)}일</strong>
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 산정: {contract.weeklyHours}시간 ÷ 40시간 × 15일
                    (근로기준법 제18조)
                  </span>
                </>
              ) : (
                "주 15시간 미만 근무로 미적용"
              )}
            </td>
          </tr>
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
              제4조 [임금] (근로기준법 제17조)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>시급</th>
            <td style={cellStyle}>
              <strong style={{ fontSize: "16px", color: "#7c3aed" }}>
                {formatCurrency(contract.hourlyWage)}
              </strong>
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 2026년 최저임금 10,320원 이상
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>주휴수당</th>
            <td style={cellStyle}>
              {contract.weeklyAllowance && contract.weeklyHours >= 15 ? (
                <>
                  <strong>지급</strong> (주 15시간 이상 근무)
                  <br />
                  <span style={{ color: "#6b7280", fontSize: "13px" }}>
                    ※ 주휴수당 = 시급 × (주 소정근로시간 ÷ 5)
                  </span>
                </>
              ) : (
                "미지급"
              )}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>지급일</th>
            <td style={cellStyle}>
              매월 <strong>{contract.paymentDate}일</strong>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>지급방법</th>
            <td style={cellStyle}>{contract.paymentMethod}</td>
          </tr>
          <tr>
            <th style={headerStyle}>초과근로</th>
            <td style={cellStyle}>
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                소정근로시간을 초과하여 근로 시 통상임금의 50% 가산 지급
                (근로기준법 제56조)
              </span>
            </td>
          </tr>
          {(contract.mealAllowance > 0 ||
            contract.vehicleAllowance > 0 ||
            contract.childcareAllowance > 0 ||
            contract.researchAllowance > 0) && (
            <tr>
              <th style={headerStyle}>비과세 수당</th>
              <td style={cellStyle}>
                <table style={{ width: "100%" }}>
                  <tbody>
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
                        <td style={{ padding: "4px 0" }}>
                          연구보조비 (비과세)
                        </td>
                        <td style={{ padding: "4px 0", textAlign: "right" }}>
                          {formatCurrency(contract.researchAllowance)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>
                  ※ 각 항목 월 20만원 한도 비과세 (소득세법 시행령)
                </span>
              </td>
            </tr>
          )}
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
              {insuranceList.length > 0
                ? insuranceList.join(", ") + " 가입"
                : "해당 없음"}
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 월 60시간(주 15시간) 이상 근무 시 국민연금·건강보험 의무가입
              </span>
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
                제6조 [특약사항]
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

      {/* 계약서 교부 및 기타 */}
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
          <strong style={{ color: "#92400e" }}>📋 근로계약서 교부 의무</strong>
          <br />
          사용자는 근로계약 체결 시 본 계약서를 근로자에게 즉시 교부하여야 한다.
          (근로기준법 제17조) 단시간 근로자의 근로조건은 통상 근로자의
          근로시간을 기준으로 비례하여 결정한다. (제18조)
        </p>
      </div>

      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "32px" }}>
        <p style={{ marginBottom: "8px" }}>
          • 본 계약에 명시되지 않은 사항은 근로기준법 및 관계 법령에 따른다.
        </p>
        <p>• 본 계약서는 2부를 작성하여 사용자와 근로자가 각 1부씩 보관한다.</p>
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
              color: "#7c3aed",
              marginBottom: "16px",
              fontSize: "15px",
              borderBottom: "2px solid #7c3aed",
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
                <td style={{ padding: "10px 0", color: "#6b7280" }}>대표자</td>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>
                  {contract.company.ceoName}
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
              color: "#7c3aed",
              marginBottom: "16px",
              fontSize: "15px",
              borderBottom: "2px solid #7c3aed",
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
