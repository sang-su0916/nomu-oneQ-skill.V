/**
 * 통상임금 판단 및 계산 모듈
 *
 * 법적 근거:
 * - 근로기준법 시행령 제6조 (통상임금)
 * - 대법원 전원합의체 2013.12.18. 선고 2012다89399
 *
 * 통상임금 3요건:
 * ① 정기성: 일정 간격으로 계속 지급
 * ② 일률성: 모든 근로자 또는 일정 조건 충족 시 전원 지급
 * ③ 고정성: 업적·성과와 무관하게 확정 지급
 *
 * 통상임금 용도:
 * - 연장/야간/휴일 근로수당 산정 기초
 * - 해고예고수당
 * - 연차수당
 *
 * 평균임금 용도:
 * - 퇴직금 산정
 * - 산업재해 보상
 * - 휴업수당
 */

export type WageClassification = "ordinary" | "average" | "excluded";

export interface WageComponent {
  name: string;
  amount: number;
  classification: WageClassification;
  /** 통상임금 3요건 충족 여부 */
  criteria: {
    regularity: boolean; // 정기성
    uniformity: boolean; // 일률성
    fixedness: boolean; // 고정성
  };
  /** 판단 근거 설명 */
  reason: string;
}

export interface OrdinaryWageResult {
  /** 통상임금 월액 */
  monthlyOrdinaryWage: number;
  /** 통상시급 (÷ 209시간) */
  hourlyOrdinaryWage: number;
  /** 평균임금 일액 (퇴직금용, 3개월 합산 ÷ 역일수) */
  dailyAverageWage: number;
  /** 개별 항목 분류 결과 */
  components: WageComponent[];
  /** 경고 메시지 */
  warnings: string[];
}

/** 통상임금에 포함되는 대표적 수당 유형 */
const ORDINARY_WAGE_TYPES: Record<
  string,
  { classification: WageClassification; reason: string }
> = {
  baseSalary: {
    classification: "ordinary",
    reason: "기본급 — 소정근로의 대가로 정기적·일률적·고정적으로 지급",
  },
  positionAllowance: {
    classification: "ordinary",
    reason:
      "직책수당 — 직책에 따라 일률적·고정적으로 지급 (정기성·일률성·고정성 충족)",
  },
  tenureAllowance: {
    classification: "ordinary",
    reason: "근속수당 — 근속기간에 따라 일률적·고정적으로 지급",
  },
  qualificationAllowance: {
    classification: "ordinary",
    reason: "자격수당/기술수당 — 자격 보유 조건으로 일률적·고정적 지급",
  },
  familyAllowance: {
    classification: "ordinary",
    reason: "가족수당 — 가족 수에 따라 일률적·고정적 지급 (대법원 판례)",
  },
  housingAllowance: {
    classification: "ordinary",
    reason: "주택수당 — 전 직원에게 일률적·고정적 지급 시 통상임금",
  },
  mealAllowance: {
    classification: "ordinary",
    reason:
      "식대 — 전 직원에게 정기적·일률적·고정적 지급 (현금 지급 시 통상임금, 구내식당 제공 시 제외)",
  },
  transportAllowance: {
    classification: "ordinary",
    reason: "교통비 — 전 직원에게 정기적·일률적·고정적 지급 시 통상임금",
  },
  fixedBonus: {
    classification: "ordinary",
    reason:
      "정기상여금 — 정기적·일률적·고정적 지급 시 통상임금 (대법원 2012다89399)",
  },
  // 평균임금에만 포함
  overtimePay: {
    classification: "average",
    reason:
      "연장근로수당 — 실제 연장근로에 따라 변동하므로 고정성 불충족 (통상임금 제외, 평균임금 포함)",
  },
  nightWorkPay: {
    classification: "average",
    reason:
      "야간근로수당 — 실제 야간근로에 따라 변동 (통상임금 제외, 평균임금 포함)",
  },
  holidayWorkPay: {
    classification: "average",
    reason:
      "휴일근로수당 — 실제 휴일근로에 따라 변동 (통상임금 제외, 평균임금 포함)",
  },
  performanceBonus: {
    classification: "average",
    reason:
      "성과급 — 업적·성과에 따라 변동하므로 고정성 불충족 (통상임금 제외, 평균임금 포함)",
  },
  irregularBonus: {
    classification: "average",
    reason:
      "비정기 상여금 — 지급 시기·금액이 불확정 (통상임금 제외, 평균임금 포함)",
  },
  // 양쪽 모두 제외
  expenseReimbursement: {
    classification: "excluded",
    reason: "실비변상 — 근로의 대가가 아닌 비용 보전 (양쪽 모두 제외)",
  },
  congratulatoryCondolence: {
    classification: "excluded",
    reason: "경조금 — 임의적·일시적 지급 (양쪽 모두 제외)",
  },
};

