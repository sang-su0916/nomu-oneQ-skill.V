"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, EmployeeInfo, Employee } from "@/types";
import {
  formatDate,
  formatBusinessNumber,
  formatResidentNumber,
} from "@/lib/storage";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import Breadcrumb from "@/components/Breadcrumb";

interface ConsentData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  consentDate: string;
  // 필수 동의 항목
  consentRequired: boolean;
  // 선택 동의 항목
  consentMarketing: boolean;
  consentThirdParty: boolean;
  consentSensitive: boolean;
}

const defaultEmployee: EmployeeInfo = {
  name: "",
  residentNumber: "",
  address: "",
  phone: "",
};

function createDefaultConsent(): ConsentData {
  return {
    company: defaultCompanyInfo,
    employee: defaultEmployee,
    consentDate: new Date().toISOString().split("T")[0],
    consentRequired: false,
    consentMarketing: false,
    consentThirdParty: false,
    consentSensitive: false,
  };
}

export default function PrivacyConsentPage() {
  const [consent, setConsent] = useState<ConsentData>(createDefaultConsent);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");

  useEffect(() => {
    setConsent((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved: docSaved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "privacy_consent",
      title: `개인정보동의서 - ${consent.employee.name || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: consent as unknown as Record<string, unknown>,
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    if (!employeeId) return;

    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;

    setConsent((prev) => ({
      ...prev,
      employee: emp.info,
    }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `개인정보_수집이용_동의서_${consent.employee.name || "이름없음"}`,
  });

  const updateEmployee = (field: keyof EmployeeInfo, value: string) => {
    setConsent((prev) => ({
      ...prev,
      employee: { ...prev.employee, [field]: value },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "동의/서약", href: "/documents" },
          { label: "개인정보 동의서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            개인정보 수집 이용 동의서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            개인정보보호법 제15조 및 제17조에 따른 동의서
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary"
          >
            {showPreview ? "수정" : "미리보기"}
          </button>
          {showPreview && (
            <button
              onClick={handleSaveToArchive}
              disabled={saving}
              className="btn btn-secondary disabled:opacity-50"
            >
              {saving
                ? "저장 중..."
                : docSaved
                  ? "✓ 저장됨"
                  : "🗄️ 보관함에 저장"}
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="btn btn-primary"
            disabled={!consent.employee.name}
          >
            인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="privacy-consent"
        steps={[
          "회사 정보와 직원 정보를 입력하세요 (직원 선택 시 자동 입력).",
          "수집 목적, 보유 기간 등 동의 항목을 확인하세요.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          {/* 회사 정보 */}
          <div className="form-section">
            <h2 className="form-section-title">사업자(개인정보처리자) 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">회사명</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={consent.company.name}
                  readOnly
                />
              </div>
              <div>
                <label className="input-label">사업자등록번호</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={formatBusinessNumber(consent.company.businessNumber)}
                  readOnly
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">주소</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={consent.company.address}
                  readOnly
                />
              </div>
              <div>
                <label className="input-label">대표자</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={consent.company.ceoName}
                  readOnly
                />
              </div>
              <div>
                <label className="input-label">연락처</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={consent.company.phone}
                  readOnly
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-light)] mt-2">
              * 회사 정보는 설정에서 수정할 수 있습니다.
            </p>
          </div>

          {/* 정보주체(근로자) 정보 */}
          <div className="form-section">
            <h2 className="form-section-title">정보주체(근로자) 정보</h2>

            {employees.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="input-label text-blue-700">
                  등록된 직원에서 선택
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
                <p className="text-xs text-blue-600 mt-1">
                  직원을 선택하면 성명, 주민등록번호 등이 자동으로 입력됩니다.
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
                  value={consent.employee.name}
                  onChange={(e) => updateEmployee("name", e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">주민등록번호 *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="990101-1234567"
                  value={consent.employee.residentNumber}
                  onChange={(e) =>
                    updateEmployee(
                      "residentNumber",
                      e.target.value.replace(/[^0-9-]/g, "").slice(0, 14),
                    )
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">주소</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="서울시 강남구 테헤란로 123"
                  value={consent.employee.address}
                  onChange={(e) => updateEmployee("address", e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">연락처</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="010-1234-5678"
                  value={consent.employee.phone}
                  onChange={(e) =>
                    updateEmployee(
                      "phone",
                      e.target.value.replace(/[^0-9-]/g, "").slice(0, 13),
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* 동의 날짜 */}
          <div className="form-section">
            <h2 className="form-section-title">동의 일자</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">동의 날짜 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={consent.consentDate}
                  onChange={(e) =>
                    setConsent((prev) => ({
                      ...prev,
                      consentDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 동의 항목 선택 */}
          <div className="form-section">
            <h2 className="form-section-title">동의 항목</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)] hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent.consentRequired}
                  onChange={(e) =>
                    setConsent((prev) => ({
                      ...prev,
                      consentRequired: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-[var(--text)]">
                    [필수] 개인정보 수집 및 이용 동의
                  </span>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    근로계약 체결 및 이행, 급여 지급, 4대보험 가입 및 관리, 세무
                    신고 등을 위한 개인정보 수집에 동의합니다.
                  </p>
                  <span className="badge badge-danger mt-2">필수</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)] hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent.consentMarketing}
                  onChange={(e) =>
                    setConsent((prev) => ({
                      ...prev,
                      consentMarketing: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-[var(--text)]">
                    [선택] 사내 행사 및 복리후생 안내
                  </span>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    사내 행사, 복리후생 프로그램, 교육 안내 등을 위한 연락처
                    활용에 동의합니다.
                  </p>
                  <span className="badge badge-info mt-2">선택</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)] hover:border-blue-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent.consentThirdParty}
                  onChange={(e) =>
                    setConsent((prev) => ({
                      ...prev,
                      consentThirdParty: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-blue-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-[var(--text)]">
                    [선택] 제3자 제공 동의
                  </span>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    위탁 업무 수행을 위한 외부 기관(세무사 사무소, 보험 대행
                    기관 등)에 개인정보를 제공하는 것에 동의합니다.
                  </p>
                  <span className="badge badge-info mt-2">선택</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border-2 border-red-200 hover:border-red-300 transition-colors">
                <input
                  type="checkbox"
                  checked={consent.consentSensitive}
                  onChange={(e) =>
                    setConsent((prev) => ({
                      ...prev,
                      consentSensitive: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-red-600 rounded mt-0.5"
                />
                <div>
                  <span className="font-medium text-[var(--text)]">
                    [별도 동의] 민감정보(건강정보) 수집 및 이용
                  </span>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    산업안전보건법에 따른 건강진단 결과 등 건강정보는
                    개인정보보호법상 민감정보에 해당하여 별도의 명시적 동의가
                    필요합니다.
                  </p>
                  <span className="badge badge-danger mt-2">
                    별도 동의 필요
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 안내 */}
          <div className="alert alert-info">
            <div>
              <p className="text-sm font-medium text-blue-800">
                개인정보보호법 안내
              </p>
              <p className="text-sm text-blue-700 mt-1">
                필수 항목에 동의하지 않을 경우, 근로계약 체결 및 급여 지급 등
                인사관리 업무 수행이 불가능할 수 있습니다. 선택 항목에 동의하지
                않더라도 근로계약 체결에는 영향이 없습니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 미리보기 */
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <ConsentPreview consent={consent} />
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
          <ConsentPreview consent={consent} />
        </div>
      </div>
    </div>
  );
}

function ConsentPreview({ consent }: { consent: ConsentData }) {
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
          개인정보 수집 이용 동의서
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Consent Form for Collection and Use of Personal Information
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
          <strong style={{ color: "#1e40af" }}>{consent.company.name}</strong>{" "}
          (이하 &quot;회사&quot;라 함)은 「개인정보 보호법」 제15조제1항제1호,
          제17조제1항제1호, 제24조제1항에 따라 아래와 같이 개인정보를 수집
          이용하고자 합니다. 내용을 자세히 읽으신 후 동의 여부를 결정하여
          주십시오.
        </p>
      </div>

      {/* 제1조 수집 목적 */}
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
              제1조 [개인정보의 수집 및 이용 목적]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>근로관계 관리</th>
            <td style={cellStyle}>
              근로계약의 체결 및 이행, 인사 관리, 급여 산정 및 지급, 퇴직금 산정
              및 지급
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>법적 의무 이행</th>
            <td style={cellStyle}>
              4대보험(국민연금, 건강보험, 고용보험, 산재보험) 가입 및 관리,
              근로소득세 원천징수 및 연말정산
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>세무 신고</th>
            <td style={cellStyle}>
              소득세법에 따른 근로소득 원천징수 및 지급명세서 제출, 국세기본법에
              따른 세무 신고
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>기타</th>
            <td style={cellStyle}>
              증명서 발급(경력증명서, 재직증명서 등), 비상 연락, 복리후생 제공
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제2조 수집 항목 */}
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
              제2조 [수집하는 개인정보의 항목]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>필수 항목</th>
            <td style={cellStyle}>
              <strong>인적사항:</strong> 성명, 주민등록번호, 생년월일, 성별,
              국적
              <br />
              <strong>연락처:</strong> 주소, 전화번호, 휴대전화번호, 이메일
              <br />
              <strong>금융정보:</strong> 은행명, 계좌번호 (급여 지급용)
              <br />
              <strong>가족관계:</strong> 부양가족 인적사항 (연말정산, 4대보험용)
              <br />
              <strong>학력 및 경력:</strong> 최종학력, 경력사항, 자격증
              <br />
              <strong>건강정보:</strong> 건강진단 결과 (산업안전보건법에 따른
              경우)
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>선택 항목</th>
            <td style={cellStyle}>
              비상연락처(가족), 차량번호, 취미 및 특기, 사진
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>고유식별정보</th>
            <td style={cellStyle}>
              주민등록번호 (「개인정보 보호법」 제24조의2에 따라 법령에서
              구체적으로 허용한 경우에 한하여 처리)
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                ※ 소득세법 제145조, 국민연금법 제21조, 국민건강보험법 제12조
                등에 근거
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제3조 보유 및 이용 기간 */}
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
              제3조 [개인정보의 보유 및 이용 기간]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>원칙</th>
            <td style={cellStyle}>
              <strong>근로관계 존속 기간</strong> 동안 보유 및 이용하며,
              근로관계 종료(퇴직) 시 지체 없이 파기합니다. 다만, 다음의 법령에
              따라 일정 기간 보관이 필요한 경우에는 해당 기간 동안 보관합니다.
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>근로기준법</th>
            <td style={cellStyle}>
              근로자 명부 및 근로계약에 관한 중요 서류:{" "}
              <strong>근로관계 종료 후 3년</strong>
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                (근로기준법 제42조, 동법 시행령 제22조)
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>국세기본법</th>
            <td style={cellStyle}>
              세무 관련 장부 및 증빙서류:{" "}
              <strong>
                해당 거래가 속하는 과세기간의 법정신고기한으로부터 5년
              </strong>
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                (국세기본법 제85조의3)
              </span>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>국민연금법 등</th>
            <td style={cellStyle}>
              4대보험 관련 자료: <strong>자격 상실 후 3년</strong>
              <br />
              <span style={{ color: "#6b7280", fontSize: "13px" }}>
                (국민연금법, 국민건강보험법, 고용보험법 각 관련 조항)
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제4조 동의 거부 권리 */}
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
              제4조 [동의 거부 권리 및 불이익]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={headerStyle}>거부 권리</th>
            <td style={cellStyle}>
              정보주체는 개인정보의 수집 및 이용에 대한 동의를 거부할 권리가
              있습니다.
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>거부 시 불이익</th>
            <td style={cellStyle}>
              <strong>[필수 항목]</strong> 동의를 거부하실 경우, 근로계약 체결
              및 이행, 급여 지급, 4대보험 가입 등 인사 노무 관리 업무 수행이
              불가능하여 근로계약 체결이 제한될 수 있습니다.
              <br />
              <br />
              <strong>[선택 항목]</strong> 동의를 거부하시더라도 근로계약 체결
              및 기본적인 인사관리에는 영향이 없으며, 다만 해당 서비스(사내 행사
              안내, 복리후생 안내 등)의 제공이 제한될 수 있습니다.
            </td>
          </tr>
        </tbody>
      </table>

      {/* 제5조 정보주체의 권리 */}
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
              제5조 [정보주체의 권리]
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} style={cellStyle}>
              <p style={{ marginBottom: "8px" }}>
                정보주체는 다음과 같은 권리를 행사할 수 있습니다.
              </p>
              <p style={{ marginBottom: "6px" }}>
                1. 개인정보의 열람을 요구할 권리
              </p>
              <p style={{ marginBottom: "6px" }}>
                2. 개인정보의 정정 삭제를 요구할 권리
              </p>
              <p style={{ marginBottom: "6px" }}>
                3. 개인정보의 처리정지를 요구할 권리
              </p>
              <p style={{ marginBottom: "6px" }}>
                4. 개인정보의 동의 철회를 요구할 권리
              </p>
              <p
                style={{ color: "#6b7280", fontSize: "13px", marginTop: "8px" }}
              >
                ※ 위 권리 행사는 회사 인사부서에 서면, 전화 또는 이메일 등으로
                요청하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 법적 고지 */}
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
            개인정보 보호법 제15조 (개인정보의 수집 이용)
          </strong>
          <br />
          개인정보처리자는 정보주체의 동의를 받은 경우, 법률에 특별한 규정이
          있거나 법령상 의무를 준수하기 위하여 불가피한 경우 등에 개인정보를
          수집할 수 있으며, 그 수집 목적의 범위에서 이용할 수 있습니다.
        </p>
      </div>

      {/* 동의 확인란 */}
      <div
        style={{
          border: "2px solid #1e40af",
          borderRadius: "8px",
          padding: "24px",
          marginBottom: "32px",
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
          동의 확인
        </p>

        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
          }}
        >
          <p style={{ fontSize: "14px", marginBottom: "8px" }}>
            <strong>1. [필수] 개인정보 수집 및 이용에 동의합니다.</strong>
          </p>
          <p style={{ fontSize: "14px", textAlign: "right" }}>
            {consent.consentRequired ? (
              <span style={{ color: "#1e40af", fontWeight: 600 }}>
                동의함 [V]
              </span>
            ) : (
              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                동의하지 않음 [ ]
              </span>
            )}
          </p>
        </div>

        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
          }}
        >
          <p style={{ fontSize: "14px", marginBottom: "8px" }}>
            <strong>
              2. [선택] 사내 행사 및 복리후생 안내를 위한 개인정보 활용에
              동의합니다.
            </strong>
          </p>
          <p style={{ fontSize: "14px", textAlign: "right" }}>
            {consent.consentMarketing ? (
              <span style={{ color: "#1e40af", fontWeight: 600 }}>
                동의함 [V]
              </span>
            ) : (
              <span style={{ color: "#6b7280" }}>동의하지 않음 [ ]</span>
            )}
          </p>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
          }}
        >
          <p style={{ fontSize: "14px", marginBottom: "8px" }}>
            <strong>
              3. [별도 동의] 민감정보(건강정보) 수집 및 이용에 동의합니다.
            </strong>
          </p>
          <p
            style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}
          >
            ※ 산업안전보건법에 따른 건강진단 결과 등 건강정보는 개인정보보호법
            제23조에 따라 별도 동의가 필요합니다.
          </p>
          <p style={{ fontSize: "14px", textAlign: "right" }}>
            {consent.consentSensitive ? (
              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                동의함 [V]
              </span>
            ) : (
              <span style={{ color: "#9ca3af" }}>동의하지 않음 [ ]</span>
            )}
          </p>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
          }}
        >
          <p style={{ fontSize: "14px", marginBottom: "8px" }}>
            <strong>
              4. [선택] 위탁 업무 수행을 위한 제3자 제공에 동의합니다.
            </strong>
          </p>
          <p style={{ fontSize: "14px", textAlign: "right" }}>
            {consent.consentThirdParty ? (
              <span style={{ color: "#1e40af", fontWeight: 600 }}>
                동의함 [V]
              </span>
            ) : (
              <span style={{ color: "#6b7280" }}>동의하지 않음 [ ]</span>
            )}
          </p>
        </div>
      </div>

      {/* 기타 조항 */}
      <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "32px" }}>
        <p style={{ marginBottom: "8px" }}>
          본인은 위의 내용을 충분히 이해하였으며, 위와 같이 개인정보를 수집
          이용하는 것에 동의합니다.
        </p>
        <p style={{ marginBottom: "8px" }}>
          본 동의서에 명시되지 않은 사항은 「개인정보 보호법」 및 관계 법령에
          따릅니다.
        </p>
      </div>

      {/* 동의 일자 */}
      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          fontWeight: 600,
          marginBottom: "40px",
        }}
      >
        {formatDate(consent.consentDate)}
      </p>

      {/* 서명란 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
        }}
      >
        {/* 개인정보처리자 */}
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
            [ 개인정보처리자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: "6px 0", width: "100px", color: "#6b7280" }}
                >
                  상호
                </td>
                <td style={{ padding: "6px 0", fontWeight: 500 }}>
                  {consent.company.name}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>
                  사업자번호
                </td>
                <td style={{ padding: "6px 0" }}>
                  {formatBusinessNumber(consent.company.businessNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>소재지</td>
                <td style={{ padding: "6px 0" }}>{consent.company.address}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", color: "#6b7280" }}>대표자</td>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>
                  {consent.company.ceoName}
                  <span style={{ color: "#9ca3af", marginLeft: "20px" }}>
                    (서명 또는 인)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 정보주체 */}
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
            [ 정보주체 (근로자) ]
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
                  {consent.employee.name}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>
                  주민등록번호
                </td>
                <td style={{ padding: "6px 0" }}>
                  {formatResidentNumber(consent.employee.residentNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>주소</td>
                <td style={{ padding: "6px 0" }}>{consent.employee.address}</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>연락처</td>
                <td style={{ padding: "6px 0" }}>{consent.employee.phone}</td>
              </tr>
              <tr>
                <td style={{ padding: "10px 0", color: "#6b7280" }}>서명</td>
                <td style={{ padding: "10px 0", fontWeight: 600 }}>
                  {consent.employee.name}
                  <span style={{ color: "#9ca3af", marginLeft: "20px" }}>
                    (서명 또는 인)
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
