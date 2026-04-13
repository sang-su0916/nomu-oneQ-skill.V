"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import MobileFixedBar from "@/components/MobileFixedBar";
import { formatDate } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import Breadcrumb from "@/components/Breadcrumb";

interface WarningData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  warningDate: string;
  warningType: string;
  incidentDate: string;
  incidentDescription: string;
  violatedRule: string;
  requiredAction: string;
  consequenceWarning: string;
  issueDate: string;
}

const warningTypes = [
  "근무태도 불량",
  "무단결근",
  "업무태만",
  "사내규정 위반",
  "직장 내 괴롭힘",
  "기타",
];

function createDefault(): WarningData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    warningDate: today,
    warningType: "근무태도 불량",
    incidentDate: today,
    incidentDescription: "",
    violatedRule: "",
    requiredAction: "",
    consequenceWarning:
      "향후 동일한 사안이 반복될 경우 취업규칙 및 관련 법규에 따라 징계 조치될 수 있음을 경고합니다.",
    issueDate: today,
  };
}

export default function WarningLetterPage() {
  const [data, setData] = useState<WarningData>(createDefault);
  const [showPreview, setShowPreview] = useState(false);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);

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
    documentTitle: `경고장_${data.employeeName || "이름없음"}`,
  });

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "warning_letter",
      title: `경고장 - ${data.employeeName} (${data.warningType})`,
      employeeId: selectedEmployeeId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "징계/해고", href: "/documents" },
          { label: "경고장" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">⚠️</span> 경고장
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        근로기준법 제23조에 따른 서면 경고
      </p>

      <HelpGuide
        pageKey="warning-letter"
        steps={[
          "직원을 선택하거나 직접 입력하세요.",
          "경고 사유와 위반 내용을 상세히 기록하세요.",
          "미리보기 후 인쇄하거나 보관함에 저장하세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          {/* 직원 선택 */}
          <div className="form-section">
            <h3 className="form-section-title">👤 대상 직원</h3>
            {employees.length > 0 && (
              <div className="mb-4">
                <label className="input-label">직원 선택</label>
                <select
                  className="input-field"
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

          {/* 경고 내용 */}
          <div className="form-section">
            <h3 className="form-section-title">📝 경고 내용</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">경고 유형</label>
                  <select
                    className="input-field"
                    value={data.warningType}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        warningType: e.target.value,
                      }))
                    }
                  >
                    {warningTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">사건 발생일</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.incidentDate}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        incidentDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="input-label">사건 상세 내용 *</label>
                <textarea
                  className="input-field min-h-[100px]"
                  value={data.incidentDescription}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      incidentDescription: e.target.value,
                    }))
                  }
                  placeholder="구체적인 사건 내용을 기술해주세요."
                />
              </div>
              <div>
                <label className="input-label">위반 규정</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.violatedRule}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      violatedRule: e.target.value,
                    }))
                  }
                  placeholder="예: 취업규칙 제12조 (근무시간 준수)"
                />
              </div>
              <div>
                <label className="input-label">시정 요구 사항</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.requiredAction}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      requiredAction: e.target.value,
                    }))
                  }
                  placeholder="향후 개선해야 할 행동을 기술해주세요."
                />
              </div>
              <div>
                <label className="input-label">경고 결과 안내</label>
                <textarea
                  className="input-field min-h-[60px]"
                  value={data.consequenceWarning}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      consequenceWarning: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              💡 입력을 완료한 후 <strong>미리보기</strong>를 누르면 인쇄·PDF
              저장·이메일 발송이 가능합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-primary hidden md:inline-flex"
              disabled={!data.employeeName || !data.incidentDescription}
            >
              미리보기 →
            </button>
          </div>
          <MobileFixedBar>
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-primary flex-1"
              disabled={!data.employeeName || !data.incidentDescription}
            >
              미리보기 →
            </button>
          </MobileFixedBar>
        </div>
      ) : (
        <div>
          <div className="flex gap-3 mb-6 no-print">
            <button
              onClick={() => setShowPreview(false)}
              className="btn btn-secondary"
            >
              ← 수정
            </button>
            <button onClick={handlePrint} className="btn btn-primary">
              🖨️ 인쇄
            </button>
            <button
              onClick={handleSaveToArchive}
              disabled={saving}
              className="btn btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
            <EmailSendButton
              documentTitle={`경고장 — ${data.employeeName || "미입력"}`}
              documentType="경고장"
              recipientName={data.employeeName}
              className="btn btn-secondary"
              printRef={printRef}
            />
          </div>

          <div
            ref={printRef}
            className="bg-[var(--bg-card)] p-10 max-w-[210mm] mx-auto shadow-sm border print:shadow-none print:border-none"
            style={{ fontFamily: "'Pretendard', sans-serif" }}
          >
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">
              경 고 장
            </h1>

            <div className="mb-6 text-sm">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-24 border-r border-[var(--border)]">
                      성 명
                    </td>
                    <td className="px-4 py-2 w-40 border-r border-[var(--border)]">
                      {data.employeeName}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-24 border-r border-[var(--border)]">
                      부 서
                    </td>
                    <td className="px-4 py-2">{data.department}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r border-[var(--border)]">
                      직 위
                    </td>
                    <td className="px-4 py-2 border-r border-[var(--border)]">
                      {data.position}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r border-[var(--border)]">
                      일 자
                    </td>
                    <td className="px-4 py-2">
                      {formatDate(data.warningDate)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6 text-sm leading-7">
              <p className="font-medium mb-2">
                ■ 경고 사유: {data.warningType}
              </p>
              <p className="font-medium mb-1">
                ■ 사건 발생일: {formatDate(data.incidentDate)}
              </p>
              <div className="mt-4 mb-4 p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
                <p className="font-medium mb-2">■ 사건 내용</p>
                <p className="whitespace-pre-wrap">
                  {data.incidentDescription}
                </p>
              </div>
              {data.violatedRule && (
                <p className="mb-2">■ 위반 규정: {data.violatedRule}</p>
              )}
              {data.requiredAction && (
                <div className="mb-4">
                  <p className="font-medium mb-1">■ 시정 요구 사항</p>
                  <p className="whitespace-pre-wrap">{data.requiredAction}</p>
                </div>
              )}
              <div className="mt-6 p-4 border-2 border-[var(--border)] rounded">
                <p className="font-bold">{data.consequenceWarning}</p>
              </div>

              <div
                className="mt-4 p-3 bg-[#f0f7ff] border border-[#bfdbfe] rounded text-xs"
                style={{ color: "#1e40af" }}
              >
                <p className="font-bold mb-1">■ 소명 기회 안내</p>
                <p>
                  귀하는 위 경고 사유에 대하여 본 경고장 수령일로부터{" "}
                  <strong>7일 이내</strong>에 서면으로 소명할 수 있습니다.
                  소명서는 인사담당 부서에 제출하시기 바랍니다.
                </p>
                <p className="mt-1 text-[10px]" style={{ color: "#3b82f6" }}>
                  ※ 소명 기회 부여는 취업규칙상 징계 절차의 적법성 확보를 위한
                  것입니다. 소명 없이 진행된 징계는 절차 위반에 해당할 수
                  있습니다.
                </p>
              </div>
            </div>

            <p className="text-center text-sm mb-12 mt-8">
              {formatDate(data.issueDate)}
            </p>

            <div className="text-center text-sm">
              <p className="font-bold text-lg mb-2">{data.company.name}</p>
              <p>대표이사 {data.company.ceoName} (인)</p>
              {data.company.address && (
                <p className="text-[var(--text-muted)] mt-1">
                  {data.company.address}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
