/**
 * 퇴직연금 DC/DB 계산 모듈
 *
 * 법적 근거:
 * - 근로자퇴직급여보장법 제2조 (정의)
 * - 근로자퇴직급여보장법 제15조 (확정급여형 - DB)
 * - 근로자퇴직급여보장법 제20조 (확정기여형 - DC)
 * - 근로자퇴직급여보장법 제25조 (개인형퇴직연금 - IRP)
 *
 * DB (확정급여형):
 * - 사용자가 매년 부담금 납입 → 퇴직 시 "퇴직금" 수준 이상 지급 보장
 * - 투자 위험: 사용자 부담
 * - 퇴직급여 = 퇴직금과 동일 (평균임금 × 30일 × 근속년수)
 *
 * DC (확정기여형):
 * - 사용자가 매년 연간임금총액의 1/12 이상을 근로자 개인 계좌에 납입
 * - 투자 위험: 근로자 부담
 * - 퇴직급여 = 적립금 + 운용수익
 *
 * IRP (개인형퇴직연금):
 * - 이직 시 퇴직급여 수령 → IRP 이전 (세제혜택)
 * - 자영업자/퇴직자도 가입 가능
 */

export type PensionType = "DB" | "DC" | "severance_pay";

export interface PensionPlanInfo {
  type: PensionType;
  /** 가입 금융기관 */
  institution?: string;
  /** 계좌번호 */
  accountNumber?: string;
  /** 가입일 */
  enrollmentDate?: string;
  /** DC: 사용자 부담금률 (연간 임금 대비 %, 최소 1/12 = 8.33%) */
  employerContributionRate?: number;
}

export interface DCContribution {
  year: number;
  month: number;
  /** 해당 월 임금총액 */
  monthlyWage: number;
  /** 사용자 부담금 (월 납입액) */
  employerContribution: number;
  /** 근로자 추가 납입 */
  employeeContribution: number;
  /** 납입 상태 */
  status: "pending" | "paid" | "overdue";
  /** 납입일 */
  paidDate?: string;
}

export interface DCCalculationResult {
  /** 연간 임금총액 */
  annualWageTotal: number;
  /** 법정 최소 부담금 (연간 임금 × 1/12) */
  minimumAnnualContribution: number;
  /** 월별 최소 부담금 */
  minimumMonthlyContribution: number;
  /** 실제 부담금률 */
  actualRate: number;
  /** 실제 연간 부담금 */
  actualAnnualContribution: number;
  /** 법정 기준 충족 여부 */
  meetsMinimum: boolean;
  /** 경고 메시지 */
  warnings: string[];
}

export interface DBCalculationResult {
  /** 퇴직 시 예상 퇴직급여 (= 퇴직금) */
  expectedBenefit: number;
  /** 현재까지 적립 필요 최소 금액 */
  minimumReserve: number;
  /** 적립 비율 (최소 60% 이상 유지 필요) */
  fundingRatio: number;
  /** 법정 최소 적립 비율 충족 여부 */
  meetsFundingRequirement: boolean;
  /** 추가 적립 필요 금액 */
  additionalReserveNeeded: number;
  warnings: string[];
}

export interface PensionComparisonResult {
  /** DC 예상 수령액 (부담금 합계, 운용수익 제외) */
  dcEstimate: number;
  /** DB 예상 수령액 (= 퇴직금) */
  dbEstimate: number;
  /** 추천 */
  recommendation: string;
  /** 비교 분석 */
  analysis: string[];
}

const MIN_DC_RATE = 1 / 12; // 8.33%
const MIN_DB_FUNDING_RATIO = 0.6; // 60%

/**
 * DC(확정기여형) 부담금 계산
 *
 * 근로자퇴직급여보장법 제20조:
 * "사용자는 매년 1회 이상 가입자의 연간 임금총액의 12분의 1 이상에
 *  해당하는 부담금을 현금으로 가입자의 확정기여형퇴직연금제도 계정에
 *  납입하여야 한다."
 */
