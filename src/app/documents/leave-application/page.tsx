"use client";
import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, Employee } from "@/types";
import { formatDate } from "@/lib/storage";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import Breadcrumb from "@/components/Breadcrumb";
import HelpGuide from "@/components/HelpGuide";

interface LeaveData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  contactDuring: string;
  handoverTo: string;
  handoverDetails: string;
  issueDate: string;
  monthlySalary: number;
}
const leaveTypes = [
  "육아휴직",
  "출산휴가",
  "병가",
  "개인사유 휴직",
  "학업휴직",
  "가족돌봄휴직",
];

function formatCurrency(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

function createDefault(): LeaveData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    leaveType: "육아휴직",
    startDate: today,
    endDate: "",
    reason: "",
    contactDuring: "",
    handoverTo: "",
    handoverDetails: "",
    issueDate: today,
    monthlySalary: 0,
  };
}

export default function LeaveApplicationPage() {
  const [data, setData] = useState<LeaveData>(createDefault);
  const [showPreview, setShowPreview] = useState(false);
  const [selId, setSelId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();
  const { companyInfo, loading: companyLoading } = useCompanyInfo();
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const employees = allEmployees.filter((e) => e.status === "active");

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
        monthlySalary: emp.salary?.baseSalary || 0,
      }));
  };
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `휴직신청서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "leave_application",
      title: `휴직신청서 - ${data.employeeName} (${data.leaveType})`,
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
          { label: "휴직신청서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🏖️</span> 휴직신청서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        남녀고용평등법, 근로기준법에 따른 휴직 신청
      </p>
      <HelpGuide
        pageKey="leave-application"
        steps={[
          "육아휴직, 병가 등 휴직 사유와 기간을 입력하세요.",
          "육아휴직은 자녀 만 8세 이하(또는 초등 2학년)까지 신청 가능합니다.",
          "휴직 중 4대보험 처리 방법도 함께 안내됩니다.",
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
            <h3 className="form-section-title">📝 휴직 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">휴직 유형</label>
                <select
                  className="input-field"
                  value={data.leaveType}
                  onChange={(e) =>
                    setData((p) => ({ ...p, leaveType: e.target.value }))
                  }
                >
                  {leaveTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">시작일 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.startDate}
                    onChange={(e) =>
                      setData((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="input-label">종료일 *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.endDate}
                    onChange={(e) =>
                      setData((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="input-label">사유 *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.reason}
                  onChange={(e) =>
                    setData((p) => ({ ...p, reason: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">휴직 중 연락처</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.contactDuring}
                  onChange={(e) =>
                    setData((p) => ({ ...p, contactDuring: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">업무 인수자</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.handoverTo}
                  onChange={(e) =>
                    setData((p) => ({ ...p, handoverTo: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">인수인계 내용</label>
                <textarea
                  className="input-field min-h-[60px]"
                  value={data.handoverDetails}
                  onChange={(e) =>
                    setData((p) => ({ ...p, handoverDetails: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          {/* 육아휴직/출산휴가 급여 안내 */}
          {(data.leaveType === "육아휴직" || data.leaveType === "출산휴가") && (
            <div className="form-section">
              <h3 className="form-section-title">
                💰 {data.leaveType} 급여 안내
              </h3>

              <div className="mb-4">
                <label className="input-label">월 통상임금 (급여 계산용)</label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    className="input-field"
                    value={data.monthlySalary || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        monthlySalary: Number(e.target.value),
                      }))
                    }
                    placeholder="3000000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">
                    원
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  기본급 + 고정수당 합계를 입력하세요
                </p>
              </div>

              {data.leaveType === "육아휴직" && (
                <div className="space-y-3">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm font-semibold text-indigo-800 mb-2">
                      육아휴직급여 (고용보험법 제73조, 2025.2~ 개정)
                    </p>
                    <div className="text-sm text-indigo-700 space-y-1">
                      <p>
                        통상임금의 <strong>80%</strong> (하한 월 70만원)
                      </p>
                      <table className="w-full text-xs mt-1 border-collapse">
                        <thead>
                          <tr className="bg-indigo-100">
                            <th className="border border-indigo-200 p-1 text-left">
                              기간
                            </th>
                            <th className="border border-indigo-200 p-1 text-right">
                              월 상한
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-indigo-200 p-1">
                              1~3개월
                            </td>
                            <td className="border border-indigo-200 p-1 text-right font-medium">
                              250만원
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-indigo-200 p-1">
                              4~6개월
                            </td>
                            <td className="border border-indigo-200 p-1 text-right font-medium">
                              200만원
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-indigo-200 p-1">
                              7~12개월
                            </td>
                            <td className="border border-indigo-200 p-1 text-right font-medium">
                              160만원
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      {data.monthlySalary > 0 &&
                        (() => {
                          const raw = Math.round(data.monthlySalary * 0.8);
                          const cap1 = Math.min(Math.max(raw, 700000), 2500000);
                          const cap2 = Math.min(Math.max(raw, 700000), 2000000);
                          const cap3 = Math.min(Math.max(raw, 700000), 1600000);
                          return (
                            <>
                              <p className="mt-2 font-medium">
                                예상 월 급여 (통상임금 80% ={" "}
                                {formatCurrency(raw)})
                              </p>
                              <div className="text-xs mt-1 space-y-0.5">
                                <p>
                                  1~3개월:{" "}
                                  <strong className="text-indigo-900">
                                    {formatCurrency(cap1)}
                                  </strong>
                                  {raw > 2500000 ? " (상한 적용)" : ""}
                                </p>
                                <p>
                                  4~6개월:{" "}
                                  <strong className="text-indigo-900">
                                    {formatCurrency(cap2)}
                                  </strong>
                                  {raw > 2000000 ? " (상한 적용)" : ""}
                                </p>
                                <p>
                                  7~12개월:{" "}
                                  <strong className="text-indigo-900">
                                    {formatCurrency(cap3)}
                                  </strong>
                                  {raw > 1600000 ? " (상한 적용)" : ""}
                                </p>
                              </div>
                              <p className="text-xs text-indigo-600 mt-1">
                                ※ 사후 지급금(25%)은 복직 후 6개월 이상 근무 시
                                지급됩니다.
                              </p>
                            </>
                          );
                        })()}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-800 mb-2">
                      6+6 부모육아휴직제 (2024.1~ 시행)
                    </p>
                    <div className="text-sm text-purple-700 space-y-1">
                      <p>
                        부모 모두 육아휴직 사용 시, 첫 6개월간 통상임금의{" "}
                        <strong>100%</strong> 지급
                      </p>
                      <p>
                        상한: 1~2개월 차 250만원, 3개월 300만원, 4개월 350만원,
                        5개월 400만원, 6개월 450만원
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        ※ 생후 18개월 이내 자녀 대상, 부모 모두 육아휴직 사용 시
                        적용
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--bg)] rounded-lg text-xs text-[var(--text-muted)] space-y-1">
                    <p>
                      <strong>신청 방법:</strong> 고용보험 홈페이지(ei.go.kr)
                      또는 관할 고용센터
                    </p>
                    <p>
                      <strong>기간:</strong> 자녀 1명당 최대 1년 6개월 (2025.2~
                      시행)
                    </p>
                    <p>
                      <strong>대상:</strong> 만 8세 이하 또는 초등학교 2학년
                      이하 자녀의 부모
                    </p>
                  </div>
                </div>
              )}

              {data.leaveType === "출산휴가" && (
                <div className="space-y-3">
                  <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
                    <p className="text-sm font-semibold text-pink-800 mb-2">
                      출산전후휴가 급여 (근로기준법 제74조)
                    </p>
                    <div className="text-sm text-pink-700 space-y-1">
                      <p>
                        <strong>기간:</strong> 출산 전후 90일 (다태아 120일),
                        출산 후 최소 45일 보장
                      </p>
                      <p>
                        <strong>급여:</strong> 최초 60일은 사업주 부담(통상임금
                        100%), 나머지 30일은 고용보험에서 지급
                      </p>
                      {data.monthlySalary > 0 && (
                        <p className="mt-2 font-medium">
                          월 통상임금: {formatCurrency(data.monthlySalary)}
                          <span className="text-xs ml-2">
                            (고용보험 지급분 상한: 월 220만원)
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800 mb-2">
                      배우자 출산휴가 (남녀고용평등법 제18조의2)
                    </p>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>
                        <strong>기간:</strong> 20일 (유급, 2025년 시행)
                      </p>
                      <p>
                        <strong>사용:</strong> 출산일로부터 120일 이내, 3회까지
                        분할 사용 가능
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!data.employeeName || !data.reason}
          >
            미리보기
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
              휴 직 신 청 서
            </h1>
            <div className="text-sm mb-6">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border border-[var(--border)]">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-24 border-r">
                      성 명
                    </td>
                    <td className="px-4 py-2 border-r">{data.employeeName}</td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium w-24 border-r">
                      부서/직위
                    </td>
                    <td className="px-4 py-2">
                      {data.department} {data.position}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      휴직유형
                    </td>
                    <td className="px-4 py-2 border-r font-bold">
                      {data.leaveType}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      기 간
                    </td>
                    <td className="px-4 py-2">
                      {formatDate(data.startDate)} ~ {formatDate(data.endDate)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-sm leading-7 mb-6">
              <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)] mb-4">
                <p className="font-medium mb-2">■ 휴직 사유</p>
                <p className="whitespace-pre-wrap">{data.reason}</p>
              </div>
              {data.contactDuring && (
                <p>■ 휴직 중 연락처: {data.contactDuring}</p>
              )}
              {data.handoverTo && <p>■ 업무 인수자: {data.handoverTo}</p>}
              {data.handoverDetails && (
                <div className="mt-2 p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
                  <p className="font-medium mb-2">■ 인수인계 내용</p>
                  <p className="whitespace-pre-wrap">{data.handoverDetails}</p>
                </div>
              )}
            </div>
            <p className="text-sm text-center mb-2 mt-8">
              위와 같이 휴직을 신청합니다.
            </p>
            <p className="text-center text-sm mb-12">
              {formatDate(data.issueDate)}
            </p>
            <div className="text-sm flex justify-between mb-8">
              <div>
                <p>신청인: {data.employeeName} (서명)</p>
              </div>
            </div>
            <div className="text-center text-sm">
              <p className="font-bold text-lg mb-2">{data.company.name} 귀중</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
