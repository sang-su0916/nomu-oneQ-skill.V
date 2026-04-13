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

interface Data {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  beforeStart: string;
  beforeEnd: string;
  beforeDays: string;
  beforeBreak: number;
  afterStart: string;
  afterEnd: string;
  afterDays: string;
  afterBreak: number;
  effectiveDate: string;
  reason: string;
  issueDate: string;
  employeeConsent: boolean;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function calcDailyHours(start: string, end: string, breakMin: number): number {
  const diff = timeToMinutes(end) - timeToMinutes(start);
  return Math.max(0, (diff - breakMin) / 60);
}
function countDays(days: string): number {
  const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
  const trimmed = days.trim();
  // "월~금", "월-금" 등 범위 표기 처리
  const rangeMatch = trimmed.match(
    /^([월화수목금토일])\s*[~\-]\s*([월화수목금토일])$/,
  );
  if (rangeMatch) {
    const start = dayNames.indexOf(rangeMatch[1]);
    const end = dayNames.indexOf(rangeMatch[2]);
    if (start >= 0 && end >= 0)
      return end >= start ? end - start + 1 : 7 - start + end + 1;
  }
  // 쉼표 구분: "월,화,수,목,금"
  const parts = trimmed.split(/[,，\s]+/).filter((d) => d.trim());
  return Math.max(1, parts.length);
}

function createDefault(): Data {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    beforeStart: "09:00",
    beforeEnd: "18:00",
    beforeDays: "월~금",
    beforeBreak: 60,
    afterStart: "10:00",
    afterEnd: "19:00",
    afterDays: "월~금",
    afterBreak: 60,
    effectiveDate: today,
    reason: "",
    issueDate: today,
    employeeConsent: false,
  };
}