export function calculateDCContribution(
  annualWageTotal: number,
  customRate?: number,
): DCCalculationResult {
  const warnings: string[] = [];

  const minimumAnnualContribution = Math.round(annualWageTotal * MIN_DC_RATE);
  const minimumMonthlyContribution = Math.round(minimumAnnualContribution / 12);

  const actualRate = customRate ?? MIN_DC_RATE;
  const actualAnnualContribution = Math.round(annualWageTotal * actualRate);

  const meetsMinimum = actualRate >= MIN_DC_RATE;

  if (!meetsMinimum) {
    warnings.push(
      `⚠️ DC 부담금률(${(actualRate * 100).toFixed(2)}%)이 법정 최소(${(MIN_DC_RATE * 100).toFixed(2)}%) 미만입니다.`,
    );
  }

  if (annualWageTotal <= 0) {
    warnings.push("⚠️ 연간 임금총액이 0원 이하입니다.");
  }

  return {
    annualWageTotal,
    minimumAnnualContribution,
    minimumMonthlyContribution,
    actualRate,
    actualAnnualContribution,
    meetsMinimum,
    warnings,
  };
}

/**
 * DB(확정급여형) 적립금 계산
 *
 * 근로자퇴직급여보장법 제16조:
 * 적립금이 "기준책임준비금"의 100분의 60 이상이어야 함
 */
export function calculateDBReserve(
  expectedBenefit: number,
  currentReserve: number,
): DBCalculationResult {
  const warnings: string[] = [];

  const minimumReserve = Math.round(expectedBenefit * MIN_DB_FUNDING_RATIO);
  const fundingRatio =
    expectedBenefit > 0 ? currentReserve / expectedBenefit : 0;
  const meetsFundingRequirement = fundingRatio >= MIN_DB_FUNDING_RATIO;
  const additionalReserveNeeded = Math.max(0, minimumReserve - currentReserve);

  if (!meetsFundingRequirement) {
    warnings.push(
      `⚠️ DB 적립비율(${(fundingRatio * 100).toFixed(1)}%)이 법정 최소(60%) 미만입니다. 추가 적립 필요: ${additionalReserveNeeded.toLocaleString()}원`,
    );
  }

  return {
    expectedBenefit,
    minimumReserve,
    fundingRatio: Math.round(fundingRatio * 1000) / 10,
    meetsFundingRequirement,
    additionalReserveNeeded,
    warnings,
  };
}

/**
 * DC vs DB 비교 분석
 *
 * @param averageDailyWage 평균임금 일액
 * @param serviceYears 근속년수
 * @param annualWageTotal 연간 임금총액
 * @param dcRate DC 부담금률 (기본 1/12)
 * @param expectedWageGrowthRate 예상 임금상승률 (연 %)
 */
