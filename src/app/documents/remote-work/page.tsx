"use client";
import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import { formatDate } from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import Breadcrumb from "@/components/Breadcrumb";
import HelpGuide from "@/components/HelpGuide";

interface FormData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  startDate: string;
  endDate: string;
  workLocation: string;
  workContent: string;
  workSchedule: string;
  contactMethod: string;
  contactPhone: string;
  reportMethod: string;
  securityPledge: boolean;
  specialNotes: string;
  issueDate: string;
}

function createDefault(): FormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    startDate: today,
    endDate: "",
    workLocation: "자택",
    workContent: "",
    workSchedule: "",
    contactMethod: "",
    contactPhone: "",
    reportMethod: "일일 업무보고 (이메일/메신저)",
    securityPledge: true,
    specialNotes: "",
    issueDate: today,
  };
}

export default function RemoteWorkPage() {
  const [data, setData] = useState<FormData>(createDefault);
  const [showPreview, setShowPreview] = useState(false);
  const { companyInfo } = useCompanyInfo();
  const { employees: allEmployees } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const [selId, setSelId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  useEffect(() => {
    setData((p) => ({ ...p, company: companyInfo }));
  }, [companyInfo]);
  const handleSelect = (id: string) => {
    setSelId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp)
      setData((p) => ({
        ...p,
        employeeName: emp.info.name,
        department: emp.department || "",
        position: emp.position || "",
        contactPhone: emp.info.phone || "",
      }));
  };
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `재택근무신청서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "remote_work",
      title: `재택근무신청서 - ${data.employeeName}`,
      employeeId: selId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };
  const u = (field: keyof FormData, val: string | boolean) =>
    setData((p) => ({ ...p, [field]: val }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "업무/기타", href: "/documents" },
          { label: "재택근무신청서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🏠</span> 재택근무신청서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        재택(원격) 근무 신청 및 보안 서약
      </p>
      <HelpGuide
        pageKey="remote-work"
        steps={[
          "재택근무 기간, 근무 장소, 업무 내용을 입력하세요.",
          "근무시간과 보고 방법 등 세부 조건을 기재합니다.",
          "재택근무 시에도 근로시간 관리 의무가 있으므로 출퇴근 기록을 남기세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          <div className="form-section">
            <h3 className="form-section-title">👤 신청자</h3>
            {employees.length > 0 && (
              <div className="mb-4">
                <select
                  className="input-field"
                  value={selId}
                  onChange={(e) => handleSelect(e.target.value)}
                >
                  <option value="">직접 입력</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.info.name} ({e.department || "부서없음"})
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
                  onChange={(e) => u("employeeName", e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">부서</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.department}
                  onChange={(e) => u("department", e.target.value)}
                />
              </div>
              <div>
                <label className="input-label">직위</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.position}
                  onChange={(e) => u("position", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">🏠 재택근무 정보</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">시작일 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.startDate}
                    onChange={(e) => u("startDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">종료일 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.endDate}
                    onChange={(e) => u("endDate", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">근무장소 *</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.workLocation}
                  onChange={(e) => u("workLocation", e.target.value)}
                  placeholder="자택, 카페, 코워킹스페이스 등"
                />
              </div>
              <div>
                <label className="input-label">업무내용 *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.workContent}
                  onChange={(e) => u("workContent", e.target.value)}
                  placeholder="재택근무 기간 중 수행할 업무"
                />
              </div>
              <div>
                <label className="input-label">근무시간</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.workSchedule}
                  onChange={(e) => u("workSchedule", e.target.value)}
                  placeholder="예: 09:00~18:00 (기존 근무시간과 동일)"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">📞 연락 방법</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">연락 수단</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.contactMethod}
                    onChange={(e) => u("contactMethod", e.target.value)}
                    placeholder="예: 슬랙, 카카오톡, 이메일"
                  />
                </div>
                <div>
                  <label className="input-label">긴급 연락처</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.contactPhone}
                    onChange={(e) => u("contactPhone", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="input-label">업무보고 방법</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.reportMethod}
                  onChange={(e) => u("reportMethod", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">🔒 보안 서약</h3>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={data.securityPledge}
                onChange={(e) => u("securityPledge", e.target.checked)}
              />
              <span>
                재택근무 중 회사의 영업비밀 및 개인정보를 안전하게 관리하며,
                공용 와이파이 사용 자제, 화면 잠금 설정, 자료 외부 유출 금지 등
                보안 수칙을 준수할 것을 서약합니다.
              </span>
            </label>
            <div className="mt-4">
              <label className="input-label">특이사항</label>
              <textarea
                className="input-field min-h-[60px]"
                value={data.specialNotes}
                onChange={(e) => u("specialNotes", e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              💡 입력 완료 후 <strong>미리보기</strong>를 누르면 인쇄·PDF
              저장·이메일 발송이 가능합니다.
            </p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!data.employeeName || !data.workContent}
          >
            미리보기 →
          </button>
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
              onClick={handleSave}
              disabled={saving}
              className="btn btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
          </div>
          <div
            ref={printRef}
            className="bg-[var(--bg-card)] p-10 max-w-[210mm] mx-auto shadow-sm border print:shadow-none print:border-none"
            style={{ fontFamily: "'Pretendard', sans-serif" }}
          >
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">
              재택근무 신청서
            </h1>

            <div className="text-sm mb-6">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      성 명
                    </td>
                    <td className="px-3 py-2 border-r">{data.employeeName}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      부서/직위
                    </td>
                    <td className="px-3 py-2">
                      {data.department} {data.position}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      기 간
                    </td>
                    <td className="px-3 py-2 border-r">
                      {formatDate(data.startDate)} ~{" "}
                      {data.endDate ? formatDate(data.endDate) : ""}
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      근무장소
                    </td>
                    <td className="px-3 py-2">{data.workLocation}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      근무시간
                    </td>
                    <td className="px-3 py-2 border-r">{data.workSchedule}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      연락수단
                    </td>
                    <td className="px-3 py-2">{data.contactMethod}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      긴급연락
                    </td>
                    <td className="px-3 py-2 border-r">{data.contactPhone}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      보고방법
                    </td>
                    <td className="px-3 py-2">{data.reportMethod}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-medium text-sm mb-2">■ 업무내용</p>
            <div className="text-sm p-4 border border-[var(--border)] rounded bg-[var(--bg)] whitespace-pre-wrap mb-6">
              {data.workContent}
            </div>

            {data.specialNotes && (
              <>
                <p className="font-medium text-sm mb-2">■ 특이사항</p>
                <p className="text-sm whitespace-pre-wrap mb-4 px-3">
                  {data.specialNotes}
                </p>
              </>
            )}

            <div className="mt-4 p-4 border-2 border-[var(--border)] rounded text-sm">
              <p className="font-bold mb-2">■ 보안 서약</p>
              <p>
                1. 재택근무 중 회사의 영업비밀 및 개인정보를 안전하게
                관리합니다.
              </p>
              <p>
                2. 공용 네트워크(와이파이) 사용을 자제하고, 보안이 확보된
                네트워크를 사용합니다.
              </p>
              <p>
                3. 이석 시 화면 잠금을 설정하고, 업무 자료를 타인에게 노출하지
                않습니다.
              </p>
              <p>
                4. 회사 자료를 개인 저장장치에 무단 복사하거나 외부에 유출하지
                않습니다.
              </p>
              <p>
                5. 위 사항을 위반할 경우 사내 규정에 따른 징계 조치에
                동의합니다.
              </p>
            </div>

            <p className="text-sm text-center mt-8 mb-2">
              위와 같이 재택근무를 신청합니다.
            </p>
            <p className="text-center text-sm mb-12">
              {formatDate(data.issueDate)}
            </p>

            <div className="text-sm text-center mb-8">
              <p>신청인: {data.employeeName} (서명)</p>
            </div>
            <div className="text-center text-sm">
              <p className="font-bold text-lg mb-2">{data.company.name} 귀중</p>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-4 text-sm">
              <p className="font-medium mb-2">■ 결재</p>
              <div className="flex gap-8">
                <span>□ 승인</span>
                <span>□ 반려</span>
              </div>
              <p className="mt-4">
                결재일: ______________ &nbsp;&nbsp; 대표이사{" "}
                {data.company.ceoName} (인)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
