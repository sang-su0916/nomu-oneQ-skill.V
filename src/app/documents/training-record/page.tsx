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

interface TrainingData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  trainingName: string;
  trainingType: string;
  provider: string;
  startDate: string;
  endDate: string;
  hours: number;
  content: string;
  result: string;
  certificateNumber: string;
  issueDate: string;
}
const trainingTypes = [
  "직무교육",
  "안전교육",
  "법정교육",
  "리더십교육",
  "직무전환교육",
  "신입사원교육",
  "기타",
];

function createDefault(): TrainingData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    trainingName: "",
    trainingType: "직무교육",
    provider: "",
    startDate: today,
    endDate: today,
    hours: 8,
    content: "",
    result: "이수",
    certificateNumber: "",
    issueDate: today,
  };
}

export default function TrainingRecordPage() {
  const [data, setData] = useState<TrainingData>(createDefault);
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
    documentTitle: `교육훈련확인서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "training_record",
      title: `교육훈련확인서 - ${data.employeeName} (${data.trainingName})`,
      employeeId: selId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "인사관리", href: "/documents" },
          { label: "교육훈련확인서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🎓</span> 교육훈련확인서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        직업능력개발법에 따른 교육훈련 이수 확인
      </p>
      <HelpGuide
        pageKey="training-record"
        steps={[
          "직무교육, 안전교육 등 교육 이수 내역을 기록합니다.",
          "교육 일시, 내용, 강사, 이수 시간을 입력하세요.",
          "산업안전보건교육은 법정 의무이므로 기록을 꼭 보관하세요.",
        ]}
      />
      {!showPreview ? (
        <div className="space-y-6">
          <div className="form-section">
            <h3 className="form-section-title">👤 교육 대상자</h3>
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
            <h3 className="form-section-title">📚 교육 정보</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">교육명 *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.trainingName}
                    onChange={(e) =>
                      setData((p) => ({ ...p, trainingName: e.target.value }))
                    }
                    placeholder="예: 산업안전보건교육"
                  />
                </div>
                <div>
                  <label className="input-label">교육 유형</label>
                  <select
                    className="input-field"
                    value={data.trainingType}
                    onChange={(e) =>
                      setData((p) => ({ ...p, trainingType: e.target.value }))
                    }
                  >
                    {trainingTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">교육기관</label>
                <input
                  type="text"
                  className="input-field"
                  value={data.provider}
                  onChange={(e) =>
                    setData((p) => ({ ...p, provider: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">시작일</label>
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
                  <label className="input-label">종료일</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.endDate}
                    onChange={(e) =>
                      setData((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="input-label">교육시간</label>
                  <input
                    type="number"
                    className="input-field"
                    value={data.hours}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        hours: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="input-label">교육 내용</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.content}
                  onChange={(e) =>
                    setData((p) => ({ ...p, content: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">이수 결과</label>
                  <select
                    className="input-field"
                    value={data.result}
                    onChange={(e) =>
                      setData((p) => ({ ...p, result: e.target.value }))
                    }
                  >
                    <option value="이수">이수</option>
                    <option value="미이수">미이수</option>
                    <option value="수료">수료</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">수료번호</label>
                  <input
                    type="text"
                    className="input-field"
                    value={data.certificateNumber}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        certificateNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!data.employeeName || !data.trainingName}
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
              교 육 훈 련 확 인 서
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
                      부 서
                    </td>
                    <td className="px-4 py-2">
                      {data.department} / {data.position}
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      교육명
                    </td>
                    <td className="px-4 py-2 border-r" colSpan={3}>
                      {data.trainingName} ({data.trainingType})
                    </td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      교육기관
                    </td>
                    <td className="px-4 py-2 border-r">
                      {data.provider || "-"}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      교육시간
                    </td>
                    <td className="px-4 py-2">{data.hours}시간</td>
                  </tr>
                  <tr className="border border-[var(--border)] border-t-0">
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      교육기간
                    </td>
                    <td className="px-4 py-2 border-r">
                      {formatDate(data.startDate)} ~ {formatDate(data.endDate)}
                    </td>
                    <td className="bg-[var(--bg)] px-4 py-2 font-medium border-r">
                      이수결과
                    </td>
                    <td className="px-4 py-2 font-bold">{data.result}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {data.content && (
              <div className="text-sm mb-6 p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
                <p className="font-medium mb-2">■ 교육 내용</p>
                <p className="whitespace-pre-wrap">{data.content}</p>
              </div>
            )}
            <p className="text-sm text-center mb-2">
              위 직원이 상기 교육을 이수하였음을 확인합니다.
            </p>
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
