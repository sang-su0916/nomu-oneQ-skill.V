"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import { formatDate } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import Breadcrumb from "@/components/Breadcrumb";

interface NoticeData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  noticeType: "1st" | "2nd";
  year: number;
  totalDays: number;
  usedDays: number;
  remainDays: number;
  deadline: string;
  noticeDate: string;
  plannedDates: string;
}

function createDefaultData(): NoticeData {
  const today = new Date();
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    noticeType: "1st",
    year: today.getFullYear(),
    totalDays: 15,
    usedDays: 0,
    remainDays: 15,
    deadline: "",
    noticeDate: today.toISOString().split("T")[0],
    plannedDates: "",
  };
}

export default function AnnualLeaveNoticePage() {
  const [data, setData] = useState<NoticeData>(createDefaultData);
  const [showPreview, setShowPreview] = useState(false);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "annual_leave_notice",
      title: `연차촉진통보서 - ${data.employeeName || "이름없음"} (${data.noticeType === "1st" ? "1차" : "2차"})`,
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
        department: emp.department || "",
        position: emp.position || "",
      }));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `연차사용촉진통보서_${data.employeeName}_${data.noticeType === "1st" ? "1차" : "2차"}`,
  });

  const updateRemain = (total: number, used: number) => {
    setData((prev) => ({
      ...prev,
      totalDays: total,
      usedDays: used,
      remainDays: total - used,
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "근태/휴가", href: "/documents" },
          { label: "연차 촉진 통보서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            연차사용 촉진 통보서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            근로기준법 제61조 - 미사용 연차수당 지급 면제 요건
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
          {showPreview && (
            <EmailSendButton
              documentTitle={`연차촉진통보서 — ${data.employeeName || "미입력"}`}
              documentType="연차촉진통보서"
              recipientName={data.employeeName}
              className="btn btn-secondary"
              printRef={printRef}
            />
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
        pageKey="annual-leave-notice"
        steps={[
          "직원을 선택하고 미사용 연차 일수를 입력하세요.",
          "사용 촉진 기간과 통보일을 설정하세요.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6 animate-fade-in">
          <div className="form-section">
            <h2 className="form-section-title">통보 유형</h2>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${data.noticeType === "1st" ? "border-blue-500 bg-blue-50" : "border-[var(--border)]"}`}
              >
                <input
                  type="radio"
                  name="noticeType"
                  checked={data.noticeType === "1st"}
                  onChange={() =>
                    setData((prev) => ({ ...prev, noticeType: "1st" }))
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium">1차 촉진 (만료 6개월 전)</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    미사용 연차 통보 + 사용 시기 지정 요청
                  </p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${data.noticeType === "2nd" ? "border-orange-500 bg-orange-50" : "border-[var(--border)]"}`}
              >
                <input
                  type="radio"
                  name="noticeType"
                  checked={data.noticeType === "2nd"}
                  onChange={() =>
                    setData((prev) => ({ ...prev, noticeType: "2nd" }))
                  }
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium">2차 촉진 (만료 2개월 전)</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    미사용 시 사용자가 시기 지정
                  </p>
                </div>
              </label>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-xs font-semibold text-indigo-800 mb-1">
                📌 1차 vs 2차 촉진의 법적 차이 (근로기준법 제61조)
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-indigo-700">
                <div>
                  <p className="font-semibold">1차 (만료 6개월 전)</p>
                  <p>
                    근로자에게 미사용 연차 사용시기를{" "}
                    <strong>자율적으로 제출</strong>하도록 촉구. 10일 이내
                    미제출 시 → 2차 진행.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">2차 (만료 2개월 전)</p>
                  <p>
                    사용자가 <strong>일방적으로 사용시기를 지정</strong>할 수
                    있음. 이 절차까지 이행하면 미사용 연차에 대한{" "}
                    <strong>보상 의무 면제</strong>.
                  </p>
                </div>
              </div>
              <p className="text-xs text-indigo-600 mt-2">
                ※ 1차·2차 모두 이행해야 보상의무가 면제됩니다. 1차만으로는 면제
                불가.
              </p>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">대상 근로자</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">연차 현황</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">대상 연도</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.year}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      year:
                        parseInt(e.target.value) || new Date().getFullYear(),
                    }))
                  }
                />
              </div>
              <div>
                <label className="input-label">발생일수</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.totalDays}
                  onChange={(e) =>
                    updateRemain(parseInt(e.target.value) || 0, data.usedDays)
                  }
                />
              </div>
              <div>
                <label className="input-label">사용일수</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.usedDays}
                  onChange={(e) =>
                    updateRemain(data.totalDays, parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className="input-label">잔여일수</label>
                <input
                  type="number"
                  className="input-field bg-[var(--bg)]"
                  value={data.remainDays}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">통보 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">통보일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.noticeDate}
                  onChange={(e) => {
                    const noticeDate = e.target.value;
                    setData((prev) => {
                      const next = { ...prev, noticeDate };
                      // 1차 촉진: 통보일 + 10일 자동계산
                      if (prev.noticeType === "1st" && noticeDate) {
                        const d = new Date(noticeDate);
                        d.setDate(d.getDate() + 10);
                        next.deadline = d.toISOString().split("T")[0];
                      }
                      return next;
                    });
                  }}
                />
              </div>
              <div>
                <label className="input-label">사용 시기 지정 기한</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.deadline}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, deadline: e.target.value }))
                  }
                />
                <p className="text-xs text-[var(--text-light)] mt-1">
                  {data.noticeType === "1st"
                    ? "통보일로부터 10일 이내 (자동계산됨)"
                    : "연차 만료 전까지"}
                </p>
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <div className="text-sm">
              <p className="font-medium">
                근로기준법 제61조 (연차유급휴가의 사용 촉진)
              </p>
              <p className="opacity-80 mt-1">
                사용자가 제60조에 따른 연차유급휴가의 사용을 촉진하기 위하여
                다음의 조치를 하였음에도 근로자가 휴가를 사용하지 아니하여
                소멸된 경우에는 사용자는 그 미사용 휴가에 대하여 보상할 의무가
                없습니다.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8 animate-fade-in">
          <NoticePreview data={data} />
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
          <NoticePreview data={data} />
        </div>
      </div>
    </div>
  );
}

