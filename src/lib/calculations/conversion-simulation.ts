/**
 * 풀타임→파트타임 전환 시뮬레이션
 */
import { calculateInsurance } from "@/lib/constants";
import { MINIMUM_WAGE } from "@/lib/constants";

interface InsuranceBreakdown {
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentInsurance: number;
  total: number;
}

export interface ConversionBefore {
  monthlySalary: number;
  weeklyHours: number;
  monthlyHours: number;
  insurance: InsuranceBreakdown;
  netPay: number;
}

export interface ConversionAfter {
  monthlySalary: number;
  weeklyHours: number;
  monthlyHours: number;
  hourlyWage: number;
  insurance: InsuranceBreakdown;
  netPay: number;
  hasWeeklyAllowance: boolean;
}

export interface ConversionResult {
  before: ConversionBefore;
  after: ConversionAfter;
  diff: {
    salaryChange: number;
    salaryChangePercent: number;
    insuranceChange: number;
    netPayChange: number;
  };
  warnings: string[];
}

function getInsuranceBreakdown(taxable: number): InsuranceBreakdown {
  const calc = calculateInsurance(taxable);
  return {
    nationalPension: calc.nationalPension,
    healthInsurance: calc.healthInsurance,
    longTermCare: calc.longTermCare,
    employmentInsurance: calc.employmentInsurance,
    total: calc.totalEmployee,
  };
}

/**
 * 월 환산 근무시간 계산 (주당 시간 × 4.345)
 * 주휴수당 포함 시: (주당 근무시간 + 주휴 8시간) × 4.345
 */
function calcMonthlyHours(
  weeklyHours: number,
  includeWeeklyAllowance: boolean,
): number {
  const base = includeWeeklyAllowance
    ? weeklyHours + (weeklyHours / 5) * 1
    : weeklyHours;
  return Math.round(base * 4.345);
}

export function simulateConversion(
  currentMonthlySalary: number,
  currentWeeklyHours: number,
  newWeeklyHours: number,
  newHourlyWage: number,
  nonTaxable: number = 0,
): ConversionResult {
  const warnings: string[] = [];

  // Before
  const beforeMonthlyHours = calcMonthlyHours(currentWeeklyHours, true);
  const beforeTaxable = Math.max(0, currentMonthlySalary - nonTaxable);
  const beforeIns = getInsuranceBreakdown(beforeTaxable);
  const before: ConversionBefore = {
    monthlySalary: currentMonthlySalary,
    weeklyHours: currentWeeklyHours,
    monthlyHours: beforeMonthlyHours,
    insurance: beforeIns,
    netPay: currentMonthlySalary - beforeIns.total,
  };

  // After
  const hasWeeklyAllowance = newWeeklyHours >= 15;
  const afterMonthlyHours = calcMonthlyHours(
    newWeeklyHours,
    hasWeeklyAllowance,
  );
  const afterMonthlySalary = Math.round(newHourlyWage * afterMonthlyHours);
  const afterTaxable = Math.max(0, afterMonthlySalary - nonTaxable);
  const afterIns = getInsuranceBreakdown(afterTaxable);
  const after: ConversionAfter = {
    monthlySalary: afterMonthlySalary,
    weeklyHours: newWeeklyHours,
    monthlyHours: afterMonthlyHours,
    hourlyWage: newHourlyWage,
    insurance: afterIns,
    netPay: afterMonthlySalary - afterIns.total,
    hasWeeklyAllowance,
  };

  // Warnings
  if (newHourlyWage < MINIMUM_WAGE.hourly) {
    warnings.push(
      `시급 ${newHourlyWage.toLocaleString()}원은 2026년 최저임금(${MINIMUM_WAGE.hourly.toLocaleString()}원) 미만입니다.`,
    );
  }
  if (!hasWeeklyAllowance) {
    warnings.push("주 15시간 미만 근무 시 주휴수당이 적용되지 않습니다.");
  }
  if (newWeeklyHours < 15) {
    warnings.push(
      "주 15시간 미만 근무 시 4대보험 가입 의무가 면제될 수 있습니다.",
    );
  }

  return {
    before,
    after,
    diff: {
      salaryChange: afterMonthlySalary - currentMonthlySalary,
      salaryChangePercent:
        currentMonthlySalary > 0
          ? Math.round(
              ((afterMonthlySalary - currentMonthlySalary) /
                currentMonthlySalary) *
                100,
            )
          : 0,
      insuranceChange: afterIns.total - beforeIns.total,
      netPayChange: after.netPay - before.netPay,
    },
    warnings,
  };
}
