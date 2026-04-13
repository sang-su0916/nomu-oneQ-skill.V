"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, EmployeeInfo } from "@/types";
import { formatDate, formatBusinessNumber } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import Breadcrumb from "@/components/Breadcrumb";

interface NdaData {
  company: CompanyInfo;
  employee: EmployeeInfo;
  department: string;
  position: string;
  effectiveDate: string;
  includeNonCompete: boolean;
  nonCompetePeriod: number;
  confidentialityPeriod: number;
}

const defaultEmployee: EmployeeInfo = {
  name: "",
  residentNumber: "",
  address: "",
  phone: "",
};

function createDefaultNda(): NdaData {
  return {
    company: defaultCompanyInfo,
    employee: defaultEmployee,
    department: "",
    position: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    includeNonCompete: false,
    nonCompetePeriod: 2,
    confidentialityPeriod: 2,
  };
}

export default function NdaPage() {
  const [nda, setNda] = useState<NdaData>(createDefaultNda);
  const [showPreview, setShowPreview] = useState(false);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    setNda((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "nda",
      title: `비밀유지서약서 - ${nda.employee.name || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: nda as unknown as Record<string, unknown>,
    });
  };

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setNda((prev) => ({
        ...prev,
        employee: emp.info,
        department: emp.department || "",
        position: emp.position || "",
      }));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `비밀유지서약서_${nda.employee.name || "이름없음"}`,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "동의/서약", href: "/documents" },
          { label: "비밀유지서약서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            비밀유지 서약서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            영업비밀 및 기밀정보 보호를 위한 서약서
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
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
          )}
          <button
            onClick={() => handlePrint()}
            className="btn btn-primary"
            disabled={!nda.employee.name}
          >
            인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="nda"
        steps={[
          "직원을 선택하면 기본 정보가 자동 입력됩니다.",
          "비밀유지 의무 기간과 위약금 조항을 확인하세요.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          <div className="form-section">
            <h2 className="form-section-title">회사 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">회사명</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={nda.company.name}
                  readOnly
                />
              </div>
              <div>
                <label className="input-label">대표자</label>
                <input
                  type="text"
                  className="input-field bg-[var(--bg)]"
                  value={nda.company.ceoName}
                  readOnly
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-light)] mt-2">
              * 회사 정보는 설정에서 수정할 수 있습니다.
            </p>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">서약자 정보</h2>
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
                      {emp.info.name} ({emp.department || "부서없음"})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">성명 *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="홍길동"
                  value={nda.employee.name}
                  onChange={(e) =>
                    setNda((prev) => ({
                      ...prev,
                      employee: { ...prev.employee, name: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="input-label">부서</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="경영지원팀"
                  value={nda.department}
                  onChange={(e) =>
                    setNda((prev) => ({ ...prev, department: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">직위</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="대리"
                  value={nda.position}
                  onChange={(e) =>
                    setNda((prev) => ({ ...prev, position: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">서약 일자 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={nda.effectiveDate}
                  onChange={(e) =>
                    setNda((prev) => ({
                      ...prev,
                      effectiveDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">추가 조항</h2>
            <div className="space-y-4">
              <div>
                <label className="input-label">
                  퇴직 후 비밀유지 기간 (년)
                </label>
                <select
                  className="input-field w-32"
                  value={nda.confidentialityPeriod}
                  onChange={(e) =>
                    setNda((prev) => ({
                      ...prev,
                      confidentialityPeriod: parseInt(e.target.value),
                    }))
                  }
                >
                  <option value={1}>1년</option>
                  <option value={2}>2년</option>
                  <option value={3}>3년</option>
                  <option value={5}>5년</option>
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-[var(--bg)] rounded-lg border">
                <input
                  type="checkbox"
                  checked={nda.includeNonCompete}
                  className="w-5 h-5 mt-0.5"
                  onChange={(e) =>
                    setNda((prev) => ({
                      ...prev,
                      includeNonCompete: e.target.checked,
                    }))
                  }
                />
                <div>
                  <span className="font-medium">경업금지 조항 포함</span>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    퇴직 후 동종 업계 취업 제한 (부정경쟁방지법 제2조)
                  </p>
                </div>
              </label>
              {nda.includeNonCompete && (
                <div className="ml-8">
                  <label className="input-label">경업금지 기간 (년)</label>
                  <select
                    className="input-field w-32"
                    value={nda.nonCompetePeriod}
                    onChange={(e) =>
                      setNda((prev) => ({
                        ...prev,
                        nonCompetePeriod: parseInt(e.target.value),
                      }))
                    }
                  >
                    <option value={1}>1년</option>
                    <option value={2}>2년</option>
                  </select>
                  <p className="text-xs text-[var(--text-light)] mt-1">
                    판례상 2년 이내가 적정
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <NdaPreview nda={nda} />
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
          <NdaPreview nda={nda} />
        </div>
      </div>
    </div>
  );
}

function NdaPreview({ nda }: { nda: NdaData }) {
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

  return (
    <div
      className="contract-document"
      style={{
        fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif",
        color: "#1f2937",
        lineHeight: 1.8,
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: "32px",
          borderBottom: "3px solid #1e3a5f",
          paddingBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1e3a5f",
            letterSpacing: "6px",
          }}
        >
          비 밀 유 지 서 약 서
        </h1>
      </div>

      <p style={{ fontSize: "14px", marginBottom: "24px", lineHeight: 1.8 }}>
        본인은 <strong>{nda.company.name}</strong> (이하 &quot;회사&quot;)에
        입사함에 있어, 회사의 영업비밀 및 기밀정보의 보호를 위하여 다음 사항을
        성실히 준수할 것을 서약합니다.
      </p>

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "24px",
          marginBottom: "12px",
          color: "#1e3a5f",
        }}
      >
        제1조 (비밀정보의 정의)
      </h2>
      <p style={{ fontSize: "14px", marginBottom: "8px" }}>
        본 서약서에서 &quot;비밀정보&quot;란 다음 각 호의 정보를 말합니다.
      </p>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <tbody>
          <tr>
            <th style={headerStyle}>영업비밀</th>
            <td style={cellStyle}>
              고객 명단, 거래 조건, 가격 정보, 매출 데이터, 마케팅 전략 등
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>기술정보</th>
            <td style={cellStyle}>
              제품 설계, 개발 기술, 소프트웨어 소스코드, 특허 출원 전 기술 등
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>경영정보</th>
            <td style={cellStyle}>
              경영 계획, 재무 정보, 인사 정보, 조직 개편 계획 등
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>고객정보</th>
            <td style={cellStyle}>고객 개인정보, 고객사 정보, 계약 내용 등</td>
          </tr>
        </tbody>
      </table>

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "24px",
          marginBottom: "12px",
          color: "#1e3a5f",
        }}
      >
        제2조 (비밀유지 의무)
      </h2>
      <div style={{ fontSize: "14px", marginBottom: "16px" }}>
        <p style={{ marginBottom: "6px" }}>
          1. 본인은 재직 중 업무상 알게 된 회사의 비밀정보를 회사의 사전 서면
          동의 없이 외부에 누설하거나 업무 외의 목적으로 사용하지 않겠습니다.
        </p>
        <p style={{ marginBottom: "6px" }}>
          2. 비밀정보가 포함된 자료를 회사의 허가 없이 복사, 복제, 전송 또는
          외부로 반출하지 않겠습니다.
        </p>
        <p style={{ marginBottom: "6px" }}>
          3. 업무상 불가피하게 비밀정보를 공유해야 하는 경우, 사전에 소속
          부서장의 승인을 받겠습니다.
        </p>
        <p>
          4. 비밀정보의 분실, 도난, 유출 사실을 인지한 경우 즉시 회사에
          보고하겠습니다.
        </p>
      </div>

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "24px",
          marginBottom: "12px",
          color: "#1e3a5f",
        }}
      >
        제3조 (퇴직 후 의무)
      </h2>
      <div style={{ fontSize: "14px", marginBottom: "16px" }}>
        <p style={{ marginBottom: "6px" }}>
          1. 퇴직 후에도 <strong>{nda.confidentialityPeriod}년간</strong>{" "}
          비밀유지 의무를 준수하겠습니다.
        </p>
        <p>
          2. 퇴직 시 회사의 비밀정보가 포함된 모든 자료(문서, 전자파일, 복사본
          등)를 회사에 반환하거나 폐기하겠습니다.
        </p>
      </div>

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "24px",
          marginBottom: "12px",
          color: "#1e3a5f",
        }}
      >
        제4조 (비밀정보 반환)
      </h2>
      <p style={{ fontSize: "14px", marginBottom: "16px" }}>
        본인은 퇴직 또는 회사의 요청이 있을 경우, 업무상 보유하고 있는 비밀정보
        관련 일체의 자료(원본 및 사본, 전자적 기록 포함)를 지체 없이 회사에
        반환하며, 개인적으로 보관하고 있는 사본이 있을 경우 이를 완전히
        삭제·폐기하겠습니다.
      </p>

      <h2
        style={{
          fontSize: "15px",
          fontWeight: 700,
          marginTop: "24px",
          marginBottom: "12px",
          color: "#1e3a5f",
        }}
      >
        제5조 (손해배상)
      </h2>
      <p style={{ fontSize: "14px", marginBottom: "16px" }}>
        본인이 본 서약서를 위반하여 회사에 손해를 끼친 경우, 부정경쟁방지 및
        영업비밀보호에 관한 법률 등 관계 법령에 따라 민·형사상 책임을 지며,
        회사가 입은 손해를 배상할 것을 약속합니다.
      </p>

      {nda.includeNonCompete && (
        <>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 700,
              marginTop: "24px",
              marginBottom: "12px",
              color: "#1e3a5f",
            }}
          >
            제6조 (경업금지)
          </h2>
          <div style={{ fontSize: "14px", marginBottom: "16px" }}>
            <p style={{ marginBottom: "6px" }}>
              1. 본인은 퇴직 후 <strong>{nda.nonCompetePeriod}년간</strong>{" "}
              회사와 동종 또는 유사한 업종의 사업체에 취업하거나, 직접 동종
              업종의 사업을 영위하지 않을 것을 약속합니다.
            </p>
            <p style={{ color: "#6b7280", fontSize: "13px" }}>
              ※ 본 조항은 부정경쟁방지 및 영업비밀보호에 관한 법률 제2조에
              근거하며, 판례상 합리적 범위 내에서 유효합니다.
            </p>
          </div>
        </>
      )}

      <p style={{ fontSize: "14px", marginBottom: "8px", marginTop: "24px" }}>
        본인은 위의 내용을 충분히 이해하고, 이를 성실히 이행할 것을 서약합니다.
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          fontWeight: 600,
          margin: "40px 0",
        }}
      >
        {formatDate(nda.effectiveDate)}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
        }}
      >
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
              color: "#1e3a5f",
              marginBottom: "16px",
              borderBottom: "2px solid #1e3a5f",
              paddingBottom: "8px",
            }}
          >
            [ 회 사 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: "6px 0", width: "80px", color: "#6b7280" }}
                >
                  상호
                </td>
                <td style={{ padding: "6px 0", fontWeight: 500 }}>
                  {nda.company.name}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>
                  사업자번호
                </td>
                <td style={{ padding: "6px 0" }}>
                  {formatBusinessNumber(nda.company.businessNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>대표자</td>
                <td style={{ padding: "6px 0", fontWeight: 600 }}>
                  {nda.company.ceoName}{" "}
                  <span style={{ color: "#9ca3af", marginLeft: "20px" }}>
                    (인)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
              color: "#1e3a5f",
              marginBottom: "16px",
              borderBottom: "2px solid #1e3a5f",
              paddingBottom: "8px",
            }}
          >
            [ 서약자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td
                  style={{ padding: "6px 0", width: "80px", color: "#6b7280" }}
                >
                  소속
                </td>
                <td style={{ padding: "6px 0" }}>{nda.department}</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>직위</td>
                <td style={{ padding: "6px 0" }}>{nda.position}</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#6b7280" }}>성명</td>
                <td style={{ padding: "6px 0", fontWeight: 600 }}>
                  {nda.employee.name}{" "}
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
