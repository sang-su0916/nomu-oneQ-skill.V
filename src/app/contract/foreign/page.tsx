"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import {
  formatDate,
  formatCurrency,
  formatBusinessNumber,
  autoFormatPhone,
  autoFormatForeignRegNumber,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { MINIMUM_WAGE } from "@/lib/constants";
import HelpGuide from "@/components/HelpGuide";
import EmailSendButton from "@/components/EmailSendButton";
import SignaturePad from "@/components/SignaturePad";
import UpgradeModal from "@/components/UpgradeModal";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { usePlanGate } from "@/hooks/usePlanGate";
import MobileFormWizard from "@/components/MobileFormWizard";
import { useAutoSave } from "@/hooks/useAutoSave";
import Breadcrumb from "@/components/Breadcrumb";
import AutoSaveStatus from "@/components/AutoSaveStatus";
import {
  LANGUAGES,
  CONTRACT_TRANSLATIONS,
  type LanguageCode,
} from "@/lib/data/foreign-contract-i18n";

// 체류자격(비자) 유형
const VISA_TYPES = [
  {
    code: "E-9",
    label: "E-9 (비전문취업)",
    desc: "제조, 건설, 농축산, 어업 등",
  },
  { code: "H-2", label: "H-2 (방문취업)", desc: "재외동포 자유취업" },
  { code: "E-7", label: "E-7 (특정활동)", desc: "전문인력 (IT, 통역 등)" },
  { code: "E-1", label: "E-1 (교수)", desc: "대학 이상 교육기관" },
  { code: "E-2", label: "E-2 (회화지도)", desc: "외국어 회화지도" },
  { code: "F-2", label: "F-2 (거주)", desc: "영주권 이전 거주" },
  { code: "F-4", label: "F-4 (재외동포)", desc: "재외동포 체류" },
  { code: "F-5", label: "F-5 (영주)", desc: "영주권자" },
  { code: "F-6", label: "F-6 (결혼이민)", desc: "한국인 배우자" },
  { code: "OTHER", label: "기타", desc: "직접 입력" },
];

