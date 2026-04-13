/**
 * 퇴직 통합 정산 계산 엔진
 *
 * 퇴직금 + 미사용 연차수당 + 해고예고수당 + 위로금을 하나로 합산
 */
import {
  calculateSeverancePay,
  calculateAverageDailyWage,
} from "./severance-pay";
import { calculateAnnualLeave, type AnnualLeaveBase } from "./annual-leave";
import type { MonthlyWage, SeveranceResult } from "@/types/severance";

export interface SettlementInput {
  employeeId: string;
  hireDate: string;
  terminationDate: string;
  lastThreeMonthsWages: MonthlyWage[];
  usedAnnualLeaveDays: number;
  /** 해고 예고한 날부터 실제 퇴직일까지의 일수 (30일 미만이면 해고예고수당 발생) */
  noticePeriodDays: number;
  /** 권고사직 등 합의 위로금 */
  consolationMoney: number;
  /** 연차 기산 기준 */
  annualLeaveBasis?: AnnualLeaveBase;
  /** 주당 근무시간 (퇴직금 자격 판정용) */
  weeklyWorkingHours?: number;
  /** 통상임금 월액 (평균임금 비교용 — 근기법 제2조 ②항) */
  monthlyOrdinaryWage?: number;
}

export interface SettlementResult {
  severance: SeveranceResult;
  totalAnnualLeaveDays: number;
  unusedLeaveDays: number;
  unusedLeavePay: number;
  terminationNoticePay: number;
  consolationMoney: number;
  grandTotal: number;
  averageDailyWage: number;
}

export function calculateSettlement(input: SettlementInput): SettlementResult {
  // 1. 퇴직금 (통상임금 비교 포함)
  const severance = calculateSeverancePay({
    employeeId: input.employeeId,
    startDate: new Date(input.hireDate),
    endDate: new Date(input.terminationDate),
    lastThreeMonthsWages: input.lastThreeMonthsWages,
    weeklyWorkingHours: input.weeklyWorkingHours,
    monthlyOrdinaryWage: input.monthlyOrdinaryWage,
  });

  // 2. 일평균임금 (퇴직금에서 통상임금 보정된 값 사용)
  const avgDailyWage =
    severance.averageDailyWage ||
    calculateAverageDailyWage(
      input.lastThreeMonthsWages,
      new Date(input.terminationDate),
    );

  // 3. 연차 계산
  const termYear = new Date(input.terminationDate).getFullYear();
  const annualLeave = calculateAnnualLeave(
    input.hireDate,
    termYear,
    input.annualLeaveBasis || "hire_date",
  );
  const totalAnnualLeaveDays = annualLeave.totalDays;
  const unusedLeaveDays = Math.max(
    0,
    totalAnnualLeaveDays - input.usedAnnualLeaveDays,
  );
  const unusedLeavePay = Math.round(unusedLeaveDays * avgDailyWage);

  // 4. 해고예고수당 (30일 미만 통보 시)
  const shortDays = Math.max(0, 30 - input.noticePeriodDays);
  const terminationNoticePay =
    input.noticePeriodDays < 30 ? Math.round(shortDays * avgDailyWage) : 0;

  // 5. 합산
  const grandTotal =
    severance.totalAmount +
    unusedLeavePay +
    terminationNoticePay +
    input.consolationMoney;

  return {
    severance,
    totalAnnualLeaveDays,
    unusedLeaveDays,
    unusedLeavePay,
    terminationNoticePay,
    consolationMoney: input.consolationMoney,
    grandTotal,
    averageDailyWage: Math.round(avgDailyWage),
  };
}