export function comparePensionTypes(
  averageDailyWage: number,
  serviceYears: number,
  annualWageTotal: number,
  dcRate: number = MIN_DC_RATE,
  expectedWageGrowthRate: number = 0.03,
): PensionComparisonResult {
  // DB: 퇴직금과 동일 = 평균임금 × 30 × 근속년수
  const dbEstimate = Math.round(averageDailyWage * 30 * serviceYears);

  // DC: 매년 부담금 합계 (단순 합산, 운용수익 제외)
  // 임금 상승을 반영한 연간 부담금 합산
  let dcEstimate = 0;
  let currentWage = annualWageTotal;
  for (let y = 0; y < serviceYears; y++) {
    dcEstimate += currentWage * dcRate;
    currentWage *= 1 + expectedWageGrowthRate;
  }
  dcEstimate = Math.round(dcEstimate);

  const analysis: string[] = [];

  if (dbEstimate > dcEstimate) {
    analysis.push(
      `DB가 DC보다 약 ${(dbEstimate - dcEstimate).toLocaleString()}원 유리 (임금상승 ${(expectedWageGrowthRate * 100).toFixed(1)}% 가정)`,
    );
    analysis.push(
      "DB는 퇴직 직전 급여 기준이므로, 임금이 꾸준히 오르는 경우 유리",
    );
  } else {
    analysis.push(
      `DC가 DB보다 약 ${(dcEstimate - dbEstimate).toLocaleString()}원 유리 (운용수익 미포함)`,
    );
    analysis.push("DC는 운용수익에 따라 추가 수령 가능");
  }

  analysis.push("DC: 운용수익은 개인 투자 결과에 따라 변동 (위 계산에 미포함)");
  analysis.push("DB: 회사 도산 시 수령 불확실 위험 존재 (예금보호 적용)");
  analysis.push("이직이 잦은 경우 DC/IRP가 유리 (적립금 이동 용이)");

  const recommendation =
    dbEstimate > dcEstimate * 1.1
      ? "DB(확정급여형) — 임금 상승 시 유리, 안정적 수령"
      : dcEstimate > dbEstimate * 1.1
        ? "DC(확정기여형) — 적극 투자 시 유리, 이직 유연"
        : "유사한 수준 — 개인 상황(이직 계획, 투자 성향)에 따라 선택";

  return {
    dcEstimate,
    dbEstimate,
    recommendation,
    analysis,
  };
}

/**
 * DC 월별 부담금 생성
 */
export function generateMonthlyDCContributions(
  employeeId: string,
  year: number,
  monthlyWages: number[],
  dcRate: number = MIN_DC_RATE,
): DCContribution[] {
  return monthlyWages.map((wage, index) => ({
    year,
    month: index + 1,
    monthlyWage: wage,
    employerContribution: Math.round(wage * dcRate),
    employeeContribution: 0,
    status: "pending" as const,
  }));
}

/**
 * 퇴직연금 가이드 텍스트
 */
export function getRetirementPensionGuide(): string {
  return `
퇴직연금 제도 안내 (근로자퇴직급여보장법)

■ 퇴직연금 유형

  1. DB (확정급여형)
     · 퇴직급여 = 평균임금 × 30일 × 근속년수 (퇴직금과 동일)
     · 사용자가 투자 위험 부담
     · 적립금이 기준책임준비금의 60% 이상 유지 필요
     · 임금이 꾸준히 오르는 근로자에게 유리

  2. DC (확정기여형)
     · 사용자가 매년 연간임금총액의 1/12 이상 납입
     · 근로자가 직접 운용 (투자 위험 부담)
     · 퇴직급여 = 적립금 + 운용수익
     · 이직이 잦거나 투자에 적극적인 근로자에게 유리

  3. IRP (개인형퇴직연금)
     · 이직 시 퇴직금/퇴직연금을 이전받는 계좌
     · 자영업자/퇴직자도 자유 가입
     · 연간 1,800만원 한도 추가 납입 가능 (세액공제)
     · 만 55세 이후 연금 수령 가능

■ 사업장 의무
  · 상시 근로자 1인 이상: 퇴직급여 제도 설정 의무
  · 퇴직연금 가입 시: 운용관리기관·자산관리기관 선정
  · DC: 매년 1회 이상 부담금 납입
  · DB: 매 사업연도 종료 후 6개월 이내 적립금 수준 확인

■ 세제 혜택
  · DC/IRP 근로자 추가 납입: 연간 900만원까지 세액공제 (13.2~16.5%)
  · 퇴직급여 수령 시: 퇴직소득세 적용 (연금 수령 시 30~40% 절세)

■ 주의사항
  · 55세 미만 중도 인출 제한 (주택 구입, 무주택 전세 등 예외)
  · 퇴직연금 사업자 변경 시 근로자 동의 필요
  · DB → DC 전환 시 근로자 과반수 동의 필요
  `.trim();
}
