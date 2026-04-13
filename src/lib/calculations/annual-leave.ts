/**
 * 연차유급휴가 계산 모듈
 *
 * 근거 법령: 근로기준법 제60조 (연차 유급휴가)
 *
 * ① 1년간 80% 이상 출근한 근로자: 15일
 * ② 1년 미만 근로자 또는 80% 미만 출근: 1개월 개근 시 1일
 * ④ 3년 이상 근속: 최초 1년 초과 계속근로연수 매 2년마다 1일 가산 (최대 25일)
 *
 * 기산 기준:
 * - 입사일 기준: 입사일 ~ 입사일+1년 단위로 산정
 * - 회계연도 기준: 매년 1/1 ~ 12/31 단위로 산정
 *   (고용노동부 행정해석: 입사일 기준보다 불리하게 적용 불가)
 */

export type AnnualLeaveBase = "hire_date" | "fiscal_year";

export interface AnnualLeaveResult {
  totalDays: number; // 발생 연차일수
  basis: AnnualLeaveBase; // 기산 기준
  period: string; // 적용 기간 (예: "2026.03.15 ~ 2027.03.14")
  serviceYears: number; // 근속년수
  breakdown: string; // 산정 근거 설명
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 두 날짜 사이의 완전한 개월 수 계산
 */
function fullMonthsBetween(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months--;
  return Math.max(0, months);
}

/**
 * 두 날짜 사이의 만 근속년수 계산
 */
function fullYearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const anniversary = new Date(
    from.getFullYear() + years,
    from.getMonth(),
    from.getDate(),
  );
  if (anniversary > to) years--;
  return Math.max(0, years);
}

/**
 * 근로기준법 제60조 ④항: 가산 연차 계산
 * 3년 이상 근속 시, 최초 1년 초과 계속근로연수 매 2년에 1일 가산
 *
 * 근속년수 → 연차일수:
 * 1년: 15일, 2년: 15일, 3년: 16일, 4년: 16일, 5년: 17일 ...
 * 공식: 15 + floor((근속년수 - 1) / 2), 최대 25일
 */
function calcStandardLeave(serviceYears: number): number {
  if (serviceYears < 1) return 0;
  const extra = Math.max(0, Math.floor((serviceYears - 1) / 2));
  return Math.min(25, 15 + extra);
}

/**
 * 입사일 기준 연차 계산
 *
 * 해당 연도에 해당하는 입사일 기준 주기(anniversary period)의 연차를 계산
 */
export function calcByHireDate(
  hireDate: string,
  targetYear: number,
): AnnualLeaveResult {
  const hire = new Date(hireDate + "T00:00:00");
  const hireY = hire.getFullYear();
  const hireM = hire.getMonth();
  const hireD = hire.getDate();

  // 조회 대상 연도의 입사일 기준 주기 시작일 결정
  // 예: 입사 2024-03-15, targetYear=2026 → 2026-03-15 ~ 2027-03-14 (3년차)
  // 해당 연도에 걸치는 주기의 시작점
  let periodStartYear = targetYear;
  const testDate = new Date(targetYear, hireM, hireD);
  const yearEnd = new Date(targetYear, 11, 31);

  // 입사 기념일이 해당 연도 내에 있는 경우, 그 주기를 기준으로
  // 아직 입사 기념일이 지나지 않은 경우 이전 주기
  if (testDate > yearEnd) {
    periodStartYear = targetYear; // 기념일이 다음해에 있으므로 이전 주기 사용
  }

  // 해당 연도에 적용되는 가장 최근 입사 기념일 기준
  let periodStart = new Date(periodStartYear, hireM, hireD);
  if (periodStart > yearEnd) {
    periodStart = new Date(periodStartYear - 1, hireM, hireD);
  }

  const periodEnd = new Date(periodStart.getFullYear() + 1, hireM, hireD - 1);
  const serviceYears = fullYearsBetween(hire, periodStart);

  // 입사 1년 미만: 제60조 ②항 — 1개월 개근 시 1일 (최대 11일)
  if (serviceYears < 1) {
    // 입사일부터 해당 연도 말까지의 개월수
    const endOfCheck =
      yearEnd < new Date(hireY + 1, hireM, hireD - 1)
        ? yearEnd
        : new Date(hireY + 1, hireM, hireD - 1);
    const months = fullMonthsBetween(hire, endOfCheck);
    const days = Math.min(11, months);
    const pStart = `${hire.getFullYear()}.${String(hire.getMonth() + 1).padStart(2, "0")}.${String(hire.getDate()).padStart(2, "0")}`;
    const pEnd = `${endOfCheck.getFullYear()}.${String(endOfCheck.getMonth() + 1).padStart(2, "0")}.${String(endOfCheck.getDate()).padStart(2, "0")}`;

    return {
      totalDays: days,
      basis: "hire_date",
      period: `${pStart} ~ ${pEnd}`,
      serviceYears: 0,
      breakdown: `근로기준법 제60조 ②항: 1년 미만 근로자, ${months}개월 개근 시 ${days}일 (최대 11일)`,
    };
  }

  // 1년 이상: 제60조 ①④항
  const days = calcStandardLeave(serviceYears);
  const extra = days - 15;
  const formatD = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

  let breakdown = `근로기준법 제60조 ①항: ${serviceYears}년 근속, 기본 15일`;
  if (extra > 0) {
    breakdown += ` + 제60조 ④항: 가산 ${extra}일 (매 2년마다 1일, 최대 25일)`;
  }
  breakdown += ` = ${days}일`;

  return {
    totalDays: days,
    basis: "hire_date",
    period: `${formatD(periodStart)} ~ ${formatD(periodEnd)}`,
    serviceYears,
    breakdown,
  };
}