interface ForeignContractData {
  company: CompanyInfo;
  employeeName: string;
  employeeNameEn: string;
  nationality: string;
  passportNumber: string;
  foreignRegistrationNumber: string;
  visaType: string;
  visaTypeCustom: string;
  visaExpiry: string;
  address: string;
  phone: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  workplace: string;
  jobDescription: string;
  jobDescriptionEn: string;
  position: string;
  department: string;
  workStartTime: string;
  workEndTime: string;
  breakTime: number;
  workDays: string[];
  weeklyHoliday: string;
  baseSalary: number;
  salaryType: string;
  paymentMethod: string;
  paymentDate: number;
  mealAllowance: number;
  otherAllowance: string;
  otherAllowanceAmount: number;
  insurance: {
    national: boolean;
    health: boolean;
    employment: boolean;
    industrial: boolean;
  };
  accommodationType: "company" | "self" | "none";
  accommodationAddress: string;
  accommodationCost: number;
  departureGuaranteeInsurance: boolean;
  returnTravelInsurance: boolean;
  annualLeave: number;
  specialTerms: string;
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const defaultContract: ForeignContractData = {
  company: defaultCompanyInfo,
  employeeName: "",
  employeeNameEn: "",
  nationality: "",
  passportNumber: "",
  foreignRegistrationNumber: "",
  visaType: "E-9",
  visaTypeCustom: "",
  visaExpiry: "",
  address: "",
  phone: "",
  contractDate: new Date().toISOString().split("T")[0],
  startDate: "",
  endDate: "",
  workplace: "",
  jobDescription: "",
  jobDescriptionEn: "",
  position: "",
  department: "",
  workStartTime: "09:00",
  workEndTime: "18:00",
  breakTime: 60,
  workDays: ["월", "화", "수", "목", "금"],
  weeklyHoliday: "매주 일요일",
  baseSalary: 0,
  salaryType: "월급",
  paymentMethod: "근로자 명의 예금통장에 입금",
  paymentDate: 25,
  mealAllowance: 200000,
  otherAllowance: "",
  otherAllowanceAmount: 0,
  insurance: {
    national: true,
    health: true,
    employment: true,
    industrial: true,
  },
  accommodationType: "none",
  accommodationAddress: "",
  accommodationCost: 0,
  departureGuaranteeInsurance: true,
  returnTravelInsurance: true,
  annualLeave: 15,
  specialTerms: "",
};

export default function ForeignContractPage() {
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");

  const [contract, setContract] =
    useState<ForeignContractData>(defaultContract);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const {
    restore,
    clear: clearAutoSave,
    lastSavedAt,
  } = useAutoSave("contract_foreign", contract, !showPreview);
  const [autoSaveRestored, setAutoSaveRestored] = useState(false);

  useEffect(() => {
    setContract((prev) => ({
      ...prev,
      company: companyInfo,
      workplace: companyInfo.address,
    }));
  }, [companyInfo]);

  useEffect(() => {
    if (!autoSaveRestored) {
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
  }, [autoSaveRestored, restore]);

  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();
  const { canUseFeature } = usePlanGate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [contractLang, setContractLang] = useState<LanguageCode>("en");
  const [employerSignature, setEmployerSignature] = useState<string | null>(
    null,
  );
  const [employeeSignature, setEmployeeSignature] = useState<string | null>(
    null,
  );

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "contract_foreign",
      title: `외국인 근로계약서 - ${contract.employeeName || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: contract as unknown as Record<string, unknown>,
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) return;
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    setContract((prev) => ({
      ...prev,
      employeeName: emp.info.name,
      address: emp.info.address,
      phone: emp.info.phone,
      startDate: emp.hireDate,
      department: emp.department || "",
      position: emp.position || "",
      workStartTime: emp.workCondition.workStartTime,
      workEndTime: emp.workCondition.workEndTime,
      breakTime: emp.workCondition.breakTime,
      workDays: emp.workCondition.workDays,
      baseSalary: emp.salary.baseSalary,
      mealAllowance: emp.salary.mealAllowance,
      insurance: emp.insurance,
    }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `외국인_근로계약서_${contract.employeeName || "이름없음"}`,
  });

  const updateContract = (field: string, value: unknown) => {
    setContract((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWorkDay = (day: string) => {
    setContract((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
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
          { label: "외국인 근로계약서" },
        ]}
      />
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            🌏 외국인 근로계약서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            한국어 + English 이중언어 · 고용노동부 표준양식 기반
          </p>
          <AutoSaveStatus lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex gap-2 flex-wrap">
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
          {showPreview && (
            <EmailSendButton
              documentTitle={`외국인 근로계약서 — ${contract.employeeName || "미입력"}`}
              documentType="외국인 근로계약서"
              recipientName={contract.employeeName}
              printRef={printRef}
            />
          )}
          <button
            onClick={() => handlePrint()}
            className="btn-primary"
            disabled={!contract.employeeName}
          >
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

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
        pageKey="contract-foreign-v1"
        steps={[
          "직원 선택: 등록된 직원이 있으면 선택하여 기본 정보 자동 입력. 여권번호·체류자격 등 외국인 전용 정보는 직접 입력해주세요.",
          "체류자격: E-9(비전문취업), H-2(방문취업), E-7(전문인력) 등 비자 유형에 따라 계약 조건이 달라집니다.",
          "숙소: 사업주가 숙소를 제공하는 경우 비용 공제 한도를 확인하세요.",
          "보험: E-9 근로자는 출국만기보험·귀국비용보험 가입이 의무입니다 (외국인고용법 제13조).",
          "출력: 미리보기에서 한국어+영어 이중언어로 확인 후 인쇄. 외국인고용법 제11조에 따라 근로조건을 모국어로 설명해야 합니다.",
        ]}
      />

      {!showPreview ? (
        <MobileFormWizard
          steps={[
            {
              title: "사업장·근로자",
              icon: "🏢",
              validate: () =>
                !!contract.employeeName &&
                !!contract.nationality &&
                !!contract.visaType,
              validationMessage:
                "근로자 성명, 국적, 체류자격(비자)은 필수 입력 항목입니다.",
              helpText:
                "등록된 직원을 선택하면 기본 정보가 자동 입력됩니다. 여권번호·체류자격 등 외국인 전용 정보는 직접 입력해주세요.",
              summary: [
                { label: "근로자", value: contract.employeeName },
                { label: "국적", value: contract.nationality },
                { label: "비자", value: contract.visaType },
              ],
              content: (
                <div className="space-y-6">
                  {/* 회사 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🏢 사용자(회사) 정보 / Employer Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">
                          회사명 Company Name
                        </label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.name}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          사업자등록번호 Business No.
                        </label>
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
                        <label className="input-label">주소 Address</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.address}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          대표자 Representative
                        </label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.ceoName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처 Phone</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.phone}
                          readOnly
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-light)] mt-2">
                      * 회사 정보는 설정에서 수정할 수 있습니다.
                    </p>
                  </div>

                  {/* 근로자 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      👤 근로자 정보 / Employee Information
                    </h2>
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
                              {emp.info.name} ({emp.department || "부서없음"})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-blue-600 mt-1">
                          💡 기본 정보가 자동 입력됩니다. 여권번호, 체류자격
                          등은 별도 입력 필요.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">
                          성명 (한국어) Name (Korean) *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="홍길동"
                          value={contract.employeeName}
                          onChange={(e) =>
                            updateContract("employeeName", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          성명 (영문) Name (English) *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="HONG GILDONG"
                          value={contract.employeeNameEn}
                          onChange={(e) =>
                            updateContract(
                              "employeeNameEn",
                              e.target.value.toUpperCase(),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          국적 Nationality *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 베트남, 중국, 필리핀"
                          value={contract.nationality}
                          onChange={(e) =>
                            updateContract("nationality", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          🌐 계약서 병기 언어
                        </label>
                        <select
                          className="input-field"
                          value={contractLang}
                          onChange={(e) =>
                            setContractLang(e.target.value as LanguageCode)
                          }
                        >
                          {LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.labelKo} ({l.label})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          미리보기·출력 시 한국어 + 선택 언어로 병기됩니다
                        </p>
                      </div>
                      <div>
                        <label className="input-label">
                          여권번호 Passport No. *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="M12345678"
                          value={contract.passportNumber}
                          onChange={(e) =>
                            updateContract(
                              "passportNumber",
                              e.target.value.toUpperCase(),
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          외국인등록번호 Alien Reg. No.
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="000000-0000000"
                          value={contract.foreignRegistrationNumber}
                          onChange={(e) =>
                            updateContract(
                              "foreignRegistrationNumber",
                              autoFormatForeignRegNumber(e.target.value),
                            )
                          }
                          maxLength={14}
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          체류자격 Visa Type *
                        </label>
                        <select
                          className="input-field"
                          value={contract.visaType}
                          onChange={(e) =>
                            updateContract("visaType", e.target.value)
                          }
                        >
                          {VISA_TYPES.map((v) => (
                            <option key={v.code} value={v.code}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                        {contract.visaType !== "OTHER" && (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            {
                              VISA_TYPES.find(
                                (v) => v.code === contract.visaType,
                              )?.desc
                            }
                          </p>
                        )}
                        {contract.visaType === "OTHER" && (
                          <input
                            type="text"
                            className="input-field mt-2"
                            placeholder="체류자격 직접 입력"
                            value={contract.visaTypeCustom}
                            onChange={(e) =>
                              updateContract("visaTypeCustom", e.target.value)
                            }
                          />
                        )}
                      </div>
                      <div>
                        <label className="input-label">
                          체류기간 만료일 Visa Expiry
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.visaExpiry}
                          onChange={(e) =>
                            updateContract("visaExpiry", e.target.value)
                          }
                        />
                        {contract.visaExpiry &&
                          contract.endDate &&
                          contract.visaExpiry < contract.endDate && (
                            <p className="text-red-500 text-xs mt-1 font-medium">
                              ⚠️ 체류기간이 계약 종료일보다 빠릅니다. 연장 필요!
                            </p>
                          )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">주소 Address *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="서울시 강남구 테헤란로 123"
                          value={contract.address}
                          onChange={(e) =>
                            updateContract("address", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처 Phone *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="010-1234-5678"
                          value={contract.phone}
                          onChange={(e) =>
                            updateContract(
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
              title: "계약·근무",
              icon: "📅",
              validate: () =>
                !!contract.startDate && contract.workDays.length > 0,
              validationMessage: "근무 시작일과 근무 요일을 입력해주세요.",
              helpText:
                "외국인 근로자의 계약기간은 체류자격 만료일을 초과할 수 없습니다. E-9 비자는 최대 3년(연장 시 4년 10개월)입니다.",
              summary: [
                { label: "시작일", value: contract.startDate },
                { label: "종료일", value: contract.endDate },
                {
                  label: "근무",
                  value: `${contract.workStartTime}~${contract.workEndTime}`,
                },
              ],
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      📅 계약 정보 / Contract Details
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
                        <label className="input-label">
                          근무 종료일 End Date
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.endDate}
                          onChange={(e) =>
                            updateContract("endDate", e.target.value)
                          }
                        />
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          E-9: 최대 3년, 재계약 시 4년10개월까지
                        </p>
                      </div>
                      <div>
                        <label className="input-label">부서 Department</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 생산팀"
                          value={contract.department}
                          onChange={(e) =>
                            updateContract("department", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">직위 Position</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 생산직"
                          value={contract.position}
                          onChange={(e) =>
                            updateContract("position", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">
                          근무 장소 Workplace *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={contract.workplace}
                          onChange={(e) =>
                            updateContract("workplace", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          업무 내용 (한국어) *
                        </label>
                        <textarea
                          className="input-field min-h-[60px]"
                          placeholder="예: 제품 조립 및 포장 업무"
                          value={contract.jobDescription}
                          onChange={(e) =>
                            updateContract("jobDescription", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          Job Description (English) *
                        </label>
                        <textarea
                          className="input-field min-h-[60px]"
                          placeholder="e.g. Product assembly and packaging"
                          value={contract.jobDescriptionEn}
                          onChange={(e) =>
                            updateContract("jobDescriptionEn", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 근로시간 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      ⏰ 근로시간 / Working Hours
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="input-label">시작 Start</label>
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
                        <label className="input-label">종료 End</label>
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
                        <label className="input-label">휴게 Break (분)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={contract.breakTime}
                          onChange={(e) =>
                            updateContract(
                              "breakTime",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="input-label">근무 요일 Work Days</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWorkDay(day)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${contract.workDays.includes(day) ? "bg-blue-500 text-white" : "bg-[var(--bg)] text-[var(--text-muted)] hover:bg-[var(--border-light)]"}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 실시간 근로시간 */}
                    {contract.workDays.length > 0 &&
                      (() => {
                        const s = contract.workStartTime.split(":").map(Number);
                        const e = contract.workEndTime.split(":").map(Number);
                        const mins =
                          e[0] * 60 +
                          e[1] -
                          (s[0] * 60 + s[1]) -
                          contract.breakTime;
                        const wk = (mins * contract.workDays.length) / 60;
                        const ot = Math.max(wk - 40, 0);
                        return (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>📊 근로시간 Calculated</strong>
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              • 1일:{" "}
                              <strong>
                                {Math.floor(mins / 60)}h{" "}
                                {mins % 60 > 0 ? `${mins % 60}m` : ""}
                              </strong>
                            </p>
                            <p className="text-sm text-blue-700">
                              • 주: <strong>{Math.min(wk, 40)}h/week</strong>
                            </p>
                            {ot > 0 && (
                              <p className="text-sm text-red-600 font-medium mt-1">
                                ⚠️ 연장 Overtime: {ot.toFixed(1)}h (50% premium)
                              </p>
                            )}
                          </div>
                        );
                      })()}

                    <div className="mt-4">
                      <label className="input-label">
                        주휴일 Weekly Holiday *
                      </label>
                      <select
                        className="input-field"
                        value={contract.weeklyHoliday}
                        onChange={(e) =>
                          updateContract("weeklyHoliday", e.target.value)
                        }
                      >
                        <option value="매주 일요일">
                          매주 일요일 (Every Sunday)
                        </option>
                        <option value="매주 토요일">
                          매주 토요일 (Every Saturday)
                        </option>
                        <option value="매주 토요일, 일요일">
                          토·일 (Sat & Sun)
                        </option>
                        <option value="주 1회 (별도 지정)">
                          주 1회 별도 지정 (TBD)
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "급여·보험",
              icon: "💰",
              validate: () => contract.baseSalary >= MINIMUM_WAGE.monthly,
              validationMessage: `월 기본급이 2026년 최저임금(${MINIMUM_WAGE.monthly.toLocaleString()}원)에 미달합니다.`,
              helpText:
                "외국인 근로자에게도 최저임금법이 동일하게 적용됩니다. 숙소비·식대 등을 급여에서 공제할 경우 공제 후 금액도 최저임금 이상이어야 합니다.",
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
                  <div className="form-section">
                    <h2 className="form-section-title">💰 임금 / Wages</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">
                          급여 형태 Pay Type *
                        </label>
                        <select
                          className="input-field"
                          value={contract.salaryType}
                          onChange={(e) =>
                            updateContract("salaryType", e.target.value)
                          }
                        >
                          <option value="월급">월급제 (Monthly)</option>
                          <option value="시급">시급제 (Hourly)</option>
                          <option value="일급">일급제 (Daily)</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">
                          월 기본급 Base Salary (₩) *
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder={String(MINIMUM_WAGE.monthly)}
                          value={contract.baseSalary || ""}
                          onChange={(e) =>
                            updateContract(
                              "baseSalary",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.baseSalary > 0 &&
                          contract.baseSalary < MINIMUM_WAGE.monthly && (
                            <p className="text-red-500 text-xs mt-1 font-medium">
                              ⚠️ 최저임금({formatCurrency(MINIMUM_WAGE.monthly)}
                              ) 미달
                            </p>
                          )}
                        {contract.baseSalary > 0 && (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            = {formatCurrency(contract.baseSalary)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">
                          지급방법 Payment *
                        </label>
                        <select
                          className="input-field"
                          value={contract.paymentMethod}
                          onChange={(e) =>
                            updateContract("paymentMethod", e.target.value)
                          }
                        >
                          <option value="근로자 명의 예금통장에 입금">
                            통장 입금 (Bank transfer)
                          </option>
                          <option value="현금 직접 지급">현금 (Cash)</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">급여일 Pay Day</label>
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
                            (d) => (
                              <option key={d} value={d}>
                                매월 {d}일
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="input-label">
                          식대 Meal (비과세)
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
                            ⚠️ 20만원 초과분 과세 (Taxable over ₩200K:{" "}
                            {formatCurrency(contract.mealAllowance - 200000)})
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            월 20만원 비과세 (Tax-free ≤ ₩200K)
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="input-label">기타 수당 Other</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="예: 야간수당"
                          value={contract.otherAllowance}
                          onChange={(e) =>
                            updateContract("otherAllowance", e.target.value)
                          }
                        />
                      </div>
                      {contract.otherAllowance && (
                        <div>
                          <label className="input-label">
                            기타 수당 금액 (₩)
                          </label>
                          <input
                            type="number"
                            className="input-field"
                            value={contract.otherAllowanceAmount || ""}
                            onChange={(e) =>
                              updateContract(
                                "otherAllowanceAmount",
                                parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                      )}
                      <div>
                        <label className="input-label">
                          연차휴가 Annual Leave (일)
                        </label>
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
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          1년 근속 15일 (Art. 60)
                        </p>
                      </div>
                    </div>
                    {contract.baseSalary > 0 && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 font-medium mb-2">
                          💰 월급 합계 Monthly Total (세전/Gross)
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                          <p>기본급: {formatCurrency(contract.baseSalary)}</p>
                          {contract.mealAllowance > 0 && (
                            <p>
                              식대: {formatCurrency(contract.mealAllowance)}
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
                              (contract.otherAllowanceAmount || 0),
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 4대보험 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🏥 사회보험 / Social Insurance
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(
                        [
                          {
                            key: "national",
                            label: "국민연금",
                            en: "NP",
                            rate: "4.75%",
                          },
                          {
                            key: "health",
                            label: "건강보험",
                            en: "HI",
                            rate: "3.595%",
                          },
                          {
                            key: "employment",
                            label: "고용보험",
                            en: "EI",
                            rate: "0.9%",
                          },
                          {
                            key: "industrial",
                            label: "산재보험",
                            en: "IA",
                            rate: "사업주",
                          },
                        ] as const
                      ).map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 cursor-pointer p-3 bg-[var(--bg)] rounded-lg"
                        >
                          <input
                            type="checkbox"
                            checked={contract.insurance[item.key]}
                            onChange={() => toggleInsurance(item.key)}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <div>
                            <span className="text-[var(--text)] font-medium text-sm">
                              {item.label}
                            </span>
                            <p className="text-xs text-[var(--text-light)]">
                              {item.en} · {item.rate}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-light)] mt-3">
                      ※ E-9: 국민연금 상호주의 적용 (본국 협정에 따라 면제 가능)
                    </p>
                  </div>
                </div>
              ),
            },
            {
              title: "숙소",
              icon: "🏠",
              helpText:
                '숙소를 제공하는 경우 "사업주 제공"을 선택하세요. 숙소비 공제 시 상세 설정 스텝이 추가됩니다.',
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🏠 숙소 / Accommodation
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="input-label">숙소 유형</label>
                        <div className="flex flex-wrap gap-4 mt-2">
                          {(
                            [
                              { v: "company", l: "사업주 제공 (Employer)" },
                              { v: "self", l: "근로자 자가 (Self)" },
                              { v: "none", l: "해당 없음 (N/A)" },
                            ] as const
                          ).map((o) => (
                            <label
                              key={o.v}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="accom"
                                checked={contract.accommodationType === o.v}
                                onChange={() =>
                                  updateContract("accommodationType", o.v)
                                }
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="text-sm">{o.l}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      {contract.accommodationType !== "company" && (
                        <p className="text-xs text-green-600 mt-2">
                          {contract.accommodationType === "self"
                            ? "근로자가 자가 숙소를 사용합니다."
                            : "숙소 관련 사항이 없습니다."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "숙소 상세",
              icon: "🏠",
              visible: () => contract.accommodationType === "company",
              helpText:
                "숙소비 공제는 월 임금의 8%를 초과하지 않는 것이 권장됩니다. 공제 금액이 과도하면 근로감독 시 문제가 될 수 있습니다.",
              summary: [
                {
                  label: "숙소",
                  value: contract.accommodationAddress || "사업주 제공",
                },
                {
                  label: "숙소비",
                  value:
                    contract.accommodationCost > 0
                      ? `${contract.accommodationCost.toLocaleString()}원 공제`
                      : "",
                },
              ],
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🏠 숙소 상세 / Accommodation Details
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      사업주가 숙소를 제공합니다. 상세 정보를 입력하세요.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="input-label">숙소 주소 Address</label>
                        <input
                          type="text"
                          className="input-field"
                          value={contract.accommodationAddress}
                          onChange={(e) =>
                            updateContract(
                              "accommodationAddress",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">
                          월 숙소비 공제 Deduction (₩)
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          value={contract.accommodationCost || ""}
                          onChange={(e) =>
                            updateContract(
                              "accommodationCost",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        {contract.accommodationCost > 0 &&
                          contract.baseSalary > 0 && (
                            <p
                              className={`text-xs mt-1 font-medium ${contract.accommodationCost > contract.baseSalary * 0.08 ? "text-red-500" : "text-green-600"}`}
                            >
                              {contract.accommodationCost >
                              contract.baseSalary * 0.08
                                ? `⚠️ 임금의 8%(${formatCurrency(Math.round(contract.baseSalary * 0.08))}) 초과`
                                : `✅ 적정 (${((contract.accommodationCost / contract.baseSalary) * 100).toFixed(1)}%)`}
                            </p>
                          )}
                        <p className="text-xs text-[var(--text-muted)] mt-2">
                          ※ 외국인근로자 숙식비 공제 한도: 통상임금의 8% 이내
                          권장 (고용노동부 가이드라인). 최저임금 미달 주의. 숙소
                          제공 시 기숙사 규정(근로기준법 §99~100)을 별도
                          비치해야 합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "외국인보험",
              icon: "🛡️",
              visible: () =>
                contract.visaType === "E-9" || contract.visaType === "H-2",
              validate: () => contract.departureGuaranteeInsurance,
              validationMessage: `${contract.visaType} 근로자는 출국만기보험 가입이 법적 의무입니다 (외국인고용법 제13조).`,
              helpText:
                "E-9, H-2 비자 근로자는 출국만기보험과 귀국비용보험 가입이 법적 의무입니다. 미가입 시 과태료가 부과됩니다.",
              summary: [
                {
                  label: "출국만기보험",
                  value: contract.departureGuaranteeInsurance
                    ? "가입"
                    : "미가입",
                },
                {
                  label: "귀국비용보험",
                  value: contract.returnTravelInsurance ? "가입" : "미가입",
                },
              ],
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      🛡️ 외국인 전용 보험 / Foreign Worker Insurance
                    </h2>
                    <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg mb-4">
                      {contract.visaType} 비자 근로자는 아래 보험 가입이{" "}
                      <strong>법적 의무</strong>입니다.
                    </p>
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                        <input
                          type="checkbox"
                          checked={contract.departureGuaranteeInsurance}
                          onChange={(e) =>
                            updateContract(
                              "departureGuaranteeInsurance",
                              e.target.checked,
                            )
                          }
                          className="w-5 h-5 text-blue-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="text-[var(--text)] font-medium">
                            출국만기보험 Departure Guarantee Insurance
                          </span>
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            사업주가 월 임금 8.3% 적립, 출국 시 지급
                            <br />
                            Employer deposits 8.3%, paid on departure.
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
                        <input
                          type="checkbox"
                          checked={contract.returnTravelInsurance}
                          onChange={(e) =>
                            updateContract(
                              "returnTravelInsurance",
                              e.target.checked,
                            )
                          }
                          className="w-5 h-5 text-blue-600 rounded mt-0.5"
                        />
                        <div>
                          <span className="text-[var(--text)] font-medium">
                            귀국비용보험 Return Travel Insurance
                          </span>
                          <p className="text-xs text-[var(--text-light)] mt-1">
                            귀국 항공료 보장 (사업주 부담)
                            <br />
                            Covers return flight (employer-paid).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "특약·서명",
              icon: "✍️",
              helpText:
                "외국인고용법 제11조에 따라 근로조건을 모국어로 설명해야 합니다. 특약사항을 영문으로도 기재하면 분쟁 예방에 도움됩니다.",
              content: (
                <div className="space-y-6">
                  <div className="form-section">
                    <h2 className="form-section-title">
                      📋 특약사항 / Special Terms
                    </h2>
                    <textarea
                      className="input-field min-h-[100px]"
                      placeholder={
                        "예: 체류자격 변경 시 즉시 통보 의무\ne.g. Obligation to notify visa changes"
                      }
                      value={contract.specialTerms}
                      onChange={(e) =>
                        updateContract("specialTerms", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-section">
                    <h2 className="form-section-title">
                      ✍️ 전자서명 / Signatures
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                      서명은 미리보기/인쇄에 포함됩니다. Signatures appear in
                      preview and print.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SignaturePad
                        label="👔 사업주 Employer"
                        onSave={setEmployerSignature}
                        width={360}
                        height={150}
                        initialValue={employerSignature || undefined}
                      />
                      <SignaturePad
                        label="👤 근로자 Employee"
                        onSave={setEmployeeSignature}
                        width={360}
                        height={150}
                        initialValue={employeeSignature || undefined}
                      />
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
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8">
          <ForeignContractPreview
            contract={contract}
            employerSignature={employerSignature}
            employeeSignature={employeeSignature}
            lang={contractLang}
          />
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
          <ForeignContractPreview
            contract={contract}
            employerSignature={employerSignature}
            employeeSignature={employeeSignature}
            lang={contractLang}
          />
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="전자서명 안내"
        message="전자서명 기능을 사용할 수 있습니다."
      />
    </div>
  );
}

/* ==================== 한국어 + 선택 언어 이중언어 미리보기 ==================== */
function ForeignContractPreview({
  contract,
  employerSignature,
  employeeSignature,
  lang = "en",
}: {
  contract: ForeignContractData;
  employerSignature?: string | null;
  employeeSignature?: string | null;
  lang?: LanguageCode;
}) {
  const t = CONTRACT_TRANSLATIONS[lang];
  const langInfo = LANGUAGES.find((l) => l.code === lang);

  const ins: { ko: string; foreign: string }[] = [];
  if (contract.insurance.national)
    ins.push({ ko: "국민연금", foreign: t.nationalPension });
  if (contract.insurance.health)
    ins.push({ ko: "건강보험", foreign: t.healthInsurance });
  if (contract.insurance.employment)
    ins.push({ ko: "고용보험", foreign: t.employmentInsurance });
  if (contract.insurance.industrial)
    ins.push({ ko: "산재보험", foreign: t.industrialAccident });

  const s = contract.workStartTime.split(":").map(Number);
  const e = contract.workEndTime.split(":").map(Number);
  const mins = e[0] * 60 + e[1] - (s[0] * 60 + s[1]) - contract.breakTime;
  const wkH = Math.min((mins * contract.workDays.length) / 60, 40);
  const total =
    contract.baseSalary +
    (contract.mealAllowance || 0) +
    (contract.otherAllowanceAmount || 0);
  const visa =
    contract.visaType === "OTHER" ? contract.visaTypeCustom : contract.visaType;

  const cell = {
    border: "1px solid #d1d5db",
    padding: "10px 14px",
    verticalAlign: "top" as const,
  };
  const hdr = {
    ...cell,
    backgroundColor: "#f8fafc",
    fontWeight: 600,
    width: "160px",
    color: "#374151",
  };
  const sec = {
    backgroundColor: "#1e40af",
    color: "white",
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "0.5px",
  };
  const sub = { color: "#6b7280", fontSize: "13px" };

  /** 한국어 라벨 + 외국어 라벨 병기 헬퍼 */
  const bi = (ko: string, foreign: string) => `${ko} ${foreign}`;

  return (
    <div
      style={{
        fontFamily: "'Pretendard','Nanum Gothic',sans-serif",
        color: "#1f2937",
        lineHeight: 1.6,
      }}
    >
      {/* 제목 */}
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
            fontSize: "26px",
            fontWeight: 700,
            color: "#1e40af",
            marginBottom: "4px",
            letterSpacing: "2px",
          }}
        >
          외국인 근로계약서
        </h1>
        <p style={{ fontSize: "18px", color: "#4b5563", fontWeight: 500 }}>
          {t.title}
        </p>
        {lang !== "en" && (
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            Language: 한국어 + {langInfo?.label} ({langInfo?.labelKo})
          </p>
        )}
      </div>

      {/* 전문 */}
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
          (이하 &quot;사용자&quot; / &quot;{t.employer}&quot;)과(와)
          <strong style={{ color: "#1e40af" }}>
            {" "}
            {contract.employeeName}
          </strong>{" "}
          ({contract.employeeNameEn}) (이하 &quot;근로자&quot; / &quot;
          {t.employee}&quot;)은 다음과 같이 근로계약을 체결한다.
        </p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
          {t.introText}
        </p>
      </div>

      {/* 제1조 근로자 신상 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sec}>
              제1조 [근로자 정보] {t.art1_title}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={hdr}>{bi("성명", t.name)}</th>
            <td style={cell}>
              {contract.employeeName} ({contract.employeeNameEn})
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("국적", t.nationality)}</th>
            <td style={cell}>{contract.nationality}</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("여권번호", t.passport)}</th>
            <td style={cell}>{contract.passportNumber}</td>
          </tr>
          {contract.foreignRegistrationNumber && (
            <tr>
              <th style={hdr}>{bi("외국인등록번호", t.alienReg)}</th>
              <td style={cell}>{contract.foreignRegistrationNumber}</td>
            </tr>
          )}
          <tr>
            <th style={hdr}>{bi("체류자격", t.visa)}</th>
            <td style={cell}>
              <strong>{visa}</strong>
              {contract.visaExpiry && (
                <>
                  <br />
                  <span style={sub}>
                    {bi("만료", t.visaExpiry)}:{" "}
                    {formatDate(contract.visaExpiry)}
                  </span>
                </>
              )}
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("주소", t.address)}</th>
            <td style={cell}>{contract.address}</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("연락처", t.phone)}</th>
            <td style={cell}>{contract.phone}</td>
          </tr>
        </tbody>
      </table>

      {/* 제2조 계약 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sec}>
              제2조 [계약기간·근무] {t.art2_title}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={hdr}>{bi("계약기간", t.contractPeriod)}</th>
            <td style={cell}>
              <strong>{formatDate(contract.startDate)}</strong> ~{" "}
              <strong>
                {contract.endDate
                  ? formatDate(contract.endDate)
                  : bi("정함 없음", `(${t.indefinite})`)}
              </strong>
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("근무장소", t.workplace)}</th>
            <td style={cell}>{contract.workplace}</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("부서", t.department)}</th>
            <td style={cell}>{contract.department || "TBD"}</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("직위", t.position)}</th>
            <td style={cell}>{contract.position || "Staff"}</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("업무", t.jobDescription)}</th>
            <td style={cell}>
              {contract.jobDescription}
              {contract.jobDescriptionEn && (
                <>
                  <br />
                  <span style={sub}>{contract.jobDescriptionEn}</span>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제3조 근로시간 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sec}>
              제3조 [근로시간·휴일] {t.art3_title}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={hdr}>{bi("근로시간", t.workHours)}</th>
            <td style={cell}>
              <strong>{contract.workStartTime}</strong> ~{" "}
              <strong>{contract.workEndTime}</strong>
              <br />
              <span style={sub}>
                Daily: {Math.floor(mins / 60)}h{" "}
                {mins % 60 > 0 ? `${mins % 60}m` : ""} / Weekly: {wkH}h
              </span>
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("휴게", t.breakTime)}</th>
            <td style={cell}>{contract.breakTime}분 min</td>
          </tr>
          <tr>
            <th style={hdr}>{bi("근무요일", t.workDays)}</th>
            <td style={cell}>
              {contract.workDays.join(", ")} ({contract.workDays.length}일/week)
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("주휴일", t.weeklyHoliday)}</th>
            <td style={cell}>
              <strong>{contract.weeklyHoliday}</strong> ({bi("유급", t.paid)})
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("연차", t.annualLeave)}</th>
            <td style={cell}>
              연 {contract.annualLeave}일 ({contract.annualLeave}{" "}
              {t.daysPerYear}) — 근로기준법 제60조
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
            <th colSpan={2} style={sec}>
              제4조 [임금] {t.art4_title}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={hdr}>{bi("형태", t.salaryType)}</th>
            <td style={cell}>
              <strong>{contract.salaryType}제</strong>
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("임금구성", t.wageBreakdown)}</th>
            <td style={cell}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", width: "180px" }}>
                      {bi("기본급", t.baseSalary)}
                    </td>
                    <td style={{ padding: "4px 0", textAlign: "right" }}>
                      {formatCurrency(contract.baseSalary)}
                    </td>
                  </tr>
                  {contract.mealAllowance > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        {bi("식대", t.mealAllowance)}
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.mealAllowance)}
                      </td>
                    </tr>
                  )}
                  {contract.otherAllowanceAmount > 0 && (
                    <tr>
                      <td style={{ padding: "4px 0" }}>
                        {bi("기타", t.otherAllowance)}
                        {contract.otherAllowance
                          ? ` (${contract.otherAllowance})`
                          : ""}
                      </td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {formatCurrency(contract.otherAllowanceAmount)}
                      </td>
                    </tr>
                  )}
                  <tr
                    style={{ borderTop: "1px solid #d1d5db", fontWeight: 600 }}
                  >
                    <td style={{ padding: "8px 0" }}>
                      {bi("월 합계", t.monthlyTotal)}
                    </td>
                    <td
                      style={{
                        padding: "8px 0",
                        textAlign: "right",
                        color: "#1e40af",
                      }}
                    >
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <th style={hdr}>{bi("지급", t.paymentMethod)}</th>
            <td style={cell}>
              {contract.paymentMethod}
              <br />
              <span style={sub}>
                {t.theNth.replace("N", String(contract.paymentDate))}
              </span>
            </td>
          </tr>
          {contract.accommodationType === "company" &&
            contract.accommodationCost > 0 && (
              <tr>
                <th style={hdr}>
                  {bi("숙소비 공제", t.accommodationDeduction)}
                </th>
                <td style={cell}>
                  월 {formatCurrency(contract.accommodationCost)} 공제
                  <br />
                  <span style={sub}>{contract.accommodationAddress}</span>
                </td>
              </tr>
            )}
        </tbody>
      </table>

      {/* 제5조 보험 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th colSpan={2} style={sec}>
              제5조 [보험] {t.art5_title}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={hdr}>{bi("4대보험", t.socialInsurance)}</th>
            <td style={cell}>
              {ins.map((i, idx) => (
                <span key={idx}>
                  ✅ {i.ko} {i.foreign}
                  {idx < ins.length - 1 && <br />}
                </span>
              ))}
            </td>
          </tr>
          {(contract.departureGuaranteeInsurance ||
            contract.returnTravelInsurance) && (
            <tr>
              <th style={hdr}>{bi("외국인 전용", t.foreignWorkerIns)}</th>
              <td style={cell}>
                {contract.departureGuaranteeInsurance && (
                  <p>
                    ✅ {bi("출국만기보험", t.departureGuarantee)} (
                    {bi("사업주 부담", t.employerPaid)})
                  </p>
                )}
                {contract.returnTravelInsurance && (
                  <p>
                    ✅ {bi("귀국비용보험", t.returnTravel)} (
                    {bi("사업주 부담", t.employerPaid)})
                  </p>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 숙소 */}
      {contract.accommodationType === "company" && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr>
              <th colSpan={2} style={sec}>
                제6조 [숙소] {t.art6_title}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th style={hdr}>{bi("주소", t.accommodationAddress)}</th>
              <td style={cell}>{contract.accommodationAddress}</td>
            </tr>
            <tr>
              <th style={hdr}>{bi("비용", t.accommodationCost)}</th>
              <td style={cell}>
                월 {formatCurrency(contract.accommodationCost)} ({t.withConsent}
                )
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 특약 */}
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
              <th colSpan={2} style={sec}>
                특약사항 / {t.specialTerms}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} style={{ ...cell, whiteSpace: "pre-wrap" }}>
                {contract.specialTerms}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* 공통 조항 */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "24px",
          border: "1px solid #e5e7eb",
          fontSize: "13px",
          lineHeight: 1.8,
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "8px" }}>
          기타 / {t.generalProvisions}
        </p>
        <p>
          1. 본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따른다.
        </p>
        <p style={{ color: "#6b7280" }}>{t.provision1}</p>
        <p style={{ marginTop: "8px" }}>
          2. 근로자는 체류자격 변경·연장 사항을 사용자에게 즉시 통보한다.
        </p>
        <p style={{ color: "#6b7280" }}>{t.provision2}</p>
        <p style={{ marginTop: "8px" }}>
          3. 본 계약서는 2부 작성, 각 1부씩 보관한다.
        </p>
        <p style={{ color: "#6b7280" }}>{t.provision3}</p>
        <p style={{ marginTop: "8px" }}>
          4. 외국인고용법 제11조에 따라 근로조건을 근로자가 이해하는 언어로
          설명하였음.
        </p>
        <p style={{ color: "#6b7280" }}>{t.provision4}</p>
      </div>

      {/* 서명란 */}
      <p
        style={{
          textAlign: "center",
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        {formatDate(contract.contractDate)}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
          marginTop: "40px",
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <p
            style={{ fontWeight: 600, marginBottom: "16px", color: "#1e40af" }}
          >
            사업주 ({t.employer})
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("상호", t.companyName)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {contract.company.name}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("대표자", t.representative)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {contract.company.ceoName}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("사업자번호", t.businessNumber)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {formatBusinessNumber(contract.company.businessNumber)}
                </td>
              </tr>
            </tbody>
          </table>
          {employerSignature ? (
            <div style={{ marginTop: "16px" }}>
              <img
                src={employerSignature}
                alt="서명"
                style={{ maxHeight: "80px", margin: "0 auto" }}
              />
              <p
                style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}
              >
                {t.signature}
              </p>
            </div>
          ) : (
            <div
              style={{
                marginTop: "16px",
                height: "60px",
                borderBottom: "1px solid #d1d5db",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  paddingTop: "40px",
                }}
              >
                (서명 / {t.signature})
              </p>
            </div>
          )}
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p
            style={{ fontWeight: 600, marginBottom: "16px", color: "#1e40af" }}
          >
            근로자 ({t.employee})
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("성명", t.name)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {contract.employeeName} ({contract.employeeNameEn})
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("국적", t.nationality)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {contract.nationality}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "4px 8px",
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  {bi("여권", t.passport)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  {contract.passportNumber}
                </td>
              </tr>
            </tbody>
          </table>
          {employeeSignature ? (
            <div style={{ marginTop: "16px" }}>
              <img
                src={employeeSignature}
                alt="서명"
                style={{ maxHeight: "80px", margin: "0 auto" }}
              />
              <p
                style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}
              >
                {t.signature}
              </p>
            </div>
          ) : (
            <div
              style={{
                marginTop: "16px",
                height: "60px",
                borderBottom: "1px solid #d1d5db",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  paddingTop: "40px",
                }}
              >
                (서명 / {t.signature})
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: "32px",
          padding: "12px 16px",
          backgroundColor: "#fef3c7",
          borderRadius: "8px",
          border: "1px solid #fbbf24",
          fontSize: "12px",
          color: "#92400e",
        }}
      >
        <p>
          <strong>⚠️ 법적 고지 / {t.legalNotice}</strong>
        </p>
        <p>
          본 계약서는 참고용이며, 법적 효력은 관할 고용노동관서에 확인하시기
          바랍니다.
        </p>
        <p>{t.legalNotice1}</p>
        <p style={{ marginTop: "4px" }}>
          외국인고용법 제11조: 근로조건을 근로자 모국어로 설명 의무.
        </p>
        <p>{t.legalNotice2}</p>
      </div>
    </div>
  );
}
