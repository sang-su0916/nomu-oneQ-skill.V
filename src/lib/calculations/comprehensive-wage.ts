/**
 * 포괄임금 역산(분개) 계산 모듈
 *
 * 포괄임금제 실질유형: 월 고정급에 연장·야간 수당을 미리 포함하는 계약 방식
 * 근로자의 실제 근로시간이 법정(주 40시간)을 초과할 때,
 * 고정급을 기본급 + 연장근로수당 + 야간근로수당으로 역산(분개)합니다.
 *
 * 법적 근거:
 * - 근로기준법 제56조 (연장·야간·휴일 근로)
 * - 대법원 2010다5806 (포괄임금제 유효 요건)
 * - 고용노동부 행정해석 (월 소정근로시간 209시간 산정)
 */

import { MINIMUM_WAGE, WORK_HOUR_LIMITS } from "@/lib/constants";

// ============================================
// 상수
// ============================================

/** 월 평균 주수: 365 / 12 / 7 ≈ 4.345 */
const WEEKS_PER_MONTH = 365 / 12 / 7;

/** 법정 소정근로시간 (주) */
const WEEKLY_STANDARD_HOURS = WORK_HOUR_LIMITS.weeklyStandard; // 40

/** 주휴시간 (유급) */
const WEEKLY_PAID_HOLIDAY_HOURS = 8;

/** 월 소정근로시간 (주 40시간 + 주휴 8시간) × 4.345주 = 209시간 */
const MONTHLY_STANDARD_HOURS = MINIMUM_WAGE.monthlyHours; // 209

/** 연장근로 가산율 */
const OVERTIME_PREMIUM = 1.5;

/** 야간근로 가산율 (가산분만, 기본급에 기본 1.0배 이미 포함) */
const NIGHT_PREMIUM = 0.5;

/** 야간근로 시간대 */
const NIGHT_START_HOUR = 22; // 22:00
const NIGHT_END_HOUR = 6; // 06:00

// ============================================
// 타입 정의
// ============================================

/** 포괄임금 역산 입력 */
export interface ComprehensiveWageInput {
  /** 월 고정급 (총액, 세전) */
  totalMonthlyPay: number;

  /** 주당 실제 근로시간 (예: 48시간) */
  weeklyWorkHours: number;

  /** 주당 근무일수 (예: 5일, 6일) */
  weeklyWorkDays: number;

  /** 1일 근로시간 (휴게 제외, 예: 8시간) */
  dailyWorkHours: number;

  /** 출근시간 (HH:mm, 예: "09:00") */
  workStartTime: string;

  /** 퇴근시간 (HH:mm, 예: "18:00") */
  workEndTime: string;

  /** 휴게시간 (분, 예: 60) */
  breakMinutes: number;

  /** 야간근무 포함 여부 */
  hasNightWork: boolean;

  /** 야간 휴게시간 (분, 기본 0) - hasNightWork가 true일 때만 사용 */
  nightBreakMinutes?: number;

  /** 고정 휴일근로시간 (주당, 예: 8시간) */
  fixedHolidayHoursPerWeek?: number;
}

/** 포괄임금 역산 결과 */
export interface ComprehensiveWageResult {
  /** 역산된 시급 */
  hourlyWage: number;

  /** 기본급 (시급 × 209시간) */
  basePay: number;

  /** 고정 연장근로수당 */
  fixedOvertimePay: number;

  /** 고정 야간근로수당 (가산분) */
  fixedNightPay: number;

  /** 고정 휴일근로수당 */
  fixedHolidayPay: number;

  /** 합계 (기본급 + 연장 + 야간 + 휴일 = 월 고정급과 일치해야 함) */
  totalPay: number;

  /** 상세 시간 분석 */
  breakdown: {
    /** 월 소정근로시간 (209시간) */
    monthlyStandardHours: number;
    /** 주당 연장근로시간 */
    weeklyOvertimeHours: number;
    /** 월 연장근로시간 */
    monthlyOvertimeHours: number;
    /** 연장 환산시간 (× 1.5배) */
    overtimeEquivalentHours: number;
    /** 주당 야간근로시간 */
    weeklyNightHours: number;
    /** 월 야간근로시간 */
    monthlyNightHours: number;
    /** 야간 가산 환산시간 (× 0.5배) */
    nightEquivalentHours: number;
    /** 주당 휴일근로시간 */
    weeklyHolidayHours: number;
    /** 월 휴일근로시간 */
    monthlyHolidayHours: number;
    /** 휴일 환산시간 (× 1.5배) */
    holidayEquivalentHours: number;
    /** 총 환산시간 (209 + 연장환산 + 야간환산 + 휴일환산) */
    totalEquivalentHours: number;
    /** 일 근로시간 (입력값) */
    dailyWorkHours: number;
    /** 일 야간근로시간 */
    dailyNightHours: number;
    /** 야간 휴게시간 (분) */
    nightBreakMinutes: number;
    /** 주 평균 주수 (4.345) */
    weeksPerMonth: number;
  };

