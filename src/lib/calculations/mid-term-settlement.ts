import { calculateSeverancePay, calculateServiceDays } from "./severance-pay";
import type { MonthlyWage, SeveranceResult } from "@/types/severance";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MID_TERM_SETTLEMENT_MIN_YEARS = 1;
const MID_TERM_SETTLEMENT_MIN_DAYS = 366; // 1년 이상 = 366일 이상

export interface MidTermSettlementInput {
  employeeId: string;
  hireDate: Date;
  settlementDate: Date;
  lastThreeMonthsWages: MonthlyWage[];
  previousSettlements?: PreviousSettlement[];
}

export interface PreviousSettlement {
  settlementDate: Date;
  amount: number;
  serviceDaysAtSettlement: number;
}

export interface MidTermSettlementResult {
  isEligible: boolean;
  ineligibleReason?: string;
  totalServiceDays: number;
  settledServiceDays: number;
  remainingServiceDays: number;
  settlementAmount: number;
  previousSettlementsTotal: number;
  finalPayableAmount: number;
  averageDailyWage: number;
  calculationBreakdown: {
    threeMonthsTotalWage: number;
    threeMonthsDays: number;
    dailyAverage: number;
    settledDaysMultiplier: number;
  };
  futureCalculation: {
    newHireDate: Date;
    serviceDaysBeforeSettlement: number;
  };
  generatedAt: string;
}

function toUtcStartOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function validateInput(input: MidTermSettlementInput): void {
  if (!input.employeeId.trim()) {
    throw new Error("employeeId는 필수입니다.");
  }

  if (!isValidDate(input.hireDate) || !isValidDate(input.settlementDate)) {
    throw new Error("hireDate/settlementDate는 유효한 날짜여야 합니다.");
  }

  const hireUtc = toUtcStartOfDay(input.hireDate);
  const settlementUtc = toUtcStartOfDay(input.settlementDate);
  const todayUtc = toUtcStartOfDay(new Date());

  if (hireUtc.getTime() > settlementUtc.getTime()) {
    throw new Error("입사일은 정산일보다 늦을 수 없습니다.");
  }

  if (settlementUtc.getTime() > todayUtc.getTime()) {
    throw new Error("정산일은 미래 날짜일 수 없습니다.");
  }

  if (input.lastThreeMonthsWages.length !== 3) {
    throw new Error("lastThreeMonthsWages는 정확히 3개월 데이터가 필요합니다.");
  }

  if (input.previousSettlements) {
    input.previousSettlements.forEach((settlement, index) => {
      if (!isValidDate(settlement.settlementDate)) {
        throw new Error(
          `previousSettlements[${index}].settlementDate는 유효한 날짜여야 합니다.`,
        );
      }
      if (settlement.amount < 0) {
        throw new Error(
          `previousSettlements[${index}].amount는 0 이상이어야 합니다.`,
        );
      }
      if (settlement.serviceDaysAtSettlement < 0) {
        throw new Error(
          `previousSettlements[${index}].serviceDaysAtSettlement는 0 이상이어야 합니다.`,
        );
      }
    });
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
  return wage.baseSalary + wage.fixedAllowances + wage.bonus + wage.overtimePay;
}

function calculatePreviousSettlementsTotal(
  previousSettlements: PreviousSettlement[] | undefined,
): number {
  if (!previousSettlements || previousSettlements.length === 0) {
    return 0;
  }
  return previousSettlements.reduce(
    (sum, settlement) => sum + settlement.amount,
    0,
  );
}

export function checkMidTermSettlementEligibility(
  hireDate: Date,
  settlementDate: Date,
): { eligible: boolean; reason?: string; serviceDays: number } {
  const serviceDays = calculateServiceDays(hireDate, settlementDate);

  if (serviceDays < MID_TERM_SETTLEMENT_MIN_DAYS) {
    return {
      eligible: false,
      reason: `중간정산은 1년(366일) 이상 근속자만 가능합니다. 현재 근속일수: ${serviceDays}일`,
      serviceDays,
    };
  }

  return { eligible: true, serviceDays };
}

export function calculateMidTermSettlement(
  input: MidTermSettlementInput,
): MidTermSettlementResult {
  validateInput(input);

  const eligibility = checkMidTermSettlementEligibility(
    input.hireDate,
    input.settlementDate,
  );

  const totalServiceDays = eligibility.serviceDays;
  const threeMonthsDays = calculateThreeMonthsDays(input.settlementDate);
  const threeMonthsTotalWage = input.lastThreeMonthsWages.reduce(
    (sum, wage) => sum + getIncludedMonthlyWageTotal(wage),
    0,
  );

  const averageDailyWage =
    threeMonthsDays > 0 ? threeMonthsTotalWage / threeMonthsDays : 0;
  const settledDaysMultiplier = totalServiceDays / 365;
  const grossSettlementAmount = averageDailyWage * 30 * settledDaysMultiplier;
  const previousSettlementsTotal = calculatePreviousSettlementsTotal(
    input.previousSettlements,
  );
  const finalPayableAmount = Math.max(
    0,
    grossSettlementAmount - previousSettlementsTotal,
  );

  return {
    isEligible: eligibility.eligible,
    ineligibleReason: eligibility.reason,
    totalServiceDays,
    settledServiceDays: totalServiceDays,
    remainingServiceDays: 0,
    settlementAmount: Math.round(grossSettlementAmount),
    previousSettlementsTotal: Math.round(previousSettlementsTotal),
    finalPayableAmount: Math.round(finalPayableAmount),
    averageDailyWage: Math.round(averageDailyWage),
    calculationBreakdown: {
      threeMonthsTotalWage: Math.round(threeMonthsTotalWage),
      threeMonthsDays,
      dailyAverage: Math.round(averageDailyWage),
      settledDaysMultiplier,
    },
    futureCalculation: {
      newHireDate: new Date(input.settlementDate),
      serviceDaysBeforeSettlement: totalServiceDays,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function calculateRemainingSeveranceAfterSettlement(
  originalHireDate: Date,
  settlementDate: Date,
  actualRetirementDate: Date,
  wagesAtRetirement: MonthlyWage[],
  midTermSettlementAmount: number,
): SeveranceResult & { previousSettlementDeduction: number } {
  const severanceResult = calculateSeverancePay({
    employeeId: "remaining",
    startDate: settlementDate,
    endDate: actualRetirementDate,
    lastThreeMonthsWages: wagesAtRetirement,
    isMidTermSettlement: false,
  });

  return {
    ...severanceResult,
    previousSettlementDeduction: midTermSettlementAmount,
  };
}

export function formatMidTermSettlementAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "₩0";
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function getMidTermSettlementGuidance(): string {
  return `
중간정산 안내사항:

1. 자격요건
   - 1년 이상 근속자 (퇴직금 발생 시점부터, 366일 이상)
   - 근로자의 신청 또는 사용자와의 합의

2. 계산방법
   - 정산일까지의 근속기간으로 퇴직금 계산
   - 공식: 평균임금 × 30일 × (정산일까지 근속일수 / 365)

3. 차후 퇴직금 계산
   - 정산일을 새로운 기준일로 하여 재계산
   - 이전 중간정산 지급액은 차감

4. 유의사항
   - 중간정산 후 재계산 시 입사일은 중간정산일로 간주
   - 국민연금 중도일시금과는 별개의 제도
   - 세금 처리는 퇴직소득세 규정 적용
`.trim();
}
