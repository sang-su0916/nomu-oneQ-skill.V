"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo } from "@/types";
import { formatDate, formatCurrency } from "@/lib/storage";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import EmailSendButton from "@/components/EmailSendButton";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import { useEmployees } from "@/hooks/useEmployees";
import Breadcrumb from "@/components/Breadcrumb";
import HelpGuide from "@/components/HelpGuide";

interface AgreementData {
  company: CompanyInfo;
  employeeName: string;
  department: string;
  position: string;
  hireDate: string;
  separationDate: string;
  reason: string;
  severancePayDate: string;
  consolationMoney: number;
  unusedLeaveSettlement: boolean;
  confidentiality: boolean;
  noLitigation: boolean;
  specialTerms: string;
  issueDate: string;
}

function createDefault(): AgreementData {
  const today = new Date().toISOString().split("T")[0];
  return {
    company: defaultCompanyInfo,
    employeeName: "",
    department: "",
    position: "",
    hireDate: "",
    separationDate: today,
    reason: "경영상 사유에 의한 인력 구조조정",
    severancePayDate: "",
    consolationMoney: 0,
    unusedLeaveSettlement: true,
    confidentiality: true,
    noLitigation: true,
    specialTerms: "",
    issueDate: today,
  };
}

export default function SeparationAgreementPage() {
  const [data, setData] = useState<AgreementData>(createDefault);
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
        hireDate: emp.hireDate,
      }));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `권고사직합의서_${data.employeeName}`,
  });
  const handleSave = async () => {
    await saveDocument({
      docType: "separation_agreement",
      title: `권고사직 합의서 - ${data.employeeName}`,
      employeeId: selId || undefined,
      data: data as unknown as Record<string, unknown>,
    });
  };

  const canPreview = data.employeeName && data.separationDate && data.reason;

  if (companyLoading || employeesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-[var(--text-secondary)]">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "퇴직/전환", href: "/terminate" },
          { label: "합의퇴직서" },
        ]}
      />
      <h1 className="heading-lg flex items-center gap-2 mb-2">
        <span className="icon-box icon-box-primary">🤝</span> 권고사직 합의서
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        사업주와 근로자 간 합의에 의한 퇴직 시 사용하는 합의서입니다
      </p>
      <HelpGuide
        pageKey="separation-agreement"
        steps={[
          "사용자와 근로자가 합의하여 근로관계를 종료할 때 사용합니다.",
          "퇴직금, 미사용 연차수당 등 정산 내역을 명확히 기재하세요.",
          "양쪽 서명 후 각 1부씩 보관하세요.",
        ]}
      />

      {!showPreview ? (
        <div className="space-y-6">
          {/* 직원 선택 */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="input-label">부서 / 직위</label>
                <input
                  type="text"
                  className="input-field"
                  value={`${data.department} ${data.position}`.trim()}
                  onChange={(e) =>
                    setData((p) => ({ ...p, department: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">입사일</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.hireDate}
                  onChange={(e) =>
                    setData((p) => ({ ...p, hireDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="input-label">합의 퇴직일 *</label>
                <input
                  type="date"
                  className="input-field"
                  value={data.separationDate}
                  onChange={(e) =>
                    setData((p) => ({ ...p, separationDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 합의 내용 */}
          <div className="form-section">
            <h3 className="form-section-title">📝 합의 내용</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">퇴직 사유 *</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={data.reason}
                  onChange={(e) =>
                    setData((p) => ({ ...p, reason: e.target.value }))
                  }
                  placeholder="경영상 사유에 의한 인력 구조조정"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">퇴직금 지급일</label>
                  <input
                    type="date"
                    className="input-field"
                    value={data.severancePayDate}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        severancePayDate: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-[var(--text-light)] mt-1">
                    퇴직일로부터 14일 이내 지급 의무
                  </p>
                </div>
                <div>
                  <label className="input-label">위로금 (합의금)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={data.consolationMoney || ""}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        consolationMoney: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 합의 조건 */}
          <div className="form-section">
            <h3 className="form-section-title">✅ 합의 조건</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.unusedLeaveSettlement}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      unusedLeaveSettlement: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded accent-indigo-600"
                />
                <span className="text-sm">미사용 연차 수당 정산 포함</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.confidentiality}
                  onChange={(e) =>
                    setData((p) => ({
                      ...p,
                      confidentiality: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded accent-indigo-600"
                />
                <span className="text-sm">
                  비밀유지 조항 (회사 기밀 및 합의 내용 비공개)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.noLitigation}
                  onChange={(e) =>
                    setData((p) => ({ ...p, noLitigation: e.target.checked }))
                  }
                  className="w-5 h-5 rounded accent-indigo-600"
                />
                <span className="text-sm">
                  부제소 합의 (상호 민·형사상 책임 불문)
                </span>
              </label>
            </div>
            <div className="mt-4">
              <label className="input-label">특약사항</label>
              <textarea
                className="input-field min-h-[80px]"
                value={data.specialTerms}
                onChange={(e) =>
                  setData((p) => ({ ...p, specialTerms: e.target.value }))
                }
                placeholder="추가 합의 사항이 있으면 기재하세요"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
            <strong>참고:</strong> 권고사직은 근로자의 자유의사에 의한 합의가
            전제됩니다. 사실상 강압에 의한 사직 유도는 부당해고로 판단될 수
            있으므로, 반드시 근로자의 진정한 의사에 기반하여 작성하시기
            바랍니다.
          </div>

          <button
            onClick={() => setShowPreview(true)}
            className="btn btn-primary"
            disabled={!canPreview}
          >
            미리보기
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 no-print">
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
            <EmailSendButton
              documentTitle={`권고사직 합의서 — ${data.employeeName}`}
              documentType="권고사직 합의서"
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
              권 고 사 직 합 의 서
            </h1>

            <p className="text-sm leading-7 mb-6">
              {data.company.name} (이하 &ldquo;회사&rdquo;)과{" "}
              {data.employeeName} (이하 &ldquo;근로자&rdquo;)은 아래와 같이
              근로관계의 종료에 관하여 상호 합의한다.
            </p>

            <div className="text-sm leading-8 space-y-4 mb-8">
              <div className="p-4 border border-[var(--border)] rounded">
                <p className="font-bold mb-2">제1조 (합의 퇴직)</p>
                <p>
                  근로자는 {formatDate(data.separationDate)}부로 회사를
                  퇴직하며, 그 사유는 다음과 같다.
                </p>
                <p className="mt-2 pl-4 text-gray-600">사유: {data.reason}</p>
              </div>

              <div className="p-4 border border-[var(--border)] rounded">
                <p className="font-bold mb-2">제2조 (퇴직금 및 정산)</p>
                <p>
                  회사는 근로기준법 및 근로자퇴직급여보장법에 따라 산정된
                  퇴직금을
                  {data.severancePayDate
                    ? ` ${formatDate(data.severancePayDate)}까지`
                    : " 퇴직일로부터 14일 이내에"}{" "}
                  근로자에게 지급한다.
                </p>
                {data.unusedLeaveSettlement && (
                  <p className="mt-1">
                    미사용 연차 유급휴가 수당을 퇴직금과 함께 정산하여 지급한다.
                  </p>
                )}
                {data.consolationMoney > 0 && (
                  <p className="mt-1">
                    회사는 근로자에게 위로금으로 금{" "}
                    {formatCurrency(data.consolationMoney)}을 별도 지급한다.
                  </p>
                )}
              </div>

              {data.confidentiality && (
                <div className="p-4 border border-[var(--border)] rounded">
                  <p className="font-bold mb-2">제3조 (비밀유지)</p>
                  <p>
                    근로자는 재직 중 취득한 회사의 영업비밀, 고객정보, 기술정보
                    등을 퇴직 후에도 제3자에게 누설하거나 이용하지 아니한다.
                    또한, 본 합의의 내용을 상호 비밀로 유지한다.
                  </p>
                </div>
              )}

              {data.noLitigation && (
                <div className="p-4 border border-[var(--border)] rounded">
                  <p className="font-bold mb-2">
                    제{data.confidentiality ? "4" : "3"}조 (부제소 합의)
                  </p>
                  <p>
                    회사와 근로자는 본 합의 이행을 조건으로, 상호 간
                    근로관계에서 발생한 일체의 민사·형사·행정상 청구를 하지
                    아니한다.
                  </p>
                </div>
              )}

              {data.specialTerms && (
                <div className="p-4 border border-[var(--border)] rounded">
                  <p className="font-bold mb-2">
                    제
                    {(data.confidentiality ? 4 : 3) +
                      (data.noLitigation ? 1 : 0)}
                    조 (특약사항)
                  </p>
                  <p className="whitespace-pre-wrap">{data.specialTerms}</p>
                </div>
              )}
            </div>

            <p className="text-sm text-center mb-2 leading-relaxed">
              위 합의 내용을 확인하고, 상호 자유로운 의사에 기하여 본 합의서
              2부를 작성하여 각 1부씩 보관한다.
            </p>

            <p className="text-center text-sm mb-10">
              {formatDate(data.issueDate)}
            </p>

            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="text-center">
                <p className="font-bold mb-1">[회사]</p>
                <p>{data.company.name}</p>
                <p>대표이사 {data.company.ceoName}</p>
                <p className="mt-4 border-b border-gray-400 inline-block w-32">
                  &nbsp;
                </p>
                <p className="text-xs text-gray-500 mt-1">(서명 또는 인)</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-1">[근로자]</p>
                <p>{data.employeeName}</p>
                <p>
                  {data.department} {data.position}
                </p>
                <p className="mt-4 border-b border-gray-400 inline-block w-32">
                  &nbsp;
                </p>
                <p className="text-xs text-gray-500 mt-1">(서명 또는 인)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