const MONTHLY_HOURS = 209; // (주40h + 주휴8h) × 365 ÷ 7 ÷ 12

/**
 * 수당 항목의 통상임금 해당 여부 판단
 */
export function classifyWageComponent(
  name: string,
  amount: number,
  options?: {
    isPaidRegularly?: boolean; // 정기적으로 지급?
    isPaidToAll?: boolean; // 전 직원 또는 일정 조건 충족 시 지급?
    isFixedAmount?: boolean; // 금액이 확정?
    customReason?: string;
  },
): WageComponent {
  // 알려진 수당 유형인 경우 자동 분류
  const known = ORDINARY_WAGE_TYPES[name];
  if (known) {
    return {
      name,
      amount,
      classification: known.classification,
      criteria: {
        regularity: known.classification === "ordinary",
        uniformity: known.classification === "ordinary",
        fixedness: known.classification === "ordinary",
      },
      reason: known.reason,
    };
  }

  // 사용자 입력 기반 판단
  const regularity = options?.isPaidRegularly ?? false;
  const uniformity = options?.isPaidToAll ?? false;
  const fixedness = options?.isFixedAmount ?? false;

  const isOrdinary = regularity && uniformity && fixedness;

  return {
    name,
    amount,
    classification: isOrdinary ? "ordinary" : "average",
    criteria: { regularity, uniformity, fixedness },
    reason:
      options?.customReason ??
      (isOrdinary
        ? `${name} — 3요건 충족 (정기성·일률성·고정성) → 통상임금`
        : `${name} — 3요건 미충족 (${!regularity ? "정기성" : ""}${!uniformity ? "일률성" : ""}${!fixedness ? "고정성" : ""} 불충족) → 평균임금만 포함`),
  };
}

/**
 * 통상임금 및 평균임금 계산
 *
 * @param components 분류된 임금 항목 배열
 * @param threeMonthsTotalWage 퇴직 전 3개월 임금 총액 (평균임금용)
 * @param threeMonthsDays 퇴직 전 3개월 역일수
 */
export function calculateOrdinaryAndAverageWage(
  components: WageComponent[],
  threeMonthsTotalWage?: number,
  threeMonthsDays?: number,
): OrdinaryWageResult {
  const warnings: string[] = [];

  // 통상임금 합산 (ordinary 분류만)
  const monthlyOrdinaryWage = components
    .filter((c) => c.classification === "ordinary")
    .reduce((sum, c) => sum + c.amount, 0);

  // 통상시급
  const hourlyOrdinaryWage = Math.round(monthlyOrdinaryWage / MONTHLY_HOURS);

  // 평균임금 (3개월 데이터가 있는 경우)
  let dailyAverageWage = 0;
  if (threeMonthsTotalWage && threeMonthsDays && threeMonthsDays > 0) {
    dailyAverageWage = Math.round(threeMonthsTotalWage / threeMonthsDays);
  }

  // 평균임금이 통상임금보다 낮으면 통상임금으로 (근기법 제2조 ②항)
  const dailyOrdinaryWage = Math.round(monthlyOrdinaryWage / 30);
  if (dailyAverageWage > 0 && dailyAverageWage < dailyOrdinaryWage) {
    warnings.push(
      `⚠️ 평균임금(${dailyAverageWage.toLocaleString()}원/일)이 통상임금(${dailyOrdinaryWage.toLocaleString()}원/일)보다 낮습니다. 근로기준법 제2조 ②항에 따라 통상임금을 평균임금으로 적용합니다.`,
    );
    dailyAverageWage = dailyOrdinaryWage;
  }

  // 3요건 판단이 불확실한 항목 경고
  components.forEach((c) => {
    if (c.classification === "average" && c.amount > 0) {
      const unmet = [];
      if (!c.criteria.regularity) unmet.push("정기성");
      if (!c.criteria.uniformity) unmet.push("일률성");
      if (!c.criteria.fixedness) unmet.push("고정성");
      if (unmet.length > 0 && unmet.length < 3) {
        warnings.push(
          `📋 "${c.name}" — ${unmet.join("·")} 불충족으로 통상임금 제외. 지급 관행에 따라 재검토가 필요할 수 있습니다.`,
        );
      }
    }
  });

  return {
    monthlyOrdinaryWage,
    hourlyOrdinaryWage,
    dailyAverageWage,
    components,
    warnings,
  };
}

