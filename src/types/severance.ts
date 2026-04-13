/**
 * 퇴직금 계산용 월 임금 구성
 * - 포함: 기본급, 고정수당, 상여금, 초과근로수당
 * - 제외: 비과세 항목(nonTaxable)
 */
export interface MonthlyWage {
  baseSalary: number;
  fixedAllowances: number;
  bonus: number;
  overtimePay: number;
  nonTaxable: number;
  /** 연간 상여금 총액 (안분 계산용, 설정 시 bonus 대신 annualBonusTotal × 3/12 사용) */
  annualBonusTotal?: number;
}

/**
 * 임금 체울 기간 정보
 */
export interface WageArrearsPeriod {
  startDate: Date;
  endDate: Date;
  amount: number; // 체울된 임금 금액
}

/**
 * 퇴직금 계산 입력값
 */
export interface SeveranceInput {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  lastThreeMonthsWages: MonthlyWage[];
  isMidTermSettlement?: boolean;
  /** 주당 근무시간 (4주 15시간 미만 근무자 예외 판정용) */
  weeklyWorkingHours?: number;
  /** 임금 체울 기간 목록 */
  wageArrearsPeriods?: WageArrearsPeriod[];
  /** 통상임금 월액 (설정 시, 평균임금과 비교하여 높은 쪽 적용 — 근기법 제2조 ②항) */
  monthlyOrdinaryWage?: number;
}

/**
 * 퇴직금 계산 결과
 */
export interface SeveranceResult {
  totalAmount: number;
  averageDailyWage: number;
  serviceDays: number;
  serviceYears: number;
  isEligible: boolean;
  /** 평균임금이 통상임금보다 낮아 통상임금이 적용된 경우 true */
  ordinaryWageApplied?: boolean;
  calculationBreakdown: {
    threeMonthsTotalWage: number;
    threeMonthsDays: number;
    dailyAverage: number;
    daysMultiplier: number;
  };
}

/**
 * @deprecated SeveranceInput를 사용하세요. 하위호환성을 위해 유지됩니다.
 */
export interface SeveranceCalculationInput {
  employeeId: string;
  hireDate: string;
  retirementDate: string;
  lastThreeMonthsWages: MonthlyWage[];
  includedAllowances?: number;
  annualBonusTotal?: number;
}

/**
 * @deprecated SeveranceResult를 사용하세요. 하위호환성을 위해 유지됩니다.
 */
export interface SeveranceCalculationResult {
  employeeId: string;
  hireDate: string;
  retirementDate: string;
  serviceDays: number;
  serviceYears: number;
  averageWage: number;
  totalSeverancePay: number;
  calculationDetails: {
    threeMonthsTotalWage: number;
    threeMonthsDays: number;
    dailyAverageWage: number;
    thirtyDaysWage: number;
  };
  generatedAt: string;
}
