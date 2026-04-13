"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { CompanyInfo, EmployeeInfo } from "@/types";
import HelpGuide from "@/components/HelpGuide";
import { useDocumentSave } from "@/hooks/useDocumentSave";
import {
  formatDate,
  formatCurrency,
  formatBusinessNumber,
  formatPhoneNumber,
  autoFormatResidentNumber,
  autoFormatPhone,
} from "@/lib/storage";
import { useCompanyInfo, defaultCompanyInfo } from "@/hooks/useCompanyInfo";
import MobileFormWizard from "@/components/MobileFormWizard";
import { useAutoSave } from "@/hooks/useAutoSave";
import Breadcrumb from "@/components/Breadcrumb";
import AutoSaveStatus from "@/components/AutoSaveStatus";

type JobCategory =
  | "cleaning"
  | "facility"
  | "logistics"
  | "beauty"
  | "fitness"
  | "it_creative";

interface JobCategoryInfo {
  id: JobCategory;
  label: string;
  icon: string;
  description: string;
  contractTitle: string;
  projectPlaceholder: string;
  deliverablePlaceholder: string;
  obligations: string[];
  contractNature: string[];
  additionalClauses?: { title: string; content: string }[];
}

const JOB_CATEGORIES: JobCategoryInfo[] = [
  {
    id: "cleaning",
    label: "청소·위생",
    icon: "🧹",
    description: "건물 청소, 방역, 위생관리 등",
    contractTitle: "용역(도급) 계약서 [청소·위생]",
    projectPlaceholder: "예: OO빌딩 공용부분 청소 용역",
    deliverablePlaceholder: "예: 일일 청소 완료 보고, 월간 점검 리포트",
    obligations: [
      "을은 본 계약에서 정한 작업 범위 및 기준에 따라 청소·위생 업무를 수행하여야 한다.",
      "을은 작업에 필요한 청소 도구 및 소모품을 자기 비용으로 준비한다. (단, 갑이 별도 제공하기로 한 경우 제외)",
      "을은 업무 수행 중 알게 된 갑의 시설 정보 및 영업비밀을 제3자에게 누설하여서는 아니 된다.",
      "을은 작업 수행 시 산업안전보건법 등 관계 법령을 준수하여야 한다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급계약으로서, 을은 독립된 사업자로서 자신의 책임 하에 업무를 수행한다.",
      "을은 갑이 정한 작업 범위 내에서 작업의 순서, 방법, 인원 배치를 자율적으로 결정한다.",
      "갑은 작업의 완성(결과물)에 대하여 지시할 수 있으나, 을의 작업 수행 과정에 대한 지휘·감독권을 갖지 아니한다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
    additionalClauses: [
      {
        title: "작업 범위 및 기준",
        content:
          '을은 갑이 지정한 장소에서 별첨 "작업기준서"에 따라 업무를 수행한다. 작업기준서에 명시되지 않은 사항은 갑과 을이 협의하여 정한다.',
      },
    ],
  },
  {
    id: "facility",
    label: "시설관리·경비",
    icon: "🏢",
    description: "시설 유지보수, 경비, 주차관리 등",
    contractTitle: "용역(도급) 계약서 [시설관리]",
    projectPlaceholder: "예: OO건물 시설관리 용역",
    deliverablePlaceholder: "예: 월간 시설점검 보고서, 수선 완료 보고",
    obligations: [
      "을은 본 계약에서 정한 시설관리 업무를 성실히 수행하여야 한다.",
      "을은 시설물의 이상 발견 시 즉시 갑에게 보고하고, 긴급한 경우 필요한 응급조치를 취하여야 한다.",
      "을은 관리 업무에 필요한 인력을 자기 책임으로 배치·운영한다.",
      "을은 업무 수행 중 알게 된 갑의 시설 정보 및 영업비밀을 제3자에게 누설하여서는 아니 된다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급계약으로서, 을은 독립된 사업자로서 자신의 책임 하에 시설관리 업무를 수행한다.",
      "을은 관리 인력의 배치, 교대, 업무 분배를 자율적으로 결정하며, 갑은 이에 관여하지 아니한다.",
      "갑은 관리 결과에 대한 품질 기준을 제시할 수 있으나, 을의 업무 수행 방법에 대한 직접적 지휘·감독권을 갖지 아니한다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
    additionalClauses: [
      {
        title: "관리 범위",
        content:
          '을의 관리 범위는 별첨 "시설관리 범위서"에 따른다. 범위 외 업무 요청 시 갑과 을은 별도 협의한다.',
      },
    ],
  },
  {
    id: "logistics",
    label: "물류·배송",
    icon: "🚚",
    description: "배송, 운송, 택배, 퀵서비스 등",
    contractTitle: "용역(도급) 계약서 [물류·배송]",
    projectPlaceholder: "예: 수도권 지역 배송 용역",
    deliverablePlaceholder: "예: 일일 배송 완료 내역, 월간 배송 실적 보고",
    obligations: [
      "을은 본 계약에서 정한 배송·운송 업무를 성실히 수행하여야 한다.",
      "을은 자기 소유(또는 자기 비용으로 임차)한 차량 및 장비를 사용하여 업무를 수행한다.",
      "을은 배송물의 파손·분실 방지를 위해 주의의무를 다하여야 한다.",
      "을은 도로교통법 등 관계 법령을 준수하여야 한다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급(운송)계약으로서, 을은 독립된 사업자로서 자신의 책임 하에 업무를 수행한다.",
      "을은 자기 소유 차량 및 장비를 사용하며, 배송 경로·순서·시간을 자율적으로 결정한다.",
      "을은 갑 이외의 타 업체로부터 배송 업무를 겸업할 수 있다.",
      "갑은 배송 물량 및 목적지를 지정하나, 을의 업무 수행 방법에 대한 지휘·감독권을 갖지 아니한다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
    additionalClauses: [
      {
        title: "차량 및 장비",
        content:
          "을은 업무 수행에 사용하는 차량의 유지·보수·보험 비용을 자기 부담으로 한다. 차량 관련 사고 발생 시 을이 자기 책임으로 처리한다.",
      },
      {
        title: "겸업",
        content:
          "을은 본 계약의 이행에 지장이 없는 범위 내에서 다른 업체의 업무를 겸업할 수 있다.",
      },
    ],
  },
  {
    id: "beauty",
    label: "미용·뷰티",
    icon: "💇",
    description: "헤어, 네일, 피부관리, 메이크업 등",
    contractTitle: "용역(도급) 계약서 [미용·뷰티]",
    projectPlaceholder: "예: OO샵 미용 시술 용역",
    deliverablePlaceholder: "예: 시술 완료 건수, 고객 관리 내역",
    obligations: [
      "을은 본 계약에서 정한 미용·시술 업무를 성실히 수행하여야 한다.",
      "을은 관련 자격증 및 면허를 보유·유지하여야 하며, 갑의 요청 시 이를 제시하여야 한다.",
      "을은 시술 시 위생관리법, 공중위생관리법 등 관계 법령을 준수하여야 한다.",
      "을은 고객의 개인정보를 보호하고, 갑의 영업비밀을 누설하여서는 아니 된다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급계약으로서, 을은 독립된 사업자(자격 보유자)로서 자신의 기술과 판단에 따라 시술한다.",
      "을은 자신의 고객을 독립적으로 관리하며, 시술의 방법·순서를 자율적으로 결정한다.",
      "갑은 시설 이용에 관한 기본 규칙을 정할 수 있으나, 을의 시술 방법에 대한 지휘·감독권을 갖지 아니한다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
    additionalClauses: [
      {
        title: "자격 요건",
        content:
          "을은 해당 업무에 필요한 자격증(미용사 면허 등)을 보유하여야 하며, 자격이 상실된 경우 즉시 갑에게 통보하여야 한다.",
      },
      {
        title: "시설 이용 및 수익 배분",
        content:
          "을은 갑의 시설을 이용하여 업무를 수행하며, 수익 배분 비율은 별도 합의에 따른다. 시설이용료는 월 금 ___원으로 한다.",
      },
    ],
  },
  {
    id: "fitness",
    label: "헬스·PT",
    icon: "💪",
    description: "퍼스널트레이닝, 요가, 필라테스 등",
    contractTitle: "용역(도급) 계약서 [헬스·PT]",
    projectPlaceholder: "예: OO피트니스 PT 지도 용역",
    deliverablePlaceholder: "예: 수강 완료 보고, 회원 관리 내역",
    obligations: [
      "을은 본 계약에서 정한 운동지도·트레이닝 업무를 성실히 수행하여야 한다.",
      "을은 관련 자격증(생활체육지도사, PT자격증 등)을 보유·유지하여야 한다.",
      "을은 회원의 안전에 주의를 기울이고, 부상 방지를 위한 적절한 조치를 취하여야 한다.",
      "을은 회원의 개인정보를 보호하고, 갑의 영업비밀을 누설하여서는 아니 된다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급계약으로서, 을은 독립된 사업자(자격 보유자)로서 자신의 전문성과 판단에 따라 운동을 지도한다.",
      "을은 수강 스케줄, 운동 프로그램, 지도 방법을 자율적으로 결정한다.",
      "갑은 시설 이용에 관한 기본 규칙을 정할 수 있으나, 을의 지도 방법에 대한 지휘·감독권을 갖지 아니한다.",
      "을은 갑의 시설 외에서 독립적으로 다른 활동을 할 수 있다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
    additionalClauses: [
      {
        title: "자격 요건",
        content:
          "을은 해당 업무에 필요한 자격증(생활체육지도사, 관련 PT자격증 등)을 보유하여야 하며, 자격이 상실된 경우 즉시 갑에게 통보하여야 한다.",
      },
      {
        title: "시설 이용 및 수익 배분",
        content:
          "을은 갑의 시설을 이용하여 업무를 수행하며, 수강료 수익 배분 비율은 별도 합의에 따른다. 시설이용료는 월 금 ___원으로 한다.",
      },
    ],
  },
  {
    id: "it_creative",
    label: "IT·디자인·크리에이티브",
    icon: "💻",
    description: "개발, 디자인, 영상, 글쓰기 등",
    contractTitle: "용역(도급) 계약서",
    projectPlaceholder: "예: 홈페이지 리뉴얼 프로젝트",
    deliverablePlaceholder:
      "예: 디자인 시안 3종, 퍼블리싱 완료 파일, 소스코드 일체",
    obligations: [
      "을은 본 계약에 따른 업무를 성실히 수행하여야 한다.",
      "을은 업무 수행 중 알게 된 갑의 영업비밀을 제3자에게 누설하여서는 아니 된다.",
      "을은 갑의 사전 서면 동의 없이 업무의 전부 또는 일부를 제3자에게 위탁하여서는 아니 된다.",
    ],
    contractNature: [
      "본 계약은 민법상 도급계약으로서, 을은 독립된 사업자로서 자신의 책임 하에 업무를 수행한다.",
      "을은 갑의 지휘·감독을 받지 아니하며, 업무 수행의 시간·장소·방법을 자유롭게 결정한다.",
      "갑과 을 사이에는 근로기준법상 근로관계가 성립하지 아니한다.",
    ],
  },
];

interface FreelancerContractData {
  company: CompanyInfo;
  contractor: EmployeeInfo;
  jobCategory: JobCategory;
  contractDate: string;
  startDate: string;
  endDate: string;
  projectName: string;
  projectDescription: string;
  deliverables: string;
  totalFee: number;
  includesVat: boolean;
  paymentSchedule: {
    description: string;
    amount: number;
    dueDate: string;
  }[];
  taxWithholding: number;
}

const defaultContractor: EmployeeInfo = {
  name: "",
  residentNumber: "",
  address: "",
  phone: "",
};

const defaultContract: FreelancerContractData = {
  company: defaultCompanyInfo,
  contractor: defaultContractor,
  jobCategory: "it_creative",
  contractDate: new Date().toISOString().split("T")[0],
  startDate: "",
  endDate: "",
  projectName: "",
  projectDescription: "",
  deliverables: "",
  totalFee: 0,
  includesVat: false,
  paymentSchedule: [
    { description: "계약금", amount: 0, dueDate: "" },
    { description: "잔금", amount: 0, dueDate: "" },
  ],
  taxWithholding: 3.3,
};

export default function FreelancerContractPage() {
  const { companyInfo, loading: companyLoading } = useCompanyInfo();

  const [contract, setContract] =
    useState<FreelancerContractData>(defaultContract);
  const [showPreview, setShowPreview] = useState(false);

  const {
    restore,
    clear: clearAutoSave,
    lastSavedAt,
  } = useAutoSave("contract_freelancer", contract, !showPreview);
  const [autoSaveRestored, setAutoSaveRestored] = useState(false);

  useEffect(() => {
    setContract((prev) => ({ ...prev, company: companyInfo }));
  }, [companyInfo]);

  useEffect(() => {
    if (!autoSaveRestored && !companyLoading) {
      const saved = restore();
      if (saved) {
        setContract((prev) => ({ ...saved, company: prev.company }));
        setAutoSaveRestored(true);
      }
    }
  }, [companyLoading, autoSaveRestored, restore]);
  const printRef = useRef<HTMLDivElement>(null);
  const { saveDocument, saving, saved } = useDocumentSave();

  const handleSaveToArchive = async () => {
    await saveDocument({
      docType: "contract_freelancer",
      title: `프리랜서 계약서 - ${contract.contractor.name || "이름없음"} (${contract.projectName || "프로젝트"})`,
      data: contract as unknown as Record<string, unknown>,
    });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `프리랜서_계약서_${contract.contractor.name || "이름없음"}`,
  });

  const updateContract = (field: string, value: unknown) => {
    setContract((prev) => ({ ...prev, [field]: value }));
  };

  const updateContractor = (field: keyof EmployeeInfo, value: string) => {
    setContract((prev) => ({
      ...prev,
      contractor: { ...prev.contractor, [field]: value },
    }));
  };

  const updatePaymentSchedule = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    setContract((prev) => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addPaymentSchedule = () => {
    setContract((prev) => ({
      ...prev,
      paymentSchedule: [
        ...prev.paymentSchedule,
        { description: "", amount: 0, dueDate: "" },
      ],
    }));
  };

  const removePaymentSchedule = (index: number) => {
    setContract((prev) => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.filter((_, i) => i !== index),
    }));
  };

  const categoryInfo =
    JOB_CATEGORIES.find((c) => c.id === contract.jobCategory) ||
    JOB_CATEGORIES[JOB_CATEGORIES.length - 1];

  // 원천징수 금액 계산 (부가세 분리)
  const supplyPrice = contract.includesVat
    ? Math.round(contract.totalFee / 1.1)
    : contract.totalFee;
  const vatAmount = contract.includesVat ? contract.totalFee - supplyPrice : 0;
  const withholdingAmount = Math.round(
    supplyPrice * (contract.taxWithholding / 100),
  );
  const netAmount = contract.totalFee - withholdingAmount;

  // 분할지급 합계 검증
  const paymentTotal = contract.paymentSchedule.reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const paymentMismatch =
    contract.totalFee > 0 &&
    paymentTotal > 0 &&
    paymentTotal !== contract.totalFee;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: "홈", href: "/dashboard" },
          { label: "계약서", href: "/contract" },
          { label: "프리랜서 계약서" },
        ]}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            💼 프리랜서 계약서
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            용역/도급 계약서를 작성합니다.
          </p>
          <AutoSaveStatus lastSavedAt={lastSavedAt} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary"
          >
            {showPreview ? "✏️ 수정하기" : "👁️ 미리보기"}
          </button>
          {showPreview && (
            <button
              onClick={handleSaveToArchive}
              disabled={saving}
              className="btn-secondary disabled:opacity-50"
            >
              {saving ? "저장 중..." : saved ? "✓ 저장됨" : "🗄️ 보관함에 저장"}
            </button>
          )}
          <button onClick={() => handlePrint()} className="btn-primary">
            🖨️ 인쇄/PDF
          </button>
        </div>
      </div>

      {autoSaveRestored && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
          <span className="text-sm text-amber-700">
            이전에 작성하던 계약서가 복원되었습니다.
          </span>
          <button
            onClick={() => {
              clearAutoSave();
              setContract({ ...defaultContract, company: companyInfo });
              setAutoSaveRestored(false);
            }}
            className="text-xs text-amber-600 underline hover:text-amber-800"
          >
            새로 작성
          </button>
        </div>
      )}

      <HelpGuide
        pageKey="contract-freelancer"
        steps={[
          "갑(발주자)과 을(수급자) 정보를 각각 입력하세요.",
          "용역 내용, 기간, 대금을 명확하게 기재하세요.",
          '"미리보기"로 확인 후 "인쇄/PDF"로 출력하세요.',
        ]}
      />

      {!showPreview ? (
        <MobileFormWizard
          steps={[
            {
              title: "직군 선택",
              icon: "📂",
              validate: () => !!contract.jobCategory,
              validationMessage: "직군을 선택해주세요.",
              helpText:
                "직군에 따라 계약 조항이 특화됩니다. 근로자성 분쟁 방어를 위해 해당 직군에 맞는 계약서를 사용하세요.",
              summary: [{ label: "직군", value: categoryInfo.label }],
              content: (
                <div className="space-y-4">
                  <div className="form-section">
                    <h2 className="form-section-title">📂 용역 직군 선택</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      직군에 따라 계약 조항(을의 의무, 계약의 성격 등)이
                      자동으로 특화됩니다.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {JOB_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => updateContract("jobCategory", cat.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            contract.jobCategory === cat.id
                              ? "border-blue-500 bg-blue-50 shadow-md"
                              : "border-[var(--border)] hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="font-semibold text-[var(--text)]">
                              {cat.label}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] ml-10">
                            {cat.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "당사자 정보",
              icon: "🏢",
              validate: () => !!contract.contractor.name,
              validationMessage: "수급인(프리랜서)의 성명을 입력해주세요.",
              helpText:
                "갑(발주자) 정보는 회사 설정에서 자동으로 가져옵니다. 을(수급인) 정보를 직접 입력하세요.",
              summary: [
                { label: "발주자", value: contract.company.name },
                { label: "수급인", value: contract.contractor.name },
              ],
              content: (
                <div className="space-y-6">
                  {/* 갑 (발주자) 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">🏢 갑 (발주자) 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">상호</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.name}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">대표자</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.ceoName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">사업자등록번호</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={formatBusinessNumber(
                            contract.company.businessNumber,
                          )}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="input-label">전화번호</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={formatPhoneNumber(contract.company.phone)}
                          readOnly
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">주소</label>
                        <input
                          type="text"
                          className="input-field bg-[var(--bg)]"
                          value={contract.company.address}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 을 (수급인) 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">
                      👤 을 (수급인/프리랜서) 정보
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">성명 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="홍길동"
                          value={contract.contractor.name}
                          onChange={(e) =>
                            updateContractor("name", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">주민등록번호 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="990101-1234567"
                          value={contract.contractor.residentNumber}
                          onChange={(e) =>
                            updateContractor(
                              "residentNumber",
                              autoFormatResidentNumber(e.target.value),
                            )
                          }
                          maxLength={14}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="input-label">주소 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="서울시 강남구 테헤란로 123"
                          value={contract.contractor.address}
                          onChange={(e) =>
                            updateContractor("address", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">연락처 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="010-1234-5678"
                          value={contract.contractor.phone}
                          onChange={(e) =>
                            updateContractor(
                              "phone",
                              autoFormatPhone(e.target.value),
                            )
                          }
                          maxLength={13}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: "프로젝트·금액",
              validate: () =>
                !!contract.projectName &&
                !!contract.startDate &&
                contract.totalFee > 0,
              validationMessage: "프로젝트명, 시작일, 대금을 입력해주세요.",
              helpText:
                "프리랜서 대금에서 3.3% 원천징수(소득세 3% + 지방소득세 0.3%)가 적용됩니다. 부가세 포함 여부에 따라 실수령액이 달라집니다.",
              icon: "📋",
              content: (
                <div className="space-y-6">
                  {/* 프로젝트 정보 */}
                  <div className="form-section">
                    <h2 className="form-section-title">📋 프로젝트 정보</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="input-label">계약 체결일 *</label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.contractDate}
                          onChange={(e) =>
                            updateContract("contractDate", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">계약 시작일 *</label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.startDate}
                          onChange={(e) =>
                            updateContract("startDate", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="input-label">계약 종료일 *</label>
                        <input
                          type="date"
                          className="input-field"
                          value={contract.endDate}
                          onChange={(e) =>
                            updateContract("endDate", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="input-label">프로젝트명 *</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={categoryInfo.projectPlaceholder}
                          value={contract.projectName}
                          onChange={(e) =>
                            updateContract("projectName", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="input-label">업무 내용 *</label>
                        <textarea
                          className="input-field min-h-[100px]"
                          placeholder="수행할 업무 내용을 상세히 기재하세요"
                          value={contract.projectDescription}
                          onChange={(e) =>
                            updateContract("projectDescription", e.target.value)
                          }
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="input-label">납품물 *</label>
                        <textarea
                          className="input-field min-h-[80px]"
                          placeholder={categoryInfo.deliverablePlaceholder}
                          value={contract.deliverables}
                          onChange={(e) =>
                            updateContract("deliverables", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* 계약 금액 */}
                  <div className="form-section">
                    <h2 className="form-section-title">💰 계약 금액</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">
                          총 계약금액 (원) *
                        </label>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="5000000"
                          value={contract.totalFee || ""}
                          onChange={(e) =>
                            updateContract(
                              "totalFee",
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                        <p className="text-sm text-[var(--text-light)] mt-1">
                          {contract.totalFee > 0 &&
                            `= ${formatCurrency(contract.totalFee)}`}
                        </p>
                      </div>
                      <div>
                        <label className="input-label">원천징수율 (%)</label>
                        <select
                          className="input-field"
                          value={contract.taxWithholding}
                          onChange={(e) =>
                            updateContract(
                              "taxWithholding",
                              parseFloat(e.target.value),
                            )
                          }
                        >
                          <option value={3.3}>3.3% (사업소득)</option>
                          <option value={8.8}>8.8% (기타소득)</option>
                        </select>
                      </div>
                      <div className="flex items-center md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                          <input
                            type="checkbox"
                            checked={contract.includesVat}
                            onChange={(e) =>
                              updateContract("includesVat", e.target.checked)
                            }
                            className="w-5 h-5 text-emerald-600 rounded"
                          />
                          <span className="text-[var(--text)]">
                            총 계약금액에 부가세(VAT 10%) 포함
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 지급 일정 */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="input-label">지급 일정</label>
                        <button
                          type="button"
                          onClick={addPaymentSchedule}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          + 일정 추가
                        </button>
                      </div>
                      <div className="space-y-3">
                        {contract.paymentSchedule.map((schedule, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <input
                              type="text"
                              className="input-field flex-1"
                              placeholder="항목 (예: 계약금)"
                              value={schedule.description}
                              onChange={(e) =>
                                updatePaymentSchedule(
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                            />
                            <input
                              type="number"
                              className="input-field w-36"
                              placeholder="금액"
                              value={schedule.amount || ""}
                              onChange={(e) =>
                                updatePaymentSchedule(
                                  index,
                                  "amount",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                            <input
                              type="date"
                              className="input-field w-40"
                              value={schedule.dueDate}
                              onChange={(e) =>
                                updatePaymentSchedule(
                                  index,
                                  "dueDate",
                                  e.target.value,
                                )
                              }
                            />
                            {contract.paymentSchedule.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePaymentSchedule(index)}
                                className="text-red-500 hover:text-red-700 p-2"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 분할지급 합계 검증 */}
                    {paymentMismatch && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 font-medium">
                          ⚠️ 분할지급 합계({formatCurrency(paymentTotal)})가 총
                          계약금액({formatCurrency(contract.totalFee)})과
                          일치하지 않습니다.
                        </p>
                      </div>
                    )}

                    {/* 정산 금액 */}
                    <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                      <h4 className="font-medium text-emerald-800 mb-2">
                        📊 정산 예상
                      </h4>
                      <div className="text-sm text-emerald-700 space-y-1">
                        <p>총 계약금액: {formatCurrency(contract.totalFee)}</p>
                        {contract.includesVat && (
                          <>
                            <p>공급가액: {formatCurrency(supplyPrice)}</p>
                            <p>부가세(VAT): {formatCurrency(vatAmount)}</p>
                          </>
                        )}
                        <p>
                          원천징수액 ({contract.taxWithholding}% of{" "}
                          {contract.includesVat ? "공급가액" : "계약금액"}): -
                          {formatCurrency(withholdingAmount)}
                        </p>
                        <p className="font-bold text-lg pt-2 border-t border-emerald-200">
                          실수령액: {formatCurrency(netAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
          onComplete={() => {
            clearAutoSave();
            setShowPreview(true);
          }}
          completeLabel="👁️ 미리보기"
        />
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-lg p-8">
          <FreelancerContractPreview contract={contract} />
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
          <FreelancerContractPreview contract={contract} />
        </div>
      </div>
    </div>
  );
}

function FreelancerContractPreview({
  contract,
}: {
  contract: FreelancerContractData;
}) {
  const categoryInfo =
    JOB_CATEGORIES.find((c) => c.id === contract.jobCategory) ||
    JOB_CATEGORIES[JOB_CATEGORIES.length - 1];
  const supplyPrice = contract.includesVat
    ? Math.round(contract.totalFee / 1.1)
    : contract.totalFee;
  const vatAmount = contract.includesVat ? contract.totalFee - supplyPrice : 0;
  const withholdingAmount = Math.round(
    supplyPrice * (contract.taxWithholding / 100),
  );

  return (
    <div
      className="contract-document p-8"
      style={{ fontFamily: "'Nanum Gothic', sans-serif" }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        {categoryInfo.contractTitle}
      </h1>

      <p style={{ marginBottom: "24px", lineHeight: "1.8" }}>
        <strong>{contract.company.name}</strong>(이하 &quot;갑&quot;이라
        함)과(와)
        <strong> {contract.contractor.name}</strong>(이하 &quot;을&quot;이라
        함)은(는) 아래와 같이 용역계약을 체결한다.
      </p>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제1조 (목적)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
        본 계약은 갑이 을에게 아래 업무를 위탁하고, 을은 이를 수행함에 있어
        필요한 사항을 정함을 목적으로 한다.
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "24px",
        }}
      >
        <tbody>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "12px",
                backgroundColor: "#f3f4f6",
                width: "25%",
                textAlign: "left",
              }}
            >
              프로젝트명
            </th>
            <td style={{ border: "1px solid #333", padding: "12px" }}>
              {contract.projectName}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "12px",
                backgroundColor: "#f3f4f6",
                textAlign: "left",
              }}
            >
              업무내용
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {contract.projectDescription}
            </td>
          </tr>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "12px",
                backgroundColor: "#f3f4f6",
                textAlign: "left",
              }}
            >
              납품물
            </th>
            <td
              style={{
                border: "1px solid #333",
                padding: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              {contract.deliverables}
            </td>
          </tr>
        </tbody>
      </table>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제2조 (계약기간)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
        계약기간은 {formatDate(contract.startDate)}부터{" "}
        {formatDate(contract.endDate)}까지로 한다.
      </p>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제3조 (계약금액 및 지급)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "8px" }}>
        ① 총 계약금액: 금 {formatCurrency(contract.totalFee)} (
        {contract.includesVat ? "부가세 포함" : "부가세 별도"})
      </p>
      {contract.includesVat && (
        <p
          style={{
            lineHeight: "1.8",
            marginBottom: "8px",
            color: "#6b7280",
            fontSize: "13px",
            paddingLeft: "16px",
          }}
        >
          (공급가액: {formatCurrency(supplyPrice)}, 부가세:{" "}
          {formatCurrency(vatAmount)})
        </p>
      )}
      <p style={{ lineHeight: "1.8", marginBottom: "8px" }}>
        ② 원천징수: {contract.taxWithholding}% (
        {formatCurrency(withholdingAmount)})
        {contract.includesVat && (
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            {" "}
            (공급가액 기준)
          </span>
        )}
      </p>
      <p style={{ lineHeight: "1.8", marginBottom: "8px" }}>③ 지급일정:</p>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
          marginLeft: "20px",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              구분
            </th>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              금액
            </th>
            <th
              style={{
                border: "1px solid #333",
                padding: "8px",
                backgroundColor: "#f3f4f6",
              }}
            >
              지급일
            </th>
          </tr>
        </thead>
        <tbody>
          {contract.paymentSchedule.map((schedule, index) => (
            <tr key={index}>
              <td
                style={{
                  border: "1px solid #333",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                {schedule.description}
              </td>
              <td
                style={{
                  border: "1px solid #333",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(schedule.amount)}
              </td>
              <td
                style={{
                  border: "1px solid #333",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                {formatDate(schedule.dueDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제4조 (을의 의무)
      </h2>
      <ul
        style={{ paddingLeft: "20px", lineHeight: "1.8", marginBottom: "16px" }}
      >
        {categoryInfo.obligations.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제5조 (갑의 의무)
      </h2>
      <ul
        style={{ paddingLeft: "20px", lineHeight: "1.8", marginBottom: "16px" }}
      >
        <li>갑은 을의 업무 수행에 필요한 자료 및 정보를 제공하여야 한다.</li>
        <li>갑은 제3조에 따른 용역대금을 지급일에 지급하여야 한다.</li>
      </ul>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제6조 (지식재산권)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
        본 계약에 따라 을이 수행한 업무의 결과물에 대한 지식재산권은 용역대금
        완납 시 갑에게 귀속된다.
      </p>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제7조 (계약의 해지)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
        갑 또는 을은 상대방이 본 계약을 위반한 경우 14일 이상의 기간을 정하여
        시정을 요구하고, 그 기간 내에 시정되지 않는 경우 본 계약을 해지할 수
        있다.
      </p>

      <h2
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          marginTop: "24px",
          marginBottom: "12px",
        }}
      >
        제8조 (계약의 성격)
      </h2>
      <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
        {categoryInfo.contractNature.map((item, i) => (
          <span key={i}>
            {"①②③④⑤⑥⑦⑧"[i]} {item}
            {i < categoryInfo.contractNature.length - 1 && <br />}
          </span>
        ))}
        <br />
        <span>
          {"①②③④⑤⑥⑦⑧"[categoryInfo.contractNature.length]} 본 계약은
          근로기준법상 근로계약이 아니므로, 을은 갑을 통한
          국민연금·건강보험·고용보험·산재보험(4대보험) 가입 대상이 아니다. 을은
          사업소득자로서 관련 세금 및 보험을 본인 책임으로 처리한다.
        </span>
      </p>

      {/* 직군별 추가 조항 */}
      {categoryInfo.additionalClauses &&
        categoryInfo.additionalClauses.map((clause, i) => {
          const clauseNum = 9 + i;
          return (
            <div key={i}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginTop: "24px",
                  marginBottom: "12px",
                }}
              >
                제{clauseNum}조 ({clause.title})
              </h2>
              <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
                {clause.content}
              </p>
            </div>
          );
        })}

      {(() => {
        const offset = categoryInfo.additionalClauses?.length || 0;
        return (
          <>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginTop: "24px",
                marginBottom: "12px",
              }}
            >
              제{9 + offset}조 (손해배상)
            </h2>
            <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
              갑 또는 을이 본 계약을 위반하여 상대방에게 손해를 입힌 경우, 그
              손해를 배상할 책임이 있다.
            </p>

            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginTop: "24px",
                marginBottom: "12px",
              }}
            >
              제{10 + offset}조 (분쟁해결)
            </h2>
            <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
              본 계약과 관련하여 분쟁이 발생한 경우, 갑의 주소지를 관할하는
              법원을 제1심 관할법원으로 한다.
            </p>

            <h2
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginTop: "24px",
                marginBottom: "12px",
              }}
            >
              제{11 + offset}조 (기타)
            </h2>
            <p style={{ lineHeight: "1.8", marginBottom: "16px" }}>
              본 계약에 명시되지 않은 사항은 관계 법령 및 상관례에 따르며, 본
              계약서는 2부를 작성하여 갑과 을이 각각 1부씩 보관한다.
            </p>
          </>
        );
      })()}

      <p
        style={{
          textAlign: "center",
          marginTop: "48px",
          marginBottom: "48px",
          fontSize: "14px",
        }}
      >
        {formatDate(contract.contractDate)}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "48px",
        }}
      >
        <div style={{ width: "45%" }}>
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>[갑]</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", width: "80px" }}>상 호:</td>
                <td style={{ padding: "4px 0" }}>{contract.company.name}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>사업자번호:</td>
                <td style={{ padding: "4px 0" }}>
                  {formatBusinessNumber(contract.company.businessNumber)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>주 소:</td>
                <td style={{ padding: "4px 0" }}>{contract.company.address}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>대표자:</td>
                <td style={{ padding: "4px 0" }}>
                  {contract.company.ceoName} (인)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ width: "45%" }}>
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>[을]</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px 0", width: "80px" }}>성 명:</td>
                <td style={{ padding: "4px 0" }}>{contract.contractor.name}</td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>주민번호:</td>
                <td style={{ padding: "4px 0" }}>
                  {contract.contractor.residentNumber}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>주 소:</td>
                <td style={{ padding: "4px 0" }}>
                  {contract.contractor.address}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0" }}>연락처:</td>
                <td style={{ padding: "4px 0" }}>
                  {contract.contractor.phone} (인)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