  /** 검증 결과 */
  validation: {
    /** 최저임금 충족 여부 */
    meetsMinimumWage: boolean;
    /** 환산 시급 */
    effectiveHourlyWage: number;
    /** 2026년 최저시급 */
    minimumHourlyWage: number;
    /** 주당 연장근로 12시간 한도 초과 여부 */
    exceedsWeeklyOvertimeLimit: boolean;
    /** 경고 메시지 */
    warnings: string[];
  };
}

// ============================================
// 야간근로시간 계산
// ============================================

/**
 * 시간 문자열(HH:mm)을 분(minutes)으로 변환
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * 하루 근무시간 중 야간근로시간(22:00~06:00) 계산
 *
 * @param startTime 출근시간 (HH:mm)
 * @param endTime 퇴근시간 (HH:mm)
 * @param breakMinutes 주간 휴게시간 (분) - 야간 시간대에는 적용하지 않음
 * @param nightBreakMinutes 야간 휴게시간 (분) - 야간 시간대에서 차감
 * @returns 야간근로시간 (시간 단위, 소수점)
 */
export function calculateDailyNightHours(
  startTime: string,
  endTime: string,
  nightBreakMinutes: number = 0,
): number {
  const startMin = timeToMinutes(startTime);
  let endMin = timeToMinutes(endTime);

  // 퇴근시간이 출근시간보다 작으면 익일 (예: 22:00 ~ 06:00)
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  const nightStartMin = NIGHT_START_HOUR * 60; // 22:00 = 1320
  const nightEndMin = NIGHT_END_HOUR * 60; // 06:00 = 360
  const nightEndNextDay = nightEndMin + 24 * 60; // 06:00 다음날 = 1800

  let nightMinutes = 0;

  // 야간 구간 1: 22:00 ~ 24:00 (당일)
  const nightBlock1Start = nightStartMin; // 1320
  const nightBlock1End = 24 * 60; // 1440

  // 야간 구간 2: 00:00 ~ 06:00 (익일)
  const nightBlock2Start = 24 * 60; // 1440 (익일 00:00)
  const nightBlock2End = nightEndNextDay; // 1800 (익일 06:00)

  // 구간 1 겹침 계산 (22:00 ~ 24:00)
  const overlap1Start = Math.max(startMin, nightBlock1Start);
  const overlap1End = Math.min(endMin, nightBlock1End);
  if (overlap1End > overlap1Start) {
    nightMinutes += overlap1End - overlap1Start;
  }

  // 구간 2 겹침 계산 (00:00 ~ 06:00)
  const overlap2Start = Math.max(startMin, nightBlock2Start);
  const overlap2End = Math.min(endMin, nightBlock2End);
  if (overlap2End > overlap2Start) {
    nightMinutes += overlap2End - overlap2Start;
  }

  // 야간 근무시간이 당일 0시 이전에 시작하는 경우 (예: 06:00 출근 ~ 23:00 퇴근)
  // 이 경우 구간 1만 해당
  // 위 로직으로 이미 처리됨

  // 야간 휴게시간 차감
  nightMinutes = Math.max(0, nightMinutes - nightBreakMinutes);

  return nightMinutes / 60;
}

// ============================================
// 포괄임금 역산 메인 함수
// ============================================

/**
 * 포괄임금 역산(분개) 계산
 *
 * 월 고정급을 기본급 + 연장근로수당 + 야간근로수당으로 분해합니다.
 *
 * 【계산 공식】
 * 1. 주당 연장시간 = max(0, 주당 실근로시간 - 40시간)
 * 2. 월 연장시간 = 주당 연장 × 4.345주
 * 3. 연장 환산시간 = 월 연장시간 × 1.5배
 * 4. 월 야간시간 = 일 야간시간 × 주 근무일수 × 4.345주
 * 5. 야간 환산시간 = 월 야간시간 × 0.5배 (가산분만)
 * 6. 총 환산시간 = 209 + 연장환산 + 야간환산
 * 7. 시급 = 월 고정급 ÷ 총 환산시간
 * 8. 기본급 = 시급 × 209
 * 9. 연장수당 = 시급 × 1.5 × 월 연장시간
 * 10. 야간수당 = 시급 × 0.5 × 월 야간시간
 */
