"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, Employee } from "@/types";
import {
  formatDate,
  formatCurrency,
  formatResidentNumber,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import Breadcrumb from "@/components/Breadcrumb";

interface MonthSalary {
  year: number;
  month: number;
  totalPay: number;
  days: number;
  bonus: number;
}

interface RetirementData {
  company: CompanyInfo;
  employeeName: string;
  residentNumber: string;
  department: string;
  position: string;
  hireDate: string;
  resignDate: string;
  lastThreeMonths: MonthSalary[];
  paymentDate: string;
  bankName: string;
  accountNumber: string;
}

function createDefaultData(): RetirementData {
  const today = new Date();
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    residentNumber: "",
    department: "",
    position: "",
    hireDate: "",
    resignDate: "",
    lastThreeMonths: [
      {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        totalPay: 0,
        days: 30,
        bonus: 0,
      },
      {
        year: today.getFullYear(),
        month: today.getMonth(),
        totalPay: 0,
        days: 30,
        bonus: 0,
      },
      {
        year: today.getFullYear(),
        month: today.getMonth() - 1 || 12,
        totalPay: 0,
        days: 30,
        bonus: 0,
      },
    ],
    paymentDate: "",
    bankName: "",
    accountNumber: "",
  };
}

function calcTenureDays(hire: string, resign: string): number {
  if (!hire || !resign) return 0;
  const d1 = new Date(hire);
  const d2 = new Date(resign);
  return Math.max(
    0,
    Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export default function RetirementPayPage() {
  const [data, setData] = useState<RetirementData>(createDefaultData);
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
      docType: "retirement_pay",
      title: `퇴직금정산서 - ${data.employeeName || "이름없음"}`,
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
        department: emp.department || "",
        position: emp.position || "",
        hireDate: emp.hireDate || "",
        resignDate: emp.resignDate || "",
      }));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `퇴직금정산서_${data.employeeName || "이름없음"}`,
  });

  const updateMonth = (
    index: number,
    field: keyof MonthSalary,
    value: number,
  ) => {
    setData((prev) => {
      const months = [...prev.lastThreeMonths];
      months[index] = { ...months[index], [field]: value };
      return { ...prev, lastThreeMonths: months };
    });
  };

  // 계산
  const totalPay3m = data.lastThreeMonths.reduce(
    (s, m) => s + m.totalPay + m.bonus,
    0,
  );
  const totalDays3m = data.lastThreeMonths.reduce((s, m) => s + m.days, 0);
  const avgDailyWage = totalDays3m > 0 ? totalPay3m / totalDays3m : 0;
  const tenureDays = calcTenureDays(data.hireDate, data.resignDate);
  const isEligible = tenureDays >= 365;
  const retirementPay = isEligible ? avgDailyWage * 30 * (tenureDays / 365) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "급여/임금", href: "/documents" },
          { label: "퇴직금 정산서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            퇴직금 정산서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            근로자퇴직급여보장법에 따른 퇴직금 계산
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
            disabled={!data.employeeName || !isEligible}
          >
            인쇄/PDF
          </button>
        </div>
      </div>

      <HelpGuide
        pageKey="retirement-pay"
        steps={[
          "직원을 선택하면 입사일과 급여 정보가 자동 입력됩니다.",
          "퇴직일과 최근 3개월 급여를 입력하면 퇴직금이 자동 계산됩니다.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          <div className="form-section">
            <h2 className="form-section-title">퇴직자 정보</h2>
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
                      {emp.status === "resigned" ? "퇴사" : "재직"})
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
            </div>
            {tenureDays > 0 && (
              <div className="mt-4 p-3 bg-[var(--bg)] rounded-lg">
                <p className="text-sm">
                  총 재직일수: <strong>{tenureDays}일</strong> (
                  {Math.floor(tenureDays / 365)}년 {tenureDays % 365}일)
                </p>
                {tenureDays > 0 && tenureDays < 365 && (
                  <p className="text-sm text-red-500 mt-1 font-medium">
                    ⚠️ 1년 미만 근속 (퇴직급여보장법 제4조: 1년 이상 근속해야
                    퇴직금 수급권 발생). 인쇄가 차단됩니다.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <h2 className="form-section-title">
              최근 3개월 급여 (퇴직일 직전)
            </h2>
            <div className="space-y-4">
              {data.lastThreeMonths.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-[var(--bg)] rounded-lg"
                >
                  <div>
                    <label className="input-label">{i + 1}번째 월</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        className="input-field w-20"
                        value={m.year}
                        onChange={(e) =>
                          updateMonth(i, "year", parseInt(e.target.value) || 0)
                        }
                      />
                      <span className="self-center text-sm">년</span>
                      <input
                        type="number"
                        className="input-field w-16"
                        min={1}
                        max={12}
                        value={m.month}
                        onChange={(e) =>
                          updateMonth(i, "month", parseInt(e.target.value) || 0)
                        }
                      />
                      <span className="self-center text-sm">월</span>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">총 급여</label>
                    <input
                      type="number"
                      className="input-field"
                      value={m.totalPay || ""}
                      onChange={(e) =>
                        updateMonth(
                          i,
                          "totalPay",
                          parseInt(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">일수</label>
                    <input
                      type="number"
                      className="input-field"
                      value={m.days}
                      onChange={(e) =>
                        updateMonth(i, "days", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">상여금</label>
                    <input
                      type="number"
                      className="input-field"
                      value={m.bonus || ""}
                      onChange={(e) =>
                        updateMonth(i, "bonus", parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <label className="input-label">소계</label>
                    <p className="text-sm font-medium mt-2">
                      {formatCurrency(m.totalPay + m.bonus)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)]">3개월 급여 합계</p>
                  <p className="font-bold text-lg">
                    {formatCurrency(totalPay3m)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">3개월 총일수</p>
                  <p className="font-bold text-lg">{totalDays3m}일</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">1일 평균임금</p>
                  <p className="font-bold text-lg">
                    {formatCurrency(Math.round(avgDailyWage))}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)]">퇴직금 (예상)</p>
                  <p className="font-bold text-lg text-blue-700">
                    {formatCurrency(Math.round(retirementPay))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">지급 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">지급 예정일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.paymentDate}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      paymentDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="input-label">은행명</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="국민은행"
                  value={data.bankName}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">계좌번호</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="123-456-789012"
                  value={data.accountNumber}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      accountNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <div className="text-sm">
              <p className="font-medium">근로자퇴직급여보장법 제9조</p>
              <p className="opacity-80 mt-1">
                퇴직금은 퇴직한 날부터 14일 이내에 지급해야 합니다. 특별한
                사정이 있는 경우 당사자 간 합의에 따라 연장 가능합니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <RetirementPreview
            data={data}
            totalPay3m={totalPay3m}
            totalDays3m={totalDays3m}
            avgDailyWage={avgDailyWage}
            tenureDays={tenureDays}
            retirementPay={retirementPay}
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
          <RetirementPreview
            data={data}
            totalPay3m={totalPay3m}
            totalDays3m={totalDays3m}
            avgDailyWage={avgDailyWage}
            tenureDays={tenureDays}
            retirementPay={retirementPay}
          />
        </div>
      </div>
    </div>
  );
}

function RetirementPreview({
  data,
  totalPay3m,
  totalDays3m,
  avgDailyWage,
  tenureDays,
  retirementPay,
}: {
  data: RetirementData;
  totalPay3m: number;
  totalDays3m: number;
  avgDailyWage: number;
  tenureDays: number;
  retirementPay: number;
}) {
  const cellStyle = {
    border: "1px solid #333",
    padding: "10px 14px",
    verticalAlign: "middle" as const,
  };
  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#f3f4f6",
    fontWeight: 600,
    width: "120px",
    textAlign: "center" as const,
  };
  const numStyle = { ...cellStyle, textAlign: "right" as const };

  return (
    <div
      className="contract-document"
      style={{
        fontFamily: "'Nanum Gothic', sans-serif",
        color: "#111",
        lineHeight: 1.8,
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "28px",
          fontWeight: 700,
          letterSpacing: "8px",
          marginBottom: "40px",
        }}
      >
        퇴직금 정산서
      </h1>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        1. 퇴직자 인적사항
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
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
            <th style={headerStyle}>부 서</th>
            <td style={cellStyle}>{data.department}</td>
            <th style={headerStyle}>직 위</th>
            <td style={cellStyle}>{data.position}</td>
          </tr>
          <tr>
            <th style={headerStyle}>입 사 일</th>
            <td style={cellStyle}>{formatDate(data.hireDate)}</td>
            <th style={headerStyle}>퇴 사 일</th>
            <td style={cellStyle}>{formatDate(data.resignDate)}</td>
          </tr>
          <tr>
            <th style={headerStyle}>재직기간</th>
            <td colSpan={3} style={cellStyle}>
              <strong>{tenureDays}일</strong> ({Math.floor(tenureDays / 365)}년{" "}
              {tenureDays % 365}일)
            </td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        2. 퇴직금 산정 내역
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <thead>
          <tr>
            <th style={headerStyle}>구분</th>
            <th style={{ ...headerStyle, width: "auto" }}>기간</th>
            <th style={{ ...headerStyle, width: "120px" }}>급여</th>
            <th style={{ ...headerStyle, width: "60px" }}>일수</th>
            <th style={{ ...headerStyle, width: "120px" }}>상여금</th>
            <th style={{ ...headerStyle, width: "130px" }}>소계</th>
          </tr>
        </thead>
        <tbody>
          {data.lastThreeMonths.map((m, i) => (
            <tr key={i}>
              <td style={{ ...cellStyle, textAlign: "center" }}>{i + 1}월차</td>
              <td style={cellStyle}>
                {m.year}년 {m.month}월
              </td>
              <td style={numStyle}>{formatCurrency(m.totalPay)}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>{m.days}</td>
              <td style={numStyle}>{formatCurrency(m.bonus)}</td>
              <td style={numStyle}>{formatCurrency(m.totalPay + m.bonus)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2} style={{ ...cellStyle, textAlign: "center" }}>
              합계
            </td>
            <td style={numStyle}>
              {formatCurrency(
                data.lastThreeMonths.reduce((s, m) => s + m.totalPay, 0),
              )}
            </td>
            <td style={{ ...cellStyle, textAlign: "center" }}>{totalDays3m}</td>
            <td style={numStyle}>
              {formatCurrency(
                data.lastThreeMonths.reduce((s, m) => s + m.bonus, 0),
              )}
            </td>
            <td style={numStyle}>{formatCurrency(totalPay3m)}</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        3. 퇴직금 계산
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
        }}
      >
        <tbody>
          <tr>
            <th style={headerStyle}>1일 평균임금</th>
            <td style={cellStyle}>
              {formatCurrency(totalPay3m)} / {totalDays3m}일 ={" "}
              <strong>{formatCurrency(Math.round(avgDailyWage))}</strong>
            </td>
          </tr>
          <tr>
            <th style={headerStyle}>퇴직금 산식</th>
            <td style={cellStyle}>
              1일 평균임금 x 30일 x (재직일수 / 365)
              <br />= {formatCurrency(Math.round(avgDailyWage))} x 30 x (
              {tenureDays} / 365)
            </td>
          </tr>
          <tr style={{ backgroundColor: "#eff6ff" }}>
            <th style={{ ...headerStyle, fontSize: "16px" }}>퇴직금</th>
            <td
              style={{
                ...cellStyle,
                fontSize: "18px",
                fontWeight: 700,
                color: "#1e40af",
              }}
            >
              {formatCurrency(Math.round(retirementPay))}
            </td>
          </tr>
        </tbody>
      </table>

      {(data.bankName || data.accountNumber) && (
        <>
          <h2
            style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}
          >
            4. 지급 정보
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "24px",
            }}
          >
            <tbody>
              <tr>
                <th style={headerStyle}>지급예정일</th>
                <td style={cellStyle}>{formatDate(data.paymentDate)}</td>
              </tr>
              <tr>
                <th style={headerStyle}>입금 계좌</th>
                <td style={cellStyle}>
                  {data.bankName} {data.accountNumber}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <div
        style={{
          backgroundColor: "#fef3c7",
          padding: "12px 16px",
          borderRadius: "6px",
          fontSize: "13px",
          marginBottom: "32px",
        }}
      >
        <strong>근로자퇴직급여보장법 제9조:</strong> 퇴직금은 퇴직한 날부터 14일
        이내에 지급하여야 합니다.
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          fontWeight: 600,
          marginBottom: "40px",
        }}
      >
        {formatDate(data.resignDate || new Date().toISOString().split("T")[0])}
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
              marginBottom: "12px",
              borderBottom: "2px solid #333",
              paddingBottom: "8px",
            }}
          >
            [ 사용자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", color: "#555", width: "60px" }}>
                  상호
                </td>
                <td>{data.company.name}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: "#555" }}>대표</td>
                <td>
                  {data.company.ceoName}{" "}
                  <span style={{ color: "#999", marginLeft: "16px" }}>
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
              marginBottom: "12px",
              borderBottom: "2px solid #333",
              paddingBottom: "8px",
            }}
          >
            [ 퇴직자 ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", color: "#555", width: "60px" }}>
                  성명
                </td>
                <td>
                  {data.employeeName}{" "}
                  <span style={{ color: "#999", marginLeft: "16px" }}>
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
