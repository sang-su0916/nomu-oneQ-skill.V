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

interface ExpenseItem {
  item: string;
  amount: string;
}
interface FormData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  detailPlan: string;
  transport: string;
  accommodation: string;
  expenses: ExpenseItem[];
  expectedResult: string;
  issueDate: string;
}

function createDefault(): FormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    destination: "",
    startDate: today,
    endDate: "",
    purpose: "",
    detailPlan: "",
    transport: "",
    accommodation: "",
    expenses: [
      { item: "교통비", amount: "" },
      { item: "숙박비", amount: "" },
      { item: "식비", amount: "" },
    ],
    expectedResult: "",
    issueDate: today,
  };
}

export default function BusinessTripPage() {
  const [data, setData] = useState<FormData>(createDefault);
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
      }));
  };
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `출장신청서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "business_trip",
      title: `출장신청서 - ${data.employeeName} (${data.destination})`,
      employeeId: selId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  const addExpense = () =>
    setData((p) => ({
      ...p,
      expenses: [...p.expenses, { item: "", amount: "" }],
    }));
  const removeExpense = (i: number) =>
    setData((p) => ({
      ...p,
      expenses: p.expenses.filter((_, idx) => idx !== i),
    }));
  const updateExpense = (i: number, field: keyof ExpenseItem, val: string) =>
    setData((p) => ({
      ...p,
      expenses: p.expenses.map((ex, idx) =>
        idx === i ? { ...ex, [field]: val } : ex,
      ),
    }));

  const totalExpense = data.expenses.reduce(
    (sum, e) => sum + (parseInt(e.amount) || 0),
    0,
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "업무/기타", href: "/documents" },
          { label: "출장신청서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">✈️</span> 출장신청서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        출장 목적, 일정, 경비 신청
      </p>
      <HelpGuide
        pageKey="business-trip"
        steps={[
          "출장 목적, 기간, 장소를 입력하세요.",
          "교통비·숙박비 등 예상 경비를 기재하면 출장 후 정산이 편리합니다.",
          '"미리보기"로 확인 후 인쇄하여 결재를 받으세요.',
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
            <h3 className="form-section-title">📍 출장 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">출장지 *</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.destination}
                  onChange={(e) =>
                    setData((p) => ({ ...p, destination: e.target.value }))
                  }
                  placeholder="출장 장소 (예: 부산 해운대구)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">출발일 *</label>
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
                  <label className="input-label">귀환일 *</label>
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
                <label className="input-label">출장 목적 *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.purpose}
                  onChange={(e) =>
                    setData((p) => ({ ...p, purpose: e.target.value }))
                  }
                  placeholder="출장 목적을 상세히 기술"
                />
              </div>
              <div>
                <label className="input-label">세부 일정</label>
                <textarea
                  className="input-field min-h-[60px]"
                  value={data.detailPlan}
                  onChange={(e) =>
                    setData((p) => ({ ...p, detailPlan: e.target.value }))
                  }
                  placeholder="일자별 계획 (선택)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">교통편</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.transport}
                    onChange={(e) =>
                      setData((p) => ({ ...p, transport: e.target.value }))
                    }
                    placeholder="예: KTX, 자가용, 항공"
                  />
                </div>
                <div>
                  <label className="input-label">숙박</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.accommodation}
                    onChange={(e) =>
                      setData((p) => ({ ...p, accommodation: e.target.value }))
                    }
                    placeholder="예: OO호텔, 당일 귀환"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">💰 예상 경비</h3>
            {data.expenses.map((ex, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3"
              >
                <div>
                  <label className="input-label">항목</label>
                  <input
                    type="text"
                    className="input-field"
                    value={ex.item}
                    onChange={(e) => updateExpense(i, "item", e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">금액 (원)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={ex.amount}
                    onChange={(e) => updateExpense(i, "amount", e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => removeExpense(i)}
                    className="btn btn-secondary text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addExpense} className="btn btn-secondary text-sm">
              + 항목 추가
            </button>
            {totalExpense > 0 && (
              <p className="text-sm font-medium mt-3">
                합계: {totalExpense.toLocaleString()}원
              </p>
            )}
          </div>

          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!data.employeeName || !data.destination || !data.purpose}
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
              출 장 신 청 서
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
                      출장지
                    </td>
                    <td className="px-3 py-2 border-r font-bold">
                      {data.destination}
                    </td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      기 간
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(data.startDate)} ~{" "}
                      {data.endDate ? formatDate(data.endDate) : ""}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      교통편
                    </td>
                    <td className="px-3 py-2 border-r">{data.transport}</td>
                    <td className="bg-[var(--bg)] px-3 py-2 font-medium border-r">
                      숙 박
                    </td>
                    <td className="px-3 py-2">{data.accommodation}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-medium text-sm mb-2">■ 출장 목적</p>
            <div className="text-sm p-4 border border-[var(--border)] rounded bg-[var(--bg)] whitespace-pre-wrap mb-4">
              {data.purpose}
            </div>

            {data.detailPlan && (
              <>
                <p className="font-medium text-sm mb-2">■ 세부 일정</p>
                <p className="text-sm whitespace-pre-wrap mb-4 px-3">
                  {data.detailPlan}
                </p>
              </>
            )}

            {data.expenses.some((e) => e.item && e.amount) && (
              <>
                <p className="font-medium text-sm mb-2">■ 예상 경비</p>
                <table className="w-full border-collapse text-sm mb-6">
                  <thead>
                    <tr className="border border-[var(--border)] bg-[var(--bg)]">
                      <th className="px-3 py-2 border-r">항목</th>
                      <th className="px-3 py-2 w-32">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses
                      .filter((e) => e.item && e.amount)
                      .map((e, i) => (
                        <tr
                          key={i}
                          className="border border-[var(--border)] border-t-0"
                        >
                          <td className="px-3 py-2 border-r">{e.item}</td>
                          <td className="px-3 py-2 text-right">
                            {parseInt(e.amount).toLocaleString()}원
                          </td>
                        </tr>
                      ))}
                    <tr className="border border-[var(--border)] border-t-0 font-bold">
                      <td className="px-3 py-2 border-r bg-[var(--bg)]">
                        합 계
                      </td>
                      <td className="px-3 py-2 text-right">
                        {totalExpense.toLocaleString()}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            <p className="text-sm text-center mt-8 mb-2">
              위와 같이 출장을 신청합니다.
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
