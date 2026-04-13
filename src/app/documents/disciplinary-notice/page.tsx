"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, Employee } from "@/types";
import { formatDate } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import Breadcrumb from "@/components/Breadcrumb";

interface DisciplinaryData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  disciplinaryType: string;
  disciplinaryLevel: string;
  reason: string;
  relatedIncidents: string;
  effectiveDate: string;
  duration: string;
  committeeDate: string;
  appealInfo: string;
  issueDate: string;
}

const disciplinaryTypes = ["서면경고", "감봉", "정직", "강등", "해고"];
const levels = ["경징계", "중징계"];

function createDefault(): DisciplinaryData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    disciplinaryType: "서면경고",
    disciplinaryLevel: "경징계",
    reason: "",
    relatedIncidents: "",
    effectiveDate: today,
    duration: "",
    committeeDate: "",
    appealInfo:
      "본 징계처분에 이의가 있을 경우, 통보일로부터 10일 이내에 서면으로 재심을 청구할 수 있습니다.",
    issueDate: today,
  };
}

export default function DisciplinaryNoticePage() {
  const [data, setData] = useState<DisciplinaryData>(createDefault);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");

  useEffect(() => {
    setData((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp)
      setData((prev) => ({
        ...prev,
        employeeName: emp.info.name,
        department: emp.department || "",
        position: emp.position || "",
      }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `징계통보서_${data.employeeName}`,
  });

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "disciplinary_notice",
      title: `징계통보서 - ${data.employeeName} (${data.disciplinaryType})`,
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
          { label: "징계통보서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🔴</span> 징계통보서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        근로기준법 제23조에 따른 징계 처분 통보
      </p>

      <HelpGuide
        pageKey="disciplinary-notice"
        steps={[
          "대상 직원을 선택하세요.",
          "징계 유형과 사유를 상세히 기록하세요.",
          "징계위원회 일자와 이의신청 안내를 확인하세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
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
                    setData((p) => ({ ...p, employeeName: e.target.value }))
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
                    setData((p) => ({ ...p, department: e.target.value }))
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
                    setData((p) => ({ ...p, position: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">⚖️ 징계 내용</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">징계 유형</label>
                  <select
                    className="input-field"
                    value={data.disciplinaryType}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        disciplinaryType: e.target.value,
                      }))
                    }
                  >
                    {disciplinaryTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">징계 수위</label>
                  <select
                    className="input-field"
                    value={data.disciplinaryLevel}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        disciplinaryLevel: e.target.value,
                      }))
                    }
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">효력 발생일</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.effectiveDate}
                    onChange={(e) =>
                      setData((p) => ({ ...p, effectiveDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              {(data.disciplinaryType === "감봉" ||
                data.disciplinaryType === "정직") && (
                <div>
                  <label className="input-label">기간</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="예: 1개월, 3개월"
                    value={data.duration}
                    onChange={(e) =>
                      setData((p) => ({ ...p, duration: e.target.value }))
                    }
                  />
                </div>
              )}
              <div>
                <label className="input-label">징계 사유 *</label>
                <textarea
                  className="input-field min-h-[100px]"
                  value={data.reason}
                  onChange={(e) =>
                    setData((p) => ({ ...p, reason: e.target.value }))
                  }
                  placeholder="징계 처분의 구체적 사유를 기술해주세요."
                />
              </div>
              <div>
                <label className="input-label">관련 사건 경위</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.relatedIncidents}
                  onChange={(e) =>
                    setData((p) => ({ ...p, relatedIncidents: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">징계위원회 개최일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.committeeDate}
                  onChange={(e) =>
                    setData((p) => ({ ...p, committeeDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">이의신청 안내</label>
                <textarea
                  className="input-field min-h-[60px]"
                  value={data.appealInfo}
                  onChange={(e) =>
                    setData((p) => ({ ...p, appealInfo: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="btn btn-primary"
              disabled={!data.employeeName || !data.reason}
            >
              미리보기
            </button>
          </div>
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
              documentTitle={`징계통보서 — ${data.employeeName || "미입력"}`}
              documentType="징계통보서"
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
              징 계 통 보 서
            </h1>
            <div className="mb-6 text-sm">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-28 border-r border-[var(--border)]">
                      성 명
                    </td>
                    <td className="px-4 py-2 border-r border-[var(--border)]">
                      {data.employeeName}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-28 border-r border-[var(--border)]">
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
                      징계 유형
                    </td>
                    <td className="px-4 py-2 font-bold text-red-600">
                      {data.disciplinaryType} ({data.disciplinaryLevel})
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r border-[var(--border)]">
                      효력일
                    </td>
                    <td className="px-4 py-2 border-r border-[var(--border)]">
                      {formatDate(data.effectiveDate)}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r border-[var(--border)]">
                      기 간
                    </td>
                    <td className="px-4 py-2">{data.duration || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mb-6 text-sm leading-7">
              <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)] mb-4">
                <p className="font-medium mb-2">■ 징계 사유</p>
                <p className="whitespace-pre-wrap">{data.reason}</p>
              </div>
              {data.relatedIncidents && (
                <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)] mb-4">
                  <p className="font-medium mb-2">■ 관련 사건 경위</p>
                  <p className="whitespace-pre-wrap">{data.relatedIncidents}</p>
                </div>
              )}
              {data.committeeDate && (
                <p className="mb-2">
                  ■ 징계위원회 개최일: {formatDate(data.committeeDate)}
                </p>
              )}
              <div className="mt-6 p-4 border-2 border-[var(--border)] rounded">
                <p className="font-medium mb-1">■ 이의신청 안내</p>
                <p>{data.appealInfo}</p>
              </div>
            </div>
            <p className="text-center text-sm mb-12 mt-8">
              {formatDate(data.issueDate)}
            </p>
            <div className="text-center text-sm">
              <p className="font-bold text-lg mb-2">{data.company.name}</p>
              <p>대표이사 {data.company.ceoName} (인)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
