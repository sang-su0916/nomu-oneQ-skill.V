"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import { formatDate } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import {
  calculateAnnualLeave,
  type AnnualLeaveBase,
  type AnnualLeaveResult,
} from "@/lib/calculations/annual-leave";
import Breadcrumb from "@/components/Breadcrumb";

interface LeaveUsage {
  date: string;
  days: number;
  reason: string;
}

interface AnnualLeaveData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  hireDate: string;
  year: number;
  totalDays: number;
  usages: LeaveUsage[];
  leaveResult: AnnualLeaveResult | null;
}

function createDefaultData(): AnnualLeaveData {
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    hireDate: "",
    year: new Date().getFullYear(),
    totalDays: 15,
    usages: [],
    leaveResult: null,
  };
}

export default function AnnualLeavePage() {
  const [data, setData] = useState<AnnualLeaveData>(createDefaultData);
  const [showPreview, setShowPreview] = useState(false);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const { company } = useAuth();
  const employees = allEmployees.filter((e) => e.status === "active");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // 사업장 설정에서 연차 기산 기준 가져오기
  const basis: AnnualLeaveBase =
    (company?.annual_leave_base as AnnualLeaveBase) || "hire_date";

  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const recalcLeave = (hireDate: string, year: number) => {
    const result = calculateAnnualLeave(hireDate, year, basis);
    return result;
  };

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "annual_leave",
      title: `연차관리대장 - ${data.employeeName || "이름없음"} ${data.year}년`,
      employeeId: selectedEmployeeId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      const result = recalcLeave(emp.hireDate, data.year);
      setData((prev) => ({
        ...prev,
        employeeName: emp.info.name,
        department: emp.department || "",
        position: emp.position || "",
        hireDate: emp.hireDate || "",
        totalDays: result.totalDays,
        leaveResult: result,
      }));
    }
  };

  const addUsage = () => {
    setData((prev) => ({
      ...prev,
      usages: [...prev.usages, { date: "", days: 1, reason: "" }],
    }));
  };

  const removeUsage = (index: number) => {
    setData((prev) => ({
      ...prev,
      usages: prev.usages.filter((_, i) => i !== index),
    }));
  };

  const updateUsage = (
    index: number,
    field: keyof LeaveUsage,
    value: string | number,
  ) => {
    setData((prev) => {
      const usages = [...prev.usages];
      usages[index] = { ...usages[index], [field]: value };
      return { ...prev, usages };
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `연차관리대장_${data.employeeName}_${data.year}년`,
  });

  const usedDays = data.usages.reduce((s, u) => s + u.days, 0);
  const remainDays = data.totalDays - usedDays;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "근태/휴가", href: "/documents" },
          { label: "연차 관리대장" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            연차관리대장
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            근로기준법 제60조 - 연차유급휴가 관리
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
        pageKey="annual-leave"
        steps={[
          "직원을 선택하면 입사일 기준으로 연차가 자동 계산됩니다.",
          "기산 기준(입사일/회계연도)은 설정 페이지에서 변경할 수 있습니다.",
          '사용 내역을 입력하고 "미리보기" → "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {/* 기산 기준 표시 */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-sm font-medium">
            📋 기산 기준:{" "}
            {basis === "hire_date"
              ? "입사일 기준"
              : "회계연도 기준 (1/1~12/31)"}
          </span>
        </div>
        <a href="/settings" className="text-xs text-blue-600 hover:underline">
          변경 →
        </a>
      </div>

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          <div className="form-section">
            <h2 className="form-section-title">기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">관리 연도</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.year}
                  onChange={(e) => {
                    const y =
                      parseInt(e.target.value) || new Date().getFullYear();
                    const result = recalcLeave(data.hireDate, y);
                    setData((prev) => ({
                      ...prev,
                      year: y,
                      totalDays: result.totalDays,
                      leaveResult: result,
                    }));
                  }}
                />
              </div>
              {employees.length > 0 && (
                <div>
                  <label className="input-label">직원 선택</label>
                  <select
                    className="input-field"
                    value={selectedEmployeeId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                  >
                    <option value="">선택</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.info.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="input-label">성명</label>
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
                <label className="input-label">입사일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.hireDate}
                  onChange={(e) => {
                    const hd = e.target.value;
                    const result = recalcLeave(hd, data.year);
                    setData((prev) => ({
                      ...prev,
                      hireDate: hd,
                      totalDays: result.totalDays,
                      leaveResult: result,
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* 산정 근거 표시 */}
          {data.leaveResult && (
            <div className="p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)]">
              <h3 className="text-sm font-medium text-[var(--text)] mb-2">
                📐 산정 근거
              </h3>
              <div className="space-y-1 text-xs text-[var(--text-muted)]">
                <p>
                  <strong>적용 기간:</strong> {data.leaveResult.period}
                </p>
                <p>
                  <strong>근속년수:</strong> {data.leaveResult.serviceYears}년
                </p>
                <p>
                  <strong>산정 근거:</strong> {data.leaveResult.breakdown}
                </p>
              </div>
            </div>
          )}

          <div className="form-section">
            <h2 className="form-section-title">연차 현황</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-[var(--text-muted)]">발생일수</p>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    className="input-field w-20 text-center text-xl font-bold"
                    value={data.totalDays}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        totalDays: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                  <span className="text-lg">일</span>
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <p className="text-sm text-[var(--text-muted)]">사용일수</p>
                <p className="text-2xl font-bold text-amber-600">
                  {usedDays}일
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-[var(--text-muted)]">잔여일수</p>
                <p
                  className={`text-2xl font-bold ${remainDays <= 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {remainDays}일
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="form-section-title mb-0">연차 사용 내역</h2>
              <button onClick={addUsage} className="btn btn-primary btn-sm">
                + 사용 추가
              </button>
            </div>
            {data.usages.length === 0 ? (
              <p className="text-center text-[var(--text-light)] py-8">
                연차 사용 내역이 없습니다. &quot;+ 사용 추가&quot; 버튼을 눌러
                추가하세요.
              </p>
            ) : (
              <div className="space-y-3">
                {data.usages.map((usage, i) => {
                  const remaining =
                    data.totalDays -
                    data.usages.slice(0, i + 1).reduce((s, u) => s + u.days, 0);
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 items-end p-3 bg-[var(--bg)] rounded-lg"
                    >
                      <div className="col-span-3">
                        <label className="input-label">사용일자</label>
                        <input
                          type="date"
                          className="input-field text-sm"
                          value={usage.date}
                          onChange={(e) =>
                            updateUsage(i, "date", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="input-label">일수</label>
                        <input
                          type="number"
                          className="input-field text-sm"
                          min={0.5}
                          step={0.5}
                          value={usage.days}
                          onChange={(e) =>
                            updateUsage(
                              i,
                              "days",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="input-label">사유</label>
                        <input
                          type="text"
                          className="input-field text-sm"
                          placeholder="개인 사유"
                          value={usage.reason}
                          onChange={(e) =>
                            updateUsage(i, "reason", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        <label className="input-label">잔여</label>
                        <p
                          className={`text-sm font-bold ${remaining <= 0 ? "text-red-600" : ""}`}
                        >
                          {remaining}일
                        </p>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeUsage(i)}
                          className="btn btn-ghost btn-sm text-red-500"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <AnnualLeavePreview
            data={data}
            usedDays={usedDays}
            remainDays={remainDays}
            basis={basis}
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
          <AnnualLeavePreview
            data={data}
            usedDays={usedDays}
            remainDays={remainDays}
            basis={basis}
          />
        </div>
      </div>
    </div>
  );
}

function AnnualLeavePreview({
  data,
  usedDays,
  remainDays,
  basis,
}: {
  data: AnnualLeaveData;
  usedDays: number;
  remainDays: number;
  basis: AnnualLeaveBase;
}) {
  const thStyle = {
    border: "1px solid #333",
    padding: "8px 12px",
    backgroundColor: "#f3f4f6",
    fontWeight: 600,
    fontSize: "13px",
    textAlign: "center" as const,
  };
  const tdStyle = {
    border: "1px solid #333",
    padding: "8px 12px",
    fontSize: "13px",
  };

  return (
    <div
      style={{
        fontFamily: "'Nanum Gothic', sans-serif",
        color: "#111",
        lineHeight: 1.8,
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "8px",
          marginBottom: "24px",
        }}
      >
        연 차 관 리 대 장
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          fontSize: "14px",
        }}
      >
        <span>
          <strong>관리기간:</strong>{" "}
          {data.leaveResult?.period || `${data.year}년`}
        </span>
        <span>
          <strong>사업장:</strong> {data.company.name}
        </span>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <tbody>
          <tr>
            <th style={{ ...thStyle, width: "100px" }}>성 명</th>
            <td style={tdStyle}>{data.employeeName}</td>
            <th style={{ ...thStyle, width: "100px" }}>부 서</th>
            <td style={tdStyle}>{data.department}</td>
          </tr>
          <tr>
            <th style={thStyle}>입사일</th>
            <td style={tdStyle}>{formatDate(data.hireDate)}</td>
            <th style={thStyle}>직 위</th>
            <td style={tdStyle}>{data.position}</td>
          </tr>
          <tr>
            <th style={thStyle}>기산기준</th>
            <td colSpan={3} style={tdStyle}>
              {basis === "hire_date"
                ? "입사일 기준"
                : "회계연도 기준 (1/1~12/31)"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 산정 근거 */}
      {data.leaveResult && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            backgroundColor: "#f0f4ff",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#374151",
          }}
        >
          <strong>산정근거:</strong> {data.leaveResult.breakdown}
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <tbody>
          <tr>
            <th style={thStyle}>발생일수</th>
            <th style={thStyle}>사용일수</th>
            <th style={thStyle}>잔여일수</th>
          </tr>
          <tr>
            <td
              style={{
                ...tdStyle,
                textAlign: "center",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {data.totalDays}일
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "center",
                fontSize: "18px",
                fontWeight: 700,
                color: "#d97706",
              }}
            >
              {usedDays}일
            </td>
            <td
              style={{
                ...tdStyle,
                textAlign: "center",
                fontSize: "18px",
                fontWeight: 700,
                color: remainDays <= 0 ? "#dc2626" : "#059669",
              }}
            >
              {remainDays}일
            </td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        사용 내역
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "32px",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...thStyle, width: "40px" }}>No.</th>
            <th style={thStyle}>사용일자</th>
            <th style={{ ...thStyle, width: "60px" }}>일수</th>
            <th style={thStyle}>사유</th>
            <th style={{ ...thStyle, width: "70px" }}>잔여</th>
          </tr>
        </thead>
        <tbody>
          {data.usages.length > 0 ? (
            data.usages.map((u, i) => {
              const rem =
                data.totalDays -
                data.usages.slice(0, i + 1).reduce((s, uu) => s + uu.days, 0);
              return (
                <tr key={i}>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{i + 1}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {formatDate(u.date)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>{u.days}</td>
                  <td style={tdStyle}>{u.reason}</td>
                  <td
                    style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}
                  >
                    {rem}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={5}
                style={{ ...tdStyle, textAlign: "center", color: "#999" }}
              >
                사용 내역 없음
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "32px" }}>
        <p>
          * 근로기준법 제60조에 따라{" "}
          {basis === "hire_date" ? "입사일" : "회계연도"} 기준으로
          연차유급휴가를 산정합니다.
        </p>
        <p>* 제60조 ②항: 1년 미만 근로자 — 1개월 개근 시 1일 (최대 11일)</p>
        <p>* 제60조 ①항: 1년 이상 80% 출근 — 15일</p>
        <p>
          * 제60조 ④항: 3년 이상 근속 — 최초 1년 초과 매 2년마다 1일 가산 (최대
          25일)
        </p>
        {basis === "fiscal_year" && (
          <p>
            * 회계연도 기준 적용 시 입사일 기준보다 불리하지 않도록 유리한
            조건이 자동 적용됩니다.
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "40px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", marginBottom: "40px" }}>
            확인자 (대표)
          </p>
          <div
            style={{
              borderBottom: "1px solid #333",
              width: "200px",
              margin: "0 auto",
            }}
          ></div>
          <p style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
            {data.company.ceoName}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", marginBottom: "40px" }}>근로자</p>
          <div
            style={{
              borderBottom: "1px solid #333",
              width: "200px",
              margin: "0 auto",
            }}
          ></div>
          <p style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
            {data.employeeName}
          </p>
        </div>
      </div>
    </div>
  );
}
