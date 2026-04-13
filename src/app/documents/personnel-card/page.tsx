"use client";
import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, Employee } from "@/types";
import { formatDate } from "@/lib/storage";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import Breadcrumb from "@/components/Breadcrumb";
import HelpGuide from "@/components/HelpGuide";

export default function PersonnelCardPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [selId, setSelId] = useState("");
  const [memo, setMemo] = useState("");
  const [career, setCareer] = useState([{ company: "", period: "", role: "" }]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");
  const company = companyInfo;

  const emp = employees.find((e) => e.id === selId);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `인사카드_${emp?.info.name || ""}`,
  });
  const handleSave = async () => {
    if (!emp) return;
    await saveDocument({
      docType: "personnel_card",
      title: `인사카드 - ${emp.info.name}`,
      employeeId: selId,
      data: { company, employee: emp, memo, career } as unknown as Record<
        string,
        unknown
      >,
    });
  };

  const addCareer = () =>
    setCareer((p) => [...p, { company: "", period: "", role: "" }]);
  const removeCareer = (i: number) =>
    setCareer((p) => p.filter((_, idx) => idx !== i));
  const updateCareer = (i: number, field: string, val: string) =>
    setCareer((p) =>
      p.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)),
    );

  const fmt = (n: number) => n.toLocaleString();
  const workDayLabel = (days: string[]) => days.join(", ");
  const insuranceLabel = (ins: Employee["insurance"]) => {
    const list: string[] = [];
    if (ins.national) list.push("국민연금");
    if (ins.health) list.push("건강보험");
    if (ins.employment) list.push("고용보험");
    if (ins.industrial) list.push("산재보험");
    return list.join(", ") || "미가입";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "인사관리", href: "/documents" },
          { label: "인사카드" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🪪</span> 인사카드
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        직원 종합 정보 조회 및 인쇄
      </p>
      <HelpGuide
        pageKey="personnel-card"
        steps={[
          "직원의 인적사항, 학력, 경력, 자격증 등을 한눈에 관리하는 카드입니다.",
          "직원을 선택하면 기본 정보가 자동 입력됩니다.",
          "입사 후 변경사항(승진, 부서이동 등)을 수시로 업데이트하세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          <div className="form-section">
            <h3 className="form-section-title">👤 직원 선택</h3>
            {employees.length > 0 ? (
              <select
                className="input-field"
                value={selId}
                onChange={(e) => setSelId(e.target.value)}
              >
                <option value="">-- 직원을 선택하세요 --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.info.name} ({e.department || "부서없음"})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                등록된 직원이 없습니다.
              </p>
            )}
            {emp && (
              <div className="mt-4 p-4 border rounded bg-[var(--bg)] text-sm">
                <p>
                  <strong>{emp.info.name}</strong> | {emp.department}{" "}
                  {emp.position} | 입사일: {formatDate(emp.hireDate)}
                </p>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="form-section-title">📋 경력사항 (이전 직장)</h3>
            {career.map((c, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3"
              >
                <div>
                  <label className="input-label">회사명</label>
                  <input
                    type="text"
                    className="input-field"
                    value={c.company}
                    onChange={(e) => updateCareer(i, "company", e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">근무기간</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="2020.01~2023.06"
                    value={c.period}
                    onChange={(e) => updateCareer(i, "period", e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">담당업무</label>
                  <input
                    type="text"
                    className="input-field"
                    value={c.role}
                    onChange={(e) => updateCareer(i, "role", e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeCareer(i)}
                    className="btn btn-secondary text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addCareer} className="btn btn-secondary text-sm">
              + 경력 추가
            </button>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">📝 비고</h3>
            <textarea
              className="input-field min-h-[60px]"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="특이사항, 자격증 등"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-700">
              💡 직원을 선택한 후 <strong>미리보기</strong>를 누르면 인쇄·PDF
              저장이 가능합니다.
            </p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!emp}
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
          {emp && (
            <div
              ref={printRef}
              className="bg-[var(--bg-card)] p-10 max-w-[210mm] mx-auto shadow-sm border print:shadow-none print:border-none"
              style={{ fontFamily: "'Pretendard', sans-serif" }}
            >
              <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">
                인 사 카 드
              </h1>

              {/* 기본정보 */}
              <p className="font-medium text-sm mb-2">■ 기본정보</p>
              <table className="w-full border-collapse text-sm mb-6">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      성 명
                    </td>
                    <td className="px-3 py-2 border-r">{emp.info.name}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      고용형태
                    </td>
                    <td className="px-3 py-2">
                      {emp.employmentType === "fulltime"
                        ? "정규직"
                        : emp.employmentType === "parttime"
                          ? "파트타임"
                          : "프리랜서"}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      부 서
                    </td>
                    <td className="px-3 py-2 border-r">{emp.department}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      직 위
                    </td>
                    <td className="px-3 py-2">{emp.position}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      입사일
                    </td>
                    <td className="px-3 py-2 border-r">
                      {formatDate(emp.hireDate)}
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      연락처
                    </td>
                    <td className="px-3 py-2">{emp.info.phone}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      주 소
                    </td>
                    <td colSpan={3} className="px-3 py-2">
                      {emp.info.address}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 급여정보 */}
              <p className="font-medium text-sm mb-2">■ 급여정보</p>
              <table className="w-full border-collapse text-sm mb-6">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      급여유형
                    </td>
                    <td className="px-3 py-2 border-r">
                      {emp.salary.type === "monthly" ? "월급제" : "시급제"}
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      기본급
                    </td>
                    <td className="px-3 py-2">
                      {fmt(emp.salary.baseSalary)}원
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      식 대
                    </td>
                    <td className="px-3 py-2 border-r">
                      {fmt(emp.salary.mealAllowance)}원
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      차량보조
                    </td>
                    <td className="px-3 py-2">
                      {fmt(emp.salary.carAllowance)}원
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 근무조건 */}
              <p className="font-medium text-sm mb-2">■ 근무조건</p>
              <table className="w-full border-collapse text-sm mb-6">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-28 border-r">
                      주 근로시간
                    </td>
                    <td className="px-3 py-2 border-r">
                      {emp.workCondition.weeklyHours}시간
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium w-24 border-r">
                      근무요일
                    </td>
                    <td className="px-3 py-2">
                      {workDayLabel(emp.workCondition.workDays)}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      근무시간
                    </td>
                    <td className="px-3 py-2 border-r">
                      {emp.workCondition.workStartTime} ~{" "}
                      {emp.workCondition.workEndTime}
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      휴게시간
                    </td>
                    <td className="px-3 py-2">
                      {emp.workCondition.breakTime}분
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 4대보험 */}
              <p className="font-medium text-sm mb-2">■ 4대보험</p>
              <p className="text-sm mb-6 px-3">
                {insuranceLabel(emp.insurance)}
              </p>

              {/* 경력사항 */}
              {career.some((c) => c.company) && (
                <>
                  <p className="font-medium text-sm mb-2">■ 경력사항</p>
                  <table className="w-full border-collapse text-sm mb-6">
                    <thead>
                      <tr className="border border-[var(--border)] bg-[var(--bg)]">
                        <th className="px-3 py-2 border-r">회사명</th>
                        <th className="px-3 py-2 border-r">근무기간</th>
                        <th className="px-3 py-2">담당업무</th>
                      </tr>
                    </thead>
                    <tbody>
                      {career
                        .filter((c) => c.company)
                        .map((c, i) => (
                          <tr
                            key={i}
                            className="border border-[var(--border)] border-t-0"
                          >
                            <td className="px-3 py-2 border-r">{c.company}</td>
                            <td className="px-3 py-2 border-r">{c.period}</td>
                            <td className="px-3 py-2">{c.role}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </>
              )}

              {memo && (
                <>
                  <p className="font-medium text-sm mb-2">■ 비고</p>
                  <p className="text-sm whitespace-pre-wrap px-3 mb-6">
                    {memo}
                  </p>
                </>
              )}

              <p className="text-center text-sm mb-8 mt-8">
                {formatDate(new Date().toISOString().split("T")[0])}
              </p>
              <div className="text-center text-sm">
                <p className="font-bold text-lg mb-2">{company.name}</p>
                {company.address && (
                  <p className="text-[var(--text-muted)]">{company.address}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