export function calculateComprehensiveWage(
  input: ComprehensiveWageInput,
): ComprehensiveWageResult {
  const {
    totalMonthlyPay,
    weeklyWorkHours,
    weeklyWorkDays,
    dailyWorkHours,
    workStartTime,
    workEndTime,
    hasNightWork,
    nightBreakMinutes = 0,
    fixedHolidayHoursPerWeek = 0,
  } = input;

  // ── 1. 연장근로 계산 ──
  const weeklyOvertimeHours = Math.max(
    0,
    weeklyWorkHours - WEEKLY_STANDARD_HOURS,
  );
  const monthlyOvertimeHours = round2(weeklyOvertimeHours * WEEKS_PER_MONTH);
  const overtimeEquivalentHours = round2(
    monthlyOvertimeHours * OVERTIME_PREMIUM,
  );

  // ── 2. 야간근로 계산 ──
  let dailyNightHours = 0;
  let weeklyNightHours = 0;
  let monthlyNightHours = 0;
  let nightEquivalentHours = 0;

  if (hasNightWork) {
    dailyNightHours = round2(
      calculateDailyNightHours(workStartTime, workEndTime, nightBreakMinutes),
    );
    weeklyNightHours = round2(dailyNightHours * weeklyWorkDays);
    monthlyNightHours = round2(weeklyNightHours * WEEKS_PER_MONTH);
    nightEquivalentHours = round2(monthlyNightHours * NIGHT_PREMIUM);
  }

  // ── 2-2. 휴일근로 계산 ──
  const weeklyHolidayHours = fixedHolidayHoursPerWeek;
  const monthlyHolidayHours = round2(weeklyHolidayHours * WEEKS_PER_MONTH);
  const holidayEquivalentHours = round2(monthlyHolidayHours * OVERTIME_PREMIUM); // 휴일근로도 1.5배

  // ── 3. 총 환산시간 및 시급 계산 ──
  const totalEquivalentHours = round2(
    MONTHLY_STANDARD_HOURS +
      overtimeEquivalentHours +
      nightEquivalentHours +
      holidayEquivalentHours,
  );
  const hourlyWage = Math.floor(totalMonthlyPay / totalEquivalentHours);

  // ── 4. 임금 분개 ──
  const basePay = hourlyWage * MONTHLY_STANDARD_HOURS;
  const fixedOvertimePay = Math.round(
    hourlyWage * OVERTIME_PREMIUM * monthlyOvertimeHours,
  );
  const fixedNightPay = Math.round(
    hourlyWage * NIGHT_PREMIUM * monthlyNightHours,
  );
  const fixedHolidayPay = Math.round(
    hourlyWage * OVERTIME_PREMIUM * monthlyHolidayHours,
  );

  // 합계 (반올림 차이 보정: 잔액을 기본급에 가산)
  const rawTotal = basePay + fixedOvertimePay + fixedNightPay + fixedHolidayPay;
  const adjustedBasePay = basePay + (totalMonthlyPay - rawTotal);
  const totalPay =
    adjustedBasePay + fixedOvertimePay + fixedNightPay + fixedHolidayPay;

  // ── 5. 검증 ──
  const warnings: string[] = [];

  // 최저임금 검증
  const meetsMinimumWage = hourlyWage >= MINIMUM_WAGE.hourly;
  if (!meetsMinimumWage) {
    warnings.push(
      `환산 시급(${hourlyWage.toLocaleString()}원)이 최저시급(${MINIMUM_WAGE.hourly.toLocaleString()}원)보다 낮습니다. 최저임금법 위반 소지가 있습니다.`,
    );
  }

  // 연장근로 주 12시간 한도
  const exceedsWeeklyOvertimeLimit =
    weeklyOvertimeHours > WORK_HOUR_LIMITS.weeklyOvertimeMax;
  if (exceedsWeeklyOvertimeLimit) {
    warnings.push(
      `주당 연장근로(${weeklyOvertimeHours}시간)가 법정 한도(${WORK_HOUR_LIMITS.weeklyOvertimeMax}시간)를 초과합니다. 근로기준법 제53조 위반입니다.`,
    );
  }

  // 주 52시간 한도
  if (weeklyWorkHours > WORK_HOUR_LIMITS.weeklyMaximum) {
    warnings.push(
      `주당 근로시간(${weeklyWorkHours}시간)이 법정 최대(${WORK_HOUR_LIMITS.weeklyMaximum}시간)를 초과합니다.`,
    );
  }

  return {
    hourlyWage,
    basePay: adjustedBasePay,
    fixedOvertimePay,
    fixedNightPay,
    fixedHolidayPay,
    totalPay,
    breakdown: {
      monthlyStandardHours: MONTHLY_STANDARD_HOURS,
      weeklyOvertimeHours,
      monthlyOvertimeHours,
      overtimeEquivalentHours,
      weeklyNightHours,
      monthlyNightHours,
      nightEquivalentHours,
      weeklyHolidayHours,
      monthlyHolidayHours,
      holidayEquivalentHours,
      totalEquivalentHours,
      dailyWorkHours,
      dailyNightHours,
      nightBreakMinutes,
      weeksPerMonth: round2(WEEKS_PER_MONTH),
    },
    validation: {
      meetsMinimumWage,
      effectiveHourlyWage: hourlyWage,
      minimumHourlyWage: MINIMUM_WAGE.hourly,
      exceedsWeeklyOvertimeLimit,
      warnings,
    },
  };
}

// ============================================
// 유틸
// ============================================

/** 소수점 2자리 반올림 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
