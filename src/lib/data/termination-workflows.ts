export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  legalBasis?: string;
  documentLink?: string;
  documentLabel?: string;
  caution?: string;
}

export type TerminationType =
  | "권고사직"
  | "정리해고"
  | "자발적퇴사"
  | "징계해고"
  | "계약만료";

export interface TerminationTypeInfo {
  type: TerminationType;
  icon: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
}

export const terminationWorkflows: TerminationTypeInfo[] = [
  {
    type: "권고사직",
    icon: "🤝",
    title: "권고사직",
    description:
      "AI 도입 등 경영상 사유로 인력 감축이 필요할 때. 근로자와 합의하에 퇴직 처리.",
    steps: [
      {
        id: "rs-1",
        title: "퇴직 면담 실시",
        description:
          "근로자에게 경영상 사유를 설명하고, 권고사직 의사를 타진합니다. 면담 내용은 반드시 기록으로 남겨야 합니다.",
        legalBasis:
          "근로자의 자유의사에 의한 합의가 전제. 강압 시 부당해고로 판단될 수 있음.",
        caution: "녹취 또는 서면 기록 필수. 면담 시 증인(HR 담당자) 동석 권장.",
      },
      {
        id: "rs-2",
        title: "권고사직 합의서 작성",
        description:
          "양측이 합의한 퇴직 조건(퇴직일, 위로금, 연차정산 등)을 문서화합니다.",
        documentLink: "/documents/separation-agreement",
        documentLabel: "권고사직 합의서 작성",
        caution: "합의서 2부 작성, 각 1부씩 보관. 근로자 서명 필수.",
      },
      {
        id: "rs-3",
        title: "퇴직 통합 정산",
        description:
          "퇴직금 + 미사용 연차수당 + 위로금을 합산하여 정산서를 작성합니다.",
        documentLink: "/documents/settlement",
        documentLabel: "퇴직 통합 정산서 작성",
        legalBasis: "근로자퇴직급여보장법 제9조: 퇴직일로부터 14일 이내 지급",
      },
      {
        id: "rs-4",
        title: "4대보험 상실 신고",
        description:
          "국민연금, 건강보험, 고용보험, 산재보험 자격상실 신고를 진행합니다.\n\n📋 체크리스트:\n☐ 국민연금 상실신고 (퇴직일 다음달 15일까지)\n☐ 건강보험 상실신고 (퇴직일로부터 14일 이내)\n☐ 고용보험 상실신고 + 이직확인서 (퇴직일 다음달 15일까지)\n☐ 산재보험 상실신고 (근로복지공단)",
        documentLink: "/guide/insurance-loss",
        documentLabel: "4대보험 상실 신고 가이드",
        legalBasis:
          "고용보험법 제118조: 이직확인서 미제출 시 과태료 최대 300만원",
        caution:
          "이직확인서 이직사유를 정확히 기재해야 실업급여 수급 가능. EDI(4대사회보험 정보연계센터)에서 일괄 처리 가능.",
      },
      {
        id: "rs-5",
        title: "업무 인수인계",
        description: "퇴직 전 담당 업무를 후임자에게 인수인계합니다.",
        documentLink: "/documents/handover",
        documentLabel: "업무인수인계서 작성",
      },
      {
        id: "rs-6",
        title: "경력증명서 발급",
        description: "퇴직자 요청 시 경력증명서를 발급합니다.",
        documentLink: "/documents/career-certificate",
        documentLabel: "경력증명서 작성",
        legalBasis: "근로기준법 제39조: 사용증명서 교부 의무",
      },
    ],
  },
  {
    type: "정리해고",
    icon: "📉",
    title: "정리해고",
    description: "긴박한 경영상 필요에 의한 해고. 엄격한 법적 요건 충족 필요.",
    steps: [
      {
        id: "rl-1",
        title: "해고 회피 노력 증빙",
        description:
          "경비절감, 배치전환, 근로시간 단축, 신규채용 중단 등 해고를 회피하기 위한 노력을 했음을 증빙합니다.",
        legalBasis:
          "근로기준법 제24조 ①항: 긴박한 경영상의 필요 + 해고 회피 노력",
        caution:
          "이 증빙이 부족하면 부당해고로 판정됨. 이사회 의사록, 경비절감 실적 등 객관적 자료 준비.",
      },
      {
        id: "rl-2",
        title: "해고 기준 수립 + 근로자 대표 협의",
        description:
          "합리적이고 공정한 해고 기준을 수립하고, 근로자 대표(또는 과반수 노조)에게 50일 전 통보 후 성실히 협의합니다.",
        legalBasis: "근로기준법 제24조 ③항: 50일 전 통보 + 성실 협의 의무",
        caution:
          '협의 결과 합의가 이루어지지 않더라도 협의 "과정"이 중요. 협의 기록 보관.',
      },
      {
        id: "rl-3",
        title: "해고통보서 발송 (30일 전)",
        description:
          "해고 대상 근로자에게 서면으로 해고 사유와 시기를 통보합니다.",
        documentLink: "/documents/termination-notice",
        documentLabel: "해고통보서 작성",
        legalBasis:
          "근로기준법 제26조: 30일 전 서면 예고. 미예고 시 30일분 통상임금 지급",
      },
      {
        id: "rl-4",
        title: "퇴직 통합 정산",
        description:
          "퇴직금 + 미사용 연차수당 + 해고예고수당을 합산 정산합니다.",
        documentLink: "/documents/settlement",
        documentLabel: "퇴직 통합 정산서 작성",
        legalBasis: "근로자퇴직급여보장법 제9조: 퇴직일로부터 14일 이내 지급",
      },
      {
        id: "rl-5",
        title: "4대보험 상실 신고",
        description:
          "자격상실 신고 + 이직확인서 제출을 진행합니다.\n\n📋 체크리스트:\n☐ 국민연금 상실신고 (다음달 15일까지)\n☐ 건강보험 상실신고 (14일 이내)\n☐ 고용보험 상실신고 + 이직확인서\n☐ 산재보험 상실신고",
        documentLink: "/guide/insurance-loss",
        documentLabel: "4대보험 상실 신고 가이드",
        caution:
          '정리해고 시 이직확인서에 "경영상 필요에 의한 해고"로 기재 → 실업급여 수급 가능.',
      },
      {
        id: "rl-6",
        title: "업무 인수인계",
        description: "퇴직 전 업무 인수인계를 진행합니다.",
        documentLink: "/documents/handover",
        documentLabel: "업무인수인계서 작성",
      },
      {
        id: "rl-7",
        title: "경력증명서 발급",
        description: "퇴직자 요청 시 경력증명서를 발급합니다.",
        documentLink: "/documents/career-certificate",
        documentLabel: "경력증명서 작성",
        legalBasis: "근로기준법 제39조: 사용증명서 교부 의무",
      },
    ],
  },
  {
    type: "자발적퇴사",
    icon: "👋",
    title: "자발적 퇴사 (자진 사직)",
    description: "근로자 본인의 의사로 퇴직하는 경우.",
    steps: [
      {
        id: "vr-1",
        title: "사직서 수령",
        description: "근로자로부터 사직서를 접수합니다.",
        documentLink: "/documents/resignation",
        documentLabel: "사직서 양식",
        caution:
          "사직 의사가 진정한 의사인지 확인. 강압에 의한 사직 유도는 부당해고로 판단.",
      },
      {
        id: "vr-2",
        title: "퇴직 통합 정산",
        description: "퇴직금 + 미사용 연차수당을 정산합니다.",
        documentLink: "/documents/settlement",
        documentLabel: "퇴직 통합 정산서 작성",
        legalBasis: "근로자퇴직급여보장법 제9조: 퇴직일로부터 14일 이내 지급",
      },
      {
        id: "vr-3",
        title: "4대보험 상실 신고",
        description:
          "자격상실 신고 + 이직확인서를 제출합니다.\n\n📋 체크리스트:\n☐ 국민연금 상실신고 (다음달 15일까지)\n☐ 건강보험 상실신고 (14일 이내)\n☐ 고용보험 상실신고 + 이직확인서\n☐ 산재보험 상실신고",
        documentLink: "/guide/insurance-loss",
        documentLabel: "4대보험 상실 신고 가이드",
        caution:
          "자발적 퇴사도 이직확인서 제출 의무 있음. 자발적 퇴사 시 실업급여 수급 제한.",
      },
      {
        id: "vr-4",
        title: "업무 인수인계",
        description: "후임자에게 업무를 인수인계합니다.",
        documentLink: "/documents/handover",
        documentLabel: "업무인수인계서 작성",
      },
      {
        id: "vr-5",
        title: "경력증명서 발급",
        description: "요청 시 경력증명서를 발급합니다.",
        documentLink: "/documents/career-certificate",
        documentLabel: "경력증명서 작성",
        legalBasis: "근로기준법 제39조: 사용증명서 교부 의무",
      },
    ],
  },
  {
    type: "징계해고",
    icon: "⚖️",
    title: "징계해고",
    description: "근로자의 중대한 비위행위에 대한 징계 처분으로서의 해고.",
    steps: [
      {
        id: "dd-1",
        title: "징계위원회 개최",
        description:
          "취업규칙에 정한 징계 절차에 따라 징계위원회를 소집하고, 해당 근로자에게 소명 기회를 부여합니다.",
        legalBasis:
          "근로기준법 제23조: 정당한 이유 없이 해고 불가. 절차적 정당성도 필수.",
        caution:
          "소명 기회 미부여 시 부당해고 판정. 징계위원회 의사록, 증거자료 보관.",
      },
      {
        id: "dd-2",
        title: "징계통보서 발송",
        description:
          "징계위원회 결과에 따라 징계(해고) 사유와 처분을 서면으로 통보합니다.",
        documentLink: "/documents/disciplinary-notice",
        documentLabel: "징계통보서 작성",
        legalBasis: "근로기준법 제27조: 해고 사유·시기를 서면으로 통지",
        caution: "근로자는 통보일로부터 10일 이내 이의 신청 가능.",
      },
      {
        id: "dd-3",
        title: "해고통보서 발송 (30일 전)",
        description: "해고 효력일 30일 전에 서면으로 통보합니다.",
        documentLink: "/documents/termination-notice",
        documentLabel: "해고통보서 작성",
        legalBasis:
          "근로기준법 제26조: 30일 전 예고 (단, 근로자 귀책 사유가 명백한 경우 예외 가능)",
      },
      {
        id: "dd-4",
        title: "퇴직 통합 정산",
        description: "퇴직금 + 미사용 연차수당 + 해고예고수당을 정산합니다.",
        documentLink: "/documents/settlement",
        documentLabel: "퇴직 통합 정산서 작성",
        caution: "징계해고라도 퇴직금 지급 의무는 동일 (1년 이상 근속 시).",
      },
      {
        id: "dd-5",
        title: "4대보험 상실 신고",
        description:
          "자격상실 신고를 진행합니다.\n\n📋 체크리스트:\n☐ 국민연금 상실신고 (다음달 15일까지)\n☐ 건강보험 상실신고 (14일 이내)\n☐ 고용보험 상실신고 + 이직확인서\n☐ 산재보험 상실신고",
        documentLink: "/guide/insurance-loss",
        documentLabel: "4대보험 상실 신고 가이드",
      },
      {
        id: "dd-6",
        title: "업무 인수인계",
        description: "업무 인수인계를 진행합니다.",
        documentLink: "/documents/handover",
        documentLabel: "업무인수인계서 작성",
      },
      {
        id: "dd-7",
        title: "경력증명서 발급",
        description: "요청 시 경력증명서를 발급합니다.",
        documentLink: "/documents/career-certificate",
        documentLabel: "경력증명서 작성",
      },
    ],
  },
  {
    type: "계약만료",
    icon: "📅",
    title: "계약만료 (기간제·파트타임)",
    description: "근로계약 기간이 만료되어 갱신하지 않는 경우.",
    steps: [
      {
        id: "ce-1",
        title: "계약 만료 30일 전 통보",
        description:
          "계약 만료일 30일 전까지 근로자에게 갱신하지 않음을 통보합니다.",
        legalBasis: "기간제법 제17조: 계약 기간 만료 사실 서면 통지",
        caution:
          "2년 초과 사용 시 무기계약 전환 의무 발생 (기간제법 제4조). 통보 없이 계속 근무 시 묵시적 갱신.",
      },
      {
        id: "ce-2",
        title: "퇴직 통합 정산",
        description: "퇴직금 + 미사용 연차수당을 정산합니다.",
        documentLink: "/documents/settlement",
        documentLabel: "퇴직 통합 정산서 작성",
        legalBasis: "1년 이상 근속 시 퇴직금 발생",
      },
      {
        id: "ce-3",
        title: "4대보험 상실 신고",
        description:
          "자격상실 신고 + 이직확인서를 제출합니다.\n\n📋 체크리스트:\n☐ 국민연금 상실신고 (다음달 15일까지)\n☐ 건강보험 상실신고 (14일 이내)\n☐ 고용보험 상실신고 + 이직확인서\n☐ 산재보험 상실신고",
        documentLink: "/guide/insurance-loss",
        documentLabel: "4대보험 상실 신고 가이드",
        caution:
          '계약만료에 의한 퇴직도 이직확인서 제출 필수. 이직사유 "계약만료"로 기재.',
      },
      {
        id: "ce-4",
        title: "업무 인수인계",
        description: "후임자에게 업무를 인수인계합니다.",
        documentLink: "/documents/handover",
        documentLabel: "업무인수인계서 작성",
      },
      {
        id: "ce-5",
        title: "경력증명서 발급",
        description: "요청 시 경력증명서를 발급합니다.",
        documentLink: "/documents/career-certificate",
        documentLabel: "경력증명서 작성",
      },
    ],
  },
];