/**
 * 회계연도 기준 연차 계산
 *
 * 고용노동부 행정해석 기준:
 * - 입사년도: 입사월~12/31, 제60조 ②항 적용 (1개월 개근 시 1일)
 * - 2차년도(다음 1/1~): 전년도 재직 기간에 비례하여 15일 비례배분
 *   → 15 × (전년도 재직개월수 / 12), 소수점 이하 올림 (근로자 유리 원칙)
 * - 3차년도 이후: 입사일 기준 만 근속년수로 제60조 ①④항 적용
 *
 * ※ 입사일 기준보다 불리하면 입사일 기준 적용 (유리한 조건 원칙)
 */
export function calcByFiscalYear(
  hireDate: string,
  targetYear: number,
): AnnualLeaveResult {
  const hire = new Date(hireDate + "T00:00:00");
  const hireY = hire.getFullYear();

  const periodStart = `${targetYear}.01.01`;
  const periodEnd = `${targetYear}.12.31`;

  // 입사년도인 경우: 제60조 ②항
  if (targetYear === hireY) {
    const endOfYear = new Date(hireY, 11, 31);
    const months = fullMonthsBetween(hire, endOfYear);
    const days = Math.min(11, months);

    return {
      totalDays: days,
      basis: "fiscal_year",
      period: `${hire.getFullYear()}.${String(hire.getMonth() + 1).padStart(2, "0")}.${String(hire.getDate()).padStart(2, "0")} ~ ${periodEnd}`,
      serviceYears: 0,
      breakdown: `근로기준법 제60조 ②항 (입사년도): ${months}개월 개근 시 ${days}일 (최대 11일)`,
    };
  }

  // 2차년도 (입사 다음해): 비례배분
  if (targetYear === hireY + 1) {
    // 전년도 재직 개월수
    const prevYearEnd = new Date(hireY, 11, 31);
    const workedMonths = fullMonthsBetween(hire, prevYearEnd);
    // 비례배분: 15 × 재직월수/12, 소수점 이하 올림 (근로자 유리)
    const proportional = Math.ceil((15 * workedMonths) / 12);

    // 입사일 기준과 비교하여 유리한 쪽 적용
    const hireDateResult = calcByHireDate(hireDate, targetYear);
    const days = Math.max(proportional, hireDateResult.totalDays);

    let breakdown = `근로기준법 제60조 ①항 (회계연도 2차년도): 15일 × ${workedMonths}개월/12 = ${proportional}일 (올림)`;
    if (days > proportional) {
      breakdown += ` → 입사일 기준(${hireDateResult.totalDays}일)이 유리하므로 ${days}일 적용`;
    }

    return {
      totalDays: days,
      basis: "fiscal_year",
      period: `${periodStart} ~ ${periodEnd}`,
      serviceYears: 1,
      breakdown,
    };
  }

  // 3차년도 이후: 정상 적용
  // 해당 연도 1/1 기준 만 근속년수
  const jan1 = new Date(targetYear, 0, 1);
  const serviceYears = fullYearsBetween(hire, jan1);
  const fiscalDays = calcStandardLeave(serviceYears);

  // 입사일 기준과 비교 (유리한 조건 원칙)
  const hireDateResult = calcByHireDate(hireDate, targetYear);
  const days = Math.max(fiscalDays, hireDateResult.totalDays);
  const extra = fiscalDays - 15;

  let breakdown = `근로기준법 제60조 ①항: ${serviceYears}년 근속, 기본 15일`;
  if (extra > 0) {
    breakdown += ` + 제60조 ④항: 가산 ${extra}일`;
  }
  breakdown += ` = ${fiscalDays}일`;
  if (days > fiscalDays) {
    breakdown += ` → 입사일 기준(${hireDateResult.totalDays}일)이 유리하므로 ${days}일 적용`;
  }

  return {
    totalDays: days,
    basis: "fiscal_year",
    period: `${periodStart} ~ ${periodEnd}`,
    serviceYears,
    breakdown,
  };
}

/**
 * 연차 계산 메인 함수
 */
export function calculateAnnualLeave(
  hireDate: string,
  targetYear: number,
  basis: AnnualLeaveBase = "hire_date",
): AnnualLeaveResult {
  if (!hireDate) {
    return {
      totalDays: 15,
      basis,
      period: `${targetYear}.01.01 ~ ${targetYear}.12.31`,
      serviceYears: 0,
      breakdown: "입사일 미입력 — 기본 15일 적용",
    };
  }

  if (basis === "fiscal_year") {
    return calcByFiscalYear(hireDate, targetYear);
  }
  return calcByHireDate(hireDate, targetYear);
}
