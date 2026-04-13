import { MINIMUM_WAGE } from "@/lib/constants";
import type {
  MonthlyWage,
  SeveranceInput,
  SeveranceResult,
  WageArrearsPeriod,
} from "@/types/severance";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MID_TERM_SETTLEMENT_MIN_DAYS = 366;
const MINIMUM_WAGE_2026 = MINIMUM_WAGE;
const SEVERANCE_DAYS_PER_YEAR = 30;
const DAYS_PER_YEAR = 365;
const MIN_WEEKLY_HOURS = 15; // 4주간 15시간 미만은 퇴직금 예외

function toUtcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function validateNonNegativeNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${fieldName}은(는) 0 이상의 유효한 숫자여야 합니다.`);
  }
}

function calculateThreeMonthsDays(endDate: Date): number {
  const endUtc = toUtcStartOfDay(endDate);
  const threeMonthsBefore = new Date(
    Date.UTC(
      endUtc.getUTCFullYear(),
      endUtc.getUTCMonth() - 3,
      endUtc.getUTCDate(),
    ),
  );
  return Math.max(
    0,
    Math.floor((endUtc.getTime() - threeMonthsBefore.getTime()) / DAY_IN_MS),
  );
}

function getIncludedMonthlyWageTotal(wage: MonthlyWage): number {
  // 연간 상여금 총액이 설정된 경우: 월별로 안분 (annualBonusTotal / 12)
  // 3개월 합산 시 annualBonusTotal/12 × 3 = annualBonusTotal × 3/12 (법적 안분 공식)
  const bonusAmount =
    wage.annualBonusTotal !== undefined
      ? wage.annualBonusTotal / 12
      : wage.bonus;
  return (
    wage.baseSalary + wage.fixedAllowances + bonusAmount + wage.overtimePay
  );
}

function validateInput(input: SeveranceInput): void {
  if (!input.employeeId.trim()) {
    throw new Error("employeeId는 필수입니다.");
  }

  if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) {
    throw new Error("startDate/endDate는 유효한 날짜여야 합니다.");
  }

  const startUtc = toUtcStartOfDay(input.startDate);
  const endUtc = toUtcStartOfDay(input.endDate);
  const todayUtc = toUtcStartOfDay(new Date());

  if (startUtc.getTime() > endUtc.getTime()) {
    throw new Error("입사일은 퇴직일보다 늦을 수 없습니다.");
  }

  if (
    startUtc.getTime() > todayUtc.getTime() ||
    endUtc.getTime() > todayUtc.getTime()
  ) {
    throw new Error("미래 날짜는 허용되지 않습니다.");
  }

  if (input.lastThreeMonthsWages.length !== 3) {
    throw new Error("lastThreeMonthsWages는 정확히 3개월 데이터가 필요합니다.");
  }

  input.lastThreeMonthsWages.forEach((wage, index) => {
    validateNonNegativeNumber(
      wage.baseSalary,
      `lastThreeMonthsWages[${index}].baseSalary`,
    );
    validateNonNegativeNumber(
      wage.fixedAllowances,
      `lastThreeMonthsWages[${index}].fixedAllowances`,
    );
    validateNonNegativeNumber(
      wage.bonus,
      `lastThreeMonthsWages[${index}].bonus`,
    );
    validateNonNegativeNumber(
      wage.overtimePay,
      `lastThreeMonthsWages[${index}].overtimePay`,
    );
    validateNonNegativeNumber(
      wage.nonTaxable,
      `lastThreeMonthsWages[${index}].nonTaxable`,
    );
  });
}

function validateMinimumWage2026(wages: MonthlyWage[]): void {
  wages.forEach((wage, index) => {
    const comparableMonthlyWage = wage.baseSalary + wage.fixedAllowances;
    if (comparableMonthlyWage < MINIMUM_WAGE_2026.monthly) {
      throw new Error(
        `최저임금 위반(2026): ${index + 1}번째 월의 최저임금 비교 대상 급여(${Math.round(
          comparableMonthlyWage,
        ).toLocaleString(
          "ko-KR",
        )}원)가 ${MINIMUM_WAGE_2026.monthly.toLocaleString("ko-KR")}원 미만입니다.`,
      );
    }
  });
}

/**
 * 근속일수 계산
 */
export function calculateServiceDays(startDate: Date, endDate: Date): number {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return 0;
  }

  const startUtc = toUtcStartOfDay(startDate);
  const endUtc = toUtcStartOfDay(endDate);
  if (startUtc.getTime() > endUtc.getTime()) {
    return 0;
  }

  return Math.floor((endUtc.getTime() - startUtc.getTime()) / DAY_IN_MS);
}

/**
 * 1일 평균임금 계산
 * 공식: 퇴직일 이전 3개월간 임금 총액 / 3개월 일수
 */
export function calculateAverageDailyWage(
  wages: MonthlyWage[],
  referenceEndDate: Date = new Date(),
): number {
  if (wages.length !== 3) {
    return 0;
  }

  const totalIncludedWage = wages.reduce(
    (sum, wage) => sum + getIncludedMonthlyWageTotal(wage),
    0,
  );

  const threeMonthsDays = calculateThreeMonthsDays(referenceEndDate);
  if (threeMonthsDays <= 0) {
    return 0;
  }

  return totalIncludedWage / threeMonthsDays;
}

/**
 * 원화 형식 문자열 반환
 */
export function formatSeveranceAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "₩0";
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * 4주 15시간 미만 근무자 체크
 * 근로기준법 제34조: 4주간 평균 15시간 미만 근무자는 퇴직금 적용 제외
 */
function isLowHoursWorker(weeklyHours: number | undefined): boolean {
  if (weeklyHours === undefined) return false;
  return weeklyHours < MIN_WEEKLY_HOURS;
}

/**
 * 임금 체울 기간을 고려한 실제 근속일수 계산
 * 체울 기간은 근속일수에서 제외
 */
function calculateEffectiveServiceDays(
  startDate: Date,
  endDate: Date,
  arrearsPeriods?: WageArrearsPeriod[],
): { totalDays: number; excludedDays: number; effectiveDays: number } {
  const totalDays = calculateServiceDays(startDate, endDate);

  if (!arrearsPeriods || arrearsPeriods.length === 0) {
    return { totalDays, excludedDays: 0, effectiveDays: totalDays };
  }

  let excludedDays = 0;
  for (const period of arrearsPeriods) {
    const periodDays = calculateServiceDays(period.startDate, period.endDate);
    if (periodDays > 0) {
      excludedDays += periodDays;
    }
  }

  const effectiveDays = Math.max(0, totalDays - excludedDays);
  return { totalDays, excludedDays, effectiveDays };
}

/**
 * 퇴직금 계산 메인 엔진
 * 공식: 평균임금 × 30일 × (근속일수 / 365)
 */
export function calculateSeverancePay(input: SeveranceInput): SeveranceResult {
  validateInput(input);
  validateMinimumWage2026(input.lastThreeMonthsWages);

  // 4주 15시간 미만 근무자 예외 체크
  const isLowHours = isLowHoursWorker(input.weeklyWorkingHours);

  // 임금 체울 기간 고려한 실제 근속일수
  const { effectiveDays } = calculateEffectiveServiceDays(
    input.startDate,
    input.endDate,
    input.wageArrearsPeriods,
  );

  // 퇴직금 수령 자격: 1년 이상 근속 + 4주 15시간 이상 근무
  const isEligible = effectiveDays >= 366 && !isLowHours;

  if (
    input.isMidTermSettlement &&
    effectiveDays < MID_TERM_SETTLEMENT_MIN_DAYS
  ) {
    throw new Error("중간정산은 1년 이상 근속자만 가능합니다.");
  }

  const threeMonthsDays = calculateThreeMonthsDays(input.endDate);
  const threeMonthsTotalWage = input.lastThreeMonthsWages.reduce(
    (sum, wage) => sum + getIncludedMonthlyWageTotal(wage),
    0,
  );
  let averageDailyWage = calculateAverageDailyWage(
    input.lastThreeMonthsWages,
    input.endDate,
  );

  // 근로기준법 제2조 ②항: 평균임금이 통상임금보다 낮으면 통상임금 적용
  let ordinaryWageApplied = false;
  if (input.monthlyOrdinaryWage && input.monthlyOrdinaryWage > 0) {
    const dailyOrdinaryWage = input.monthlyOrdinaryWage / 30;
    if (averageDailyWage < dailyOrdinaryWage) {
      averageDailyWage = dailyOrdinaryWage;
      ordinaryWageApplied = true;
    }
  }

  const daysMultiplier = effectiveDays / DAYS_PER_YEAR;
  const totalAmount = isEligible
    ? averageDailyWage * SEVERANCE_DAYS_PER_YEAR * daysMultiplier
    : 0;

  return {
    totalAmount: Math.round(totalAmount),
    averageDailyWage: Math.round(averageDailyWage),
    serviceDays: effectiveDays,
    serviceYears: effectiveDays / 365,
    isEligible,
    ordinaryWageApplied,
    calculationBreakdown: {
      threeMonthsTotalWage: Math.round(threeMonthsTotalWage),
      threeMonthsDays,
      dailyAverage: Math.round(averageDailyWage),
      daysMultiplier,
    },
  };
}