function NoticePreview({ data }: { data: NoticeData }) {
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
  const is1st = data.noticeType === "1st";

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
          fontSize: "24px",
          fontWeight: 700,
          letterSpacing: "4px",
          marginBottom: "8px",
        }}
      >
        연차유급휴가 사용 촉진 통보서
      </h1>
      <p style={{ textAlign: "center", marginBottom: "32px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 16px",
            borderRadius: "4px",
            fontWeight: 600,
            fontSize: "14px",
            backgroundColor: is1st ? "#dbeafe" : "#ffedd5",
            color: is1st ? "#1e40af" : "#c2410c",
          }}
        >
          {is1st ? "1차 촉진 (만료 6개월 전)" : "2차 촉진 (만료 2개월 전)"}
        </span>
      </p>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        1. 대상 근로자
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <tbody>
          <tr>
            <th style={headerStyle}>성 명</th>
            <td style={cellStyle}>{data.employeeName}</td>
            <th style={headerStyle}>소 속</th>
            <td style={cellStyle}>{data.department}</td>
          </tr>
          <tr>
            <th style={headerStyle}>직 위</th>
            <td style={cellStyle}>{data.position}</td>
            <th style={headerStyle}>대상연도</th>
            <td style={cellStyle}>{data.year}년</td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        2. 연차유급휴가 현황
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "20px",
        }}
      >
        <thead>
          <tr>
            <th style={headerStyle}>발생일수</th>
            <th style={headerStyle}>사용일수</th>
            <th style={headerStyle}>잔여일수 (미사용)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              style={{
                ...cellStyle,
                textAlign: "center",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              {data.totalDays}일
            </td>
            <td
              style={{
                ...cellStyle,
                textAlign: "center",
                fontSize: "16px",
                fontWeight: 700,
              }}
            >
              {data.usedDays}일
            </td>
            <td
              style={{
                ...cellStyle,
                textAlign: "center",
                fontSize: "16px",
                fontWeight: 700,
                color: "#dc2626",
              }}
            >
              {data.remainDays}일
            </td>
          </tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}>
        3. 촉진 내용
      </h2>
      <div
        style={{
          border: "2px solid #333",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          backgroundColor: "#fafafa",
        }}
      >
        {is1st ? (
          <div style={{ fontSize: "14px" }}>
            <p style={{ marginBottom: "12px" }}>
              근로기준법 제61조제1항제1호에 의거하여, 귀하의 미사용
              연차유급휴가가 <strong>{data.remainDays}일</strong> 남아있음을
              알려드립니다.
            </p>
            <p style={{ marginBottom: "12px" }}>
              귀하는 <strong>{formatDate(data.deadline)}</strong>까지 미사용
              연차유급휴가의 사용 시기를 정하여 서면으로 통보하여 주시기
              바랍니다.
            </p>
            <p style={{ color: "#dc2626", fontWeight: 600 }}>
              위 기한까지 사용 시기를 정하여 통보하지 아니한 경우, 사용자가
              미사용 연차의 사용 시기를 지정하여 통보할 수 있으며, 이 경우
              미사용 연차수당 지급 의무가 면제될 수 있습니다.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: "14px" }}>
            <p style={{ marginBottom: "12px" }}>
              근로기준법 제61조제1항제2호에 의거하여, 1차 촉진에도 불구하고
              귀하가 사용 시기를 정하지 아니한 미사용 연차유급휴가{" "}
              <strong>{data.remainDays}일</strong>에 대하여 사용자가 아래와 같이
              사용 시기를 지정합니다.
            </p>
            <p style={{ color: "#dc2626", fontWeight: 600 }}>
              지정된 시기에 연차를 사용하지 않을 경우, 미사용 연차는 소멸되며
              미사용 연차수당 지급 의무가 면제됩니다.
            </p>
          </div>
        )}
      </div>

      {is1st && (
        <>
          <h2
            style={{ fontSize: "15px", fontWeight: 700, marginBottom: "12px" }}
          >
            4. 근로자 사용 계획 (근로자 기재)
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "20px",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...headerStyle, width: "40px" }}>No.</th>
                <th style={headerStyle}>사용 예정일</th>
                <th style={{ ...headerStyle, width: "60px" }}>일수</th>
                <th style={headerStyle}>비고</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(data.remainDays, 10) }, (_, i) => (
                <tr key={i}>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{i + 1}</td>
                  <td style={{ ...cellStyle, height: "32px" }}>
                    {data.plannedDates || ""}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}></td>
                  <td style={cellStyle}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div
        style={{
          backgroundColor: "#fef3c7",
          padding: "12px 16px",
          borderRadius: "6px",
          fontSize: "12px",
          marginBottom: "32px",
        }}
      >
        <strong>근거법령:</strong> 근로기준법 제61조 (연차유급휴가의 사용 촉진)
        <br />
        사용자가 촉진 조치를 하였음에도 근로자가 사용하지 아니한 연차유급휴가에
        대하여는 보상 의무 면제
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "15px",
          fontWeight: 600,
          marginBottom: "40px",
        }}
      >
        {formatDate(data.noticeDate)}
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
            [ 사용자 (통보인) ]
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
            [ 근로자 (수신인) ]
          </p>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", color: "#555", width: "60px" }}>
                  소속
                </td>
                <td>
                  {data.department} / {data.position}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: "#555" }}>성명</td>
                <td>
                  {data.employeeName}{" "}
                  <span style={{ color: "#999", marginLeft: "16px" }}>
                    (수령 확인 서명)
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