export default function WorkHoursChangePage() {
  const [data, setData] = useState<Data>(createDefault);
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
    if (emp) {
      setData((p) => ({
        ...p,
        employeeName: emp.info.name,
        department: emp.department || "",
        position: emp.position || "",
        beforeStart: emp.workCondition.workStartTime,
        beforeEnd: emp.workCondition.workEndTime,
        beforeDays: emp.workCondition.workDays.join(", "),
        beforeBreak: emp.workCondition.breakTime,
      }));
    }
  };
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `근무시간변경합의서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "work_hours_change",
      title: `근무시간변경합의서 - ${data.employeeName}`,
      employeeId: selId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "업무/기타", href: "/documents" },
          { label: "근무시간변경합의서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🕐</span> 근무시간변경합의서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        근로기준법 제50조에 따른 근무시간 변경 합의
      </p>
      <HelpGuide
        pageKey="work-hours-change"
        steps={[
          "근로시간을 변경할 때는 반드시 근로자의 서면 동의가 필요합니다.",
          "변경 전·후 근로시간, 적용 시작일을 입력하세요.",
          "근로조건 변경은 근로계약서도 함께 수정해야 합니다.",
        ]}
      />
      {!showPreview ? (
        <div className="space-y-6">
          <div className="form-section">
            <h3 className="form-section-title">👤 대상 직원</h3>
            {employees.length > 0 && (
              <div className="mb-4">
                <select
                  className="input-field"
                  value={selId}
                  onChange={(e) => handleSelect(e.target.value)}
                >
                  <option value="">직접 입력</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.info.name}
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
            <h3 className="form-section-title">⏰ 변경 전 근무시간</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">출근</label>
                <input
                  type="time"
                  className="input-field"
                  value={data.beforeStart}
                  onChange={(e) =>
                    setData((p) => ({ ...p, beforeStart: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">퇴근</label>
                <input
                  type="time"
                  className="input-field"
                  value={data.beforeEnd}
                  onChange={(e) =>
                    setData((p) => ({ ...p, beforeEnd: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">근무요일</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.beforeDays}
                  onChange={(e) =>
                    setData((p) => ({ ...p, beforeDays: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">휴게(분)</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.beforeBreak}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      beforeBreak: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="form-section">
            <h3 className="form-section-title">🔄 변경 후 근무시간</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">출근</label>
                <input
                  type="time"
                  className="input-field"
                  value={data.afterStart}
                  onChange={(e) =>
                    setData((p) => ({ ...p, afterStart: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">퇴근</label>
                <input
                  type="time"
                  className="input-field"
                  value={data.afterEnd}
                  onChange={(e) =>
                    setData((p) => ({ ...p, afterEnd: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">근무요일</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.afterDays}
                  onChange={(e) =>
                    setData((p) => ({ ...p, afterDays: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">휴게(분)</label>
                <input
                  type="number"
                  className="input-field"
                  value={data.afterBreak}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      afterBreak: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="form-section">
            <h3 className="form-section-title">📝 변경 사유</h3>
            <div>
              <label className="input-label">적용일</label>
              <input
                type="date"
                className="input-field max-w-xs"
                value={data.effectiveDate}
                onChange={(e) =>
                  setData((p) => ({ ...p, effectiveDate: e.target.value }))
                }
              />
            </div>
            <div className="mt-4">
              <label className="input-label">변경 사유 *</label>
              <textarea
                className="input-field min-h-[80px]"
                value={data.reason}
                onChange={(e) =>
                  setData((p) => ({ ...p, reason: e.target.value }))
                }
                placeholder="예: 업무 효율화를 위한 탄력근무제 적용"
              />
            </div>
          </div>
          {/* 변경 전/후 비교 요약 + 불이익 변경 경고 */}
          {(() => {
            const beforeHours = calcDailyHours(
              data.beforeStart,
              data.beforeEnd,
              data.beforeBreak,
            );
            const afterHours = calcDailyHours(
              data.afterStart,
              data.afterEnd,
              data.afterBreak,
            );
            const beforeDayCount = countDays(data.beforeDays);
            const afterDayCount = countDays(data.afterDays);
            const beforeWeekly = beforeHours * beforeDayCount;
            const afterWeekly = afterHours * afterDayCount;
            const isDisadvantage =
              afterWeekly < beforeWeekly ||
              afterHours < beforeHours ||
              afterDayCount < beforeDayCount;
            const hourDiff = afterWeekly - beforeWeekly;

            return (
              <div className="form-section">
                <h3 className="form-section-title">📊 변경 전/후 비교</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg)]">
                        <th className="px-4 py-2 text-left border border-[var(--border)]">
                          항목
                        </th>
                        <th className="px-4 py-2 text-center border border-[var(--border)]">
                          변경 전
                        </th>
                        <th className="px-4 py-2 text-center border border-[var(--border)]">
                          변경 후
                        </th>
                        <th className="px-4 py-2 text-center border border-[var(--border)]">
                          차이
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 font-medium border border-[var(--border)]">
                          1일 근로시간
                        </td>
                        <td className="px-4 py-2 text-center border border-[var(--border)]">
                          {beforeHours.toFixed(1)}시간
                        </td>
                        <td className="px-4 py-2 text-center border border-[var(--border)]">
                          {afterHours.toFixed(1)}시간
                        </td>
                        <td
                          className={`px-4 py-2 text-center border border-[var(--border)] font-medium ${afterHours < beforeHours ? "text-red-600" : afterHours > beforeHours ? "text-blue-600" : ""}`}
                        >
                          {afterHours !== beforeHours
                            ? `${afterHours - beforeHours > 0 ? "+" : ""}${(afterHours - beforeHours).toFixed(1)}h`
                            : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium border border-[var(--border)]">
                          근무요일
                        </td>
                        <td className="px-4 py-2 text-center border border-[var(--border)]">
                          {data.beforeDays} ({beforeDayCount}일)
                        </td>
                        <td className="px-4 py-2 text-center border border-[var(--border)]">
                          {data.afterDays} ({afterDayCount}일)
                        </td>
                        <td
                          className={`px-4 py-2 text-center border border-[var(--border)] font-medium ${afterDayCount < beforeDayCount ? "text-red-600" : ""}`}
                        >
                          {afterDayCount !== beforeDayCount
                            ? `${afterDayCount - beforeDayCount}일`
                            : "-"}
                        </td>
                      </tr>
                      <tr className="bg-yellow-50">
                        <td className="px-4 py-2 font-bold border border-[var(--border)]">
                          주당 근로시간
                        </td>
                        <td className="px-4 py-2 text-center font-medium border border-[var(--border)]">
                          {beforeWeekly.toFixed(1)}시간
                        </td>
                        <td className="px-4 py-2 text-center font-medium border border-[var(--border)]">
                          {afterWeekly.toFixed(1)}시간
                        </td>
                        <td
                          className={`px-4 py-2 text-center font-bold border border-[var(--border)] ${hourDiff < 0 ? "text-red-600" : hourDiff > 0 ? "text-blue-600" : ""}`}
                        >
                          {hourDiff !== 0
                            ? `${hourDiff > 0 ? "+" : ""}${hourDiff.toFixed(1)}h`
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {isDisadvantage && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-sm font-bold text-red-800 mb-2">
                      ⚠️ 불이익 변경 — 근로자 서면 동의 필수 (근로기준법 제94조)
                    </p>
                    <p className="text-sm text-red-700 mb-3">
                      근로시간이 줄어들면 임금도 감소할 수 있어 근로조건의
                      불이익 변경에 해당합니다. 반드시 근로자의 자유로운 의사에
                      의한 동의를 받아야 하며, 강요에 의한 동의는 무효입니다.
                    </p>
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-red-200">
                      <input
                        type="checkbox"
                        checked={data.employeeConsent}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            employeeConsent: e.target.checked,
                          }))
                        }
                        className="w-5 h-5 mt-0.5 accent-red-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          근로자가 근로조건 변경 내용을 충분히 설명 받았으며,
                          자유로운 의사로 동의합니다.
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          이 체크박스는 서면 동의 확인 기록용입니다. 별도로
                          합의서에 서명을 받으세요.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            );
          })()}

          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={
              !data.employeeName ||
              !data.reason ||
              (calcDailyHours(data.afterStart, data.afterEnd, data.afterBreak) *
                countDays(data.afterDays) <
                calcDailyHours(
                  data.beforeStart,
                  data.beforeEnd,
                  data.beforeBreak,
                ) *
                  countDays(data.beforeDays) &&
                !data.employeeConsent)
            }
          >
            {calcDailyHours(data.afterStart, data.afterEnd, data.afterBreak) *
              countDays(data.afterDays) <
              calcDailyHours(
                data.beforeStart,
                data.beforeEnd,
                data.beforeBreak,
              ) *
                countDays(data.beforeDays) && !data.employeeConsent
              ? "근로자 동의 필요"
              : "미리보기"}
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
              근무시간 변경 합의서
            </h1>
            <p className="text-sm mb-6">
              {data.company.name}(이하 &quot;회사&quot;)와 {data.employeeName}
              (이하 &quot;근로자&quot;)는 다음과 같이 근무시간 변경에 합의한다.
            </p>
            <div className="text-sm mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border border-[var(--border)] bg-[var(--bg)]">
                    <th className="px-4 py-2 border-r w-28"></th>
                    <th className="px-4 py-2 border-r">변경 전</th>
                    <th className="px-4 py-2">변경 후</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      근무시간
                    </td>
                    <td className="px-4 py-2 border-r">
                      {data.beforeStart} ~ {data.beforeEnd}
                    </td>
                    <td className="px-4 py-2 font-bold text-[var(--primary)]">
                      {data.afterStart} ~ {data.afterEnd}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      근무요일
                    </td>
                    <td className="px-4 py-2 border-r">{data.beforeDays}</td>
                    <td className="px-4 py-2">{data.afterDays}</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      휴게시간
                    </td>
                    <td className="px-4 py-2 border-r">{data.beforeBreak}분</td>
                    <td className="px-4 py-2">{data.afterBreak}분</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm mb-2">
              ■ 적용일: {formatDate(data.effectiveDate)}
            </p>
            <div className="text-sm mb-6 p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
              <p className="font-medium mb-1">■ 변경 사유</p>
              <p className="whitespace-pre-wrap">{data.reason}</p>
            </div>
            <p className="text-sm mb-8">
              위 내용에 양 당사자가 합의하며, 본 합의서는 2부를 작성하여 각
              1부씩 보관한다.
            </p>
            <p className="text-center text-sm mb-12">
              {formatDate(data.issueDate)}
            </p>
            <div className="text-sm flex justify-between">
              <div>
                <p className="font-bold mb-1">회사</p>
                <p>{data.company.name}</p>
                <p>대표이사 {data.company.ceoName} (인)</p>
              </div>
              <div className="text-right">
                <p className="font-bold mb-1">근로자</p>
                <p>{data.employeeName} (서명)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
