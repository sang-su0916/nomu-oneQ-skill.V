"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, Employee } from "@/types";
import {
  formatDate,
  formatBusinessNumber,
  formatResidentNumber,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import Breadcrumb from "@/components/Breadcrumb";

interface CareerCertData {
  company: CompanyInfo;
  employeeName: string;
  residentNumber: string;
  address: string;
  department: string;
  position: string;
  hireDate: string;
  resignDate: string;
  jobDuties: string;
  purpose: string;
  customPurpose: string;
  issueDate: string;
  documentNumber: string;
}

const purposes = ["이직용", "관공서 제출용", "기타"];

function createDefaultData(): CareerCertData {
  const today = new Date();
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    residentNumber: "",
    address: "",
    department: "",
    position: "",
    hireDate: "",
    resignDate: "",
    jobDuties: "",
    purpose: "이직용",
    customPurpose: "",
    issueDate: today.toISOString().split("T")[0],
    documentNumber: `제 ${today.getFullYear()}-001 호`,
  };
}

export default function CareerCertificatePage() {
  const [data, setData] = useState<CareerCertData>(createDefaultData);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees, loading: employeesLoading } = useEmployees();

  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "career_certificate",
      title: `경력증명서 - ${data.employeeName || "이름없음"}`,
      employeeId: selectedEmployeeId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      setData((prev) => ({
        ...prev,
        employeeName: emp.info.name,
        residentNumber: emp.info.residentNumber,
        address: emp.info.address,
        department: emp.department || "",
        position: emp.position || "",
        hireDate: emp.hireDate || "",
        resignDate: emp.resignDate || "",
      }));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `경력증명서_${data.employeeName || "이름없음"}`,
  });

  const displayPurpose =
    data.purpose === "기타" ? data.customPurpose : data.purpose;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "증명서", href: "/documents" },
          { label: "경력증명서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">경력증명서</h1>
          <p className="text-[var(--text-muted)] mt-1">
            근로기준법 제39조 - 사용증명서 발급 의무
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
            disabled={!data.employeeName}
          >
            인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="career-certificate"
        steps={[
          "직원을 선택하면 재직 기간과 직무 정보가 자동 입력됩니다.",
          "경력 사항(부서, 직급, 담당 업무)을 확인하고 수정하세요.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          <div className="form-section">
            <h2 className="form-section-title">발급 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">문서번호</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.documentNumber}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="input-label">발급일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.issueDate}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, issueDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">용도</label>
                <select
                  className="input-field"
                  value={data.purpose}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, purpose: e.target.value }))
                  }
                >
                  {purposes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              {data.purpose === "기타" && (
                <div>
                  <label className="input-label">기타 용도</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.customPurpose}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        customPurpose: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">대상 직원</h2>
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
                      {emp.info.name} (
                      {emp.status === "resigned" ? "퇴사" : "재직"} /{" "}
                      {emp.department || "부서없음"})
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
                  value={data.employeeName}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      employeeName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="input-label">주민등록번호</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="990101-1234567"
                  value={data.residentNumber}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      residentNumber: e.target.value
                        .replace(/[^0-9-]/g, "")
                        .slice(0, 14),
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">주소</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.address}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">부서</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.department}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, department: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">직위</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.position}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, position: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">입사일 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.hireDate}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, hireDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">퇴사일 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.resignDate}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, resignDate: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">담당 업무</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="담당했던 업무 내용을 입력하세요"
                  value={data.jobDuties}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, jobDuties: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <div className="text-sm">
              <p className="font-medium">근로기준법 제39조 (사용증명서)</p>
              <p className="opacity-80 mt-1">
                사용자는 근로자가 퇴직한 후에도 사용 기간, 업무 종류, 지위와
                임금, 그 밖에 필요한 사항에 관한 증명서를 청구하면 사실대로 적은
                증명서를 즉시 내주어야 합니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <CareerCertPreview data={data} purpose={displayPurpose} />
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
          <CareerCertPreview data={data} purpose={displayPurpose} />
        </div>
      </div>
    </div>
  );
}

function CareerCertPreview({
  data,
  purpose,
}: {
  data: CareerCertData;
  purpose: string;
}) {
  const cellStyle = {
    border: "1px solid #333",
    padding: "12px 16px",
    verticalAlign: "middle" as const,
  };
  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#f3f4f6",
    fontWeight: 600,
    width: "120px",
    textAlign: "center" as const,
  };

  return (
    <div
      className="contract-document"
      style={{
        fontFamily: "'Nanum Gothic', sans-serif",
        color: "#111",
        lineHeight: 1.8,
      }}
    >
      <p
        style={{
          textAlign: "right",
          fontSize: "13px",
          color: "#555",
          marginBottom: "8px",
        }}
      >
        {data.documentNumber}
      </p>

      <h1
        style={{
          textAlign: "center",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "12px",
          marginBottom: "40px",
        }}
      >
        경 력 증 명 서
      </h1>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "40px",
        }}
      >
        <tbody>
          <tr>
            <th style={headerStyle}>성 명</th>
            <td style={cellStyle}>{data.employeeName}</td>
            <th style={headerStyle}>주민등록번호</th>
            <td style={cellStyle}>
              {formatResidentNumber(data.residentNumber)}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>주 소</th>
            <td colSpan={3} style={cellStyle}>
              {data.address}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>소속 / 부서</th>
            <td style={cellStyle}>{data.department}</td>
            <th style={headerStyle}>직 위</th>
            <td style={cellStyle}>{data.position}</td>
          </tr>
          <tr>
            <th style={headerStyle}>재직기간</th>
            <td colSpan={3} style={cellStyle}>
              {formatDate(data.hireDate)} ~ {formatDate(data.resignDate)}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>담당 업무</th>
            <td colSpan={3} style={cellStyle}>
              {data.jobDuties}
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>용 도</th>
            <td colSpan={3} style={cellStyle}>
              {purpose}
            </td>
          </tr>
        </tbody>
      </table>

      <p
        style={{
          textAlign: "center",
          fontSize: "16px",
          lineHeight: 2,
          marginBottom: "60px",
        }}
      >
        위 사람이 위와 같이 당사에서 근무하였음을 증명합니다.
      </p>

      <p
        style={{
          textAlign: "center",
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "60px",
        }}
      >
        {formatDate(data.issueDate)}
      </p>

      <div style={{ maxWidth: "400px", margin: "0 auto", textAlign: "right" }}>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", color: "#555", width: "120px" }}>
                상 호
              </td>
              <td
                style={{ padding: "8px 0", fontWeight: 600, fontSize: "16px" }}
              >
                {data.company.name}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#555" }}>사업자번호</td>
              <td style={{ padding: "8px 0" }}>
                {formatBusinessNumber(data.company.businessNumber)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", color: "#555" }}>주 소</td>
              <td style={{ padding: "8px 0" }}>{data.company.address}</td>
            </tr>
            <tr>
              <td style={{ padding: "12px 0", color: "#555" }}>대 표 자</td>
              <td
                style={{ padding: "12px 0", fontWeight: 700, fontSize: "18px" }}
              >
                {data.company.ceoName}{" "}
                <span
                  style={{
                    color: "#999",
                    fontSize: "14px",
                    marginLeft: "16px",
                  }}
                >
                  (직인)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