/**
 * 연장/야간/휴일 수당 계산 (통상시급 기반)
 */
export function calculateOvertimePayByOrdinaryWage(
  hourlyOrdinaryWage: number,
  overtimeHours: number,
  nightHours: number,
  holidayHoursUnder8: number,
  holidayHoursOver8: number,
): {
  overtimePay: number;
  nightPay: number;
  holidayPay: number;
  total: number;
  breakdown: string;
} {
  const overtimePay = Math.round(hourlyOrdinaryWage * 1.5 * overtimeHours);
  const nightPay = Math.round(hourlyOrdinaryWage * 0.5 * nightHours); // 야간 가산분만
  const holidayPayUnder = Math.round(
    hourlyOrdinaryWage * 1.5 * holidayHoursUnder8,
  );
  const holidayPayOver = Math.round(
    hourlyOrdinaryWage * 2.0 * holidayHoursOver8,
  );
  const holidayPay = holidayPayUnder + holidayPayOver;
  const total = overtimePay + nightPay + holidayPay;

  const breakdown = [
    `통상시급: ${hourlyOrdinaryWage.toLocaleString()}원`,
    overtimeHours > 0
      ? `연장근로: ${hourlyOrdinaryWage.toLocaleString()} × 1.5 × ${overtimeHours}h = ${overtimePay.toLocaleString()}원`
      : "",
    nightHours > 0
      ? `야간가산: ${hourlyOrdinaryWage.toLocaleString()} × 0.5 × ${nightHours}h = ${nightPay.toLocaleString()}원`
      : "",
    holidayHoursUnder8 > 0
      ? `휴일(8h이내): ${hourlyOrdinaryWage.toLocaleString()} × 1.5 × ${holidayHoursUnder8}h = ${holidayPayUnder.toLocaleString()}원`
      : "",
    holidayHoursOver8 > 0
      ? `휴일(8h초과): ${hourlyOrdinaryWage.toLocaleString()} × 2.0 × ${holidayHoursOver8}h = ${holidayPayOver.toLocaleString()}원`
      : "",
    `합계: ${total.toLocaleString()}원`,
  ]
    .filter(Boolean)
    .join("\n");

  return { overtimePay, nightPay, holidayPay, total, breakdown };
}

/**
 * 통상임금 판단 가이드 텍스트
 */
export function getOrdinaryWageGuide(): string {
  return `
통상임금 판단 기준 (대법원 전원합의체 2012다89399)

■ 통상임금 3요건
  ① 정기성: 1개월 이하의 기간마다 정기적으로 지급
  ② 일률성: 모든 근로자 또는 일정 조건(근속, 직급 등) 충족 시 일률 지급
  ③ 고정성: 근로 제공 시 확정적으로 지급 (성과·실적 무관)

■ 통상임금 해당 항목 (대표적)
  ✓ 기본급, 직책수당, 근속수당, 자격수당, 가족수당, 주택수당
  ✓ 식대(현금), 교통비(정액), 정기상여금(고정액)

■ 통상임금 제외 항목
  ✗ 연장/야간/휴일 근로수당 (통상임금으로 산정하는 수당이므로 순환 논리)
  ✗ 성과급, 인센티브 (고정성 불충족)
  ✗ 실비변상적 급여 (출장비, 현물 식사 등)
  ✗ 경조금, 포상금 (일시적·임의적)

■ 주의: 명칭이 아닌 실질로 판단
  "성과급"이라는 명칭이라도 전 직원에게 고정적으로 지급되면 통상임금
  "기본급"에 포함되어도 성과 연동이면 통상임금 아님

■ 평균임금과의 관계
  · 평균임금 < 통상임금 → 통상임금을 평균임금으로 적용 (근기법 §2②)`.trim();
}
