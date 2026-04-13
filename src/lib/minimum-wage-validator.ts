import { MINIMUM_WAGE } from "./constants";

export interface MinimumWageCheckResult {
  isValid: boolean;
  hourlyWage: number;
  monthlyWage: number;
  warningMessage: string | null;
  violationType: "hourly" | "monthly" | "none";
}

/**
 * 최저임금 위반 여부 검증
 * @param monthlySalary 월 급여 (기본급 + 고정수당)
 * @param weeklyHours 주당 근무시간
 * @param monthlyHours 월 근무시간 (기본값: 주당시간 × 4.345주)
 * @returns 검증 결과
 */
export function checkMinimumWageViolation(
  monthlySalary: number,
  weeklyHours: number,
  monthlyHours?: number,
): MinimumWageCheckResult {
  const effectiveMonthlyHours = monthlyHours ?? weeklyHours * 4.345;
  const hourlyWage = monthlySalary / effectiveMonthlyHours;

  const isHourlyValid = hourlyWage >= MINIMUM_WAGE.hourly;
  const isMonthlyValid = monthlySalary >= MINIMUM_WAGE.monthly;

  if (isHourlyValid && isMonthlyValid) {
    return {
      isValid: true,
      hourlyWage,
      monthlyWage: monthlySalary,
      warningMessage: null,
      violationType: "none",
    };
  }

  // 위반 유형 결정
  let violationType: "hourly" | "monthly" | "none" = "none";
  let warningMessage: string | null = null;

  if (!isHourlyValid) {
    violationType = "hourly";
    warningMessage = `⚠️ 최저임금 위반 위험: 시급 ₩${Math.floor(hourlyWage).toLocaleString("ko-KR")}는 2026년 최저시급 ₩${MINIMUM_WAGE.hourly.toLocaleString("ko-KR")} 미만입니다.`;
  } else if (!isMonthlyValid) {
    violationType = "monthly";
    warningMessage = `⚠️ 최저임금 위반 위험: 월급 ₩${Math.floor(monthlySalary).toLocaleString("ko-KR")}는 2026년 최저월급 ₩${MINIMUM_WAGE.monthly.toLocaleString("ko-KR")} 미만입니다.`;
  }

  return {
    isValid: false,
    hourlyWage,
    monthlyWage: monthlySalary,
    warningMessage,
    violationType,
  };
}

/**
 * 급여 입력 컴포넌트용 최저임금 경고 메시지 생성
 * @param baseSalary 기본급
 * @param fixedAllowances 고정수당
 * @param weeklyHours 주당 근무시간
 * @returns 경고 메시지 (없으면 null)
 */
export function getMinimumWageWarning(
  baseSalary: number,
  fixedAllowances: number,
  weeklyHours: number,
): string | null {
  const totalSalary = baseSalary + fixedAllowances;
  const result = checkMinimumWageViolation(totalSalary, weeklyHours);
  return result.warningMessage;
}

/**
 * 연봉을 입력받아 최저임금 검증
 * @param annualSalary 연봉
 * @param weeklyHours 주당 근무시간
 * @returns 검증 결과
 */
export function checkAnnualSalaryMinimumWage(
  annualSalary: number,
  weeklyHours: number,
): MinimumWageCheckResult {
  const monthlySalary = annualSalary / 12;
  return checkMinimumWageViolation(monthlySalary, weeklyHours);
}
