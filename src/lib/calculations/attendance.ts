/**
 * 근태관리 모듈
 *
 * 법적 근거:
 * - 근로기준법 제50조: 1주간 근로시간 40시간 초과 금지
 * - 근로기준법 제53조: 연장근로 한도 (1주 12시간)
 * - 근로기준법 제54조: 휴게시간 (4시간당 30분, 8시간당 1시간)
 * - 근로기준법 제56조: 연장·야간·휴일 근로 가산임금
 * - 근로기준법 제66조: 근로시간 기록·보존 의무 (3년)
 * - 근로기준법 시행령 제27조의2: 근로시간 기록 방법
 */

export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  breakMinutes: number; // 휴게시간 (분)
  status: AttendanceStatus;
  overtimeMinutes: number; // 연장근로 (분)
  nightMinutes: number; // 야간근로 (분, 22:00~06:00)
  holidayWork: boolean; // 휴일근로 여부
  note?: string;
}

export type AttendanceStatus =
  | "present" // 출근
  | "absent" // 결근
  | "late" // 지각
  | "early_leave" // 조퇴
  | "half_day_am" // 오전 반차
  | "half_day_pm" // 오후 반차
  | "annual_leave" // 연차
  | "sick_leave" // 병가
  | "special_leave" // 특별휴가
  | "holiday" // 공휴일/주휴일
  | "remote"; // 재택근무

export interface WeeklyOvertimeSummary {
  weekStartDate: string; // 주 시작일 (월요일)
  weekEndDate: string;
  totalWorkMinutes: number;
  prescribedMinutes: number; // 소정근로시간
  overtimeMinutes: number;
  maxOvertimeMinutes: number; // 법정 한도 (720분 = 12시간)
  isOverLimit: boolean;
  remainingMinutes: number;
  warning?: string;
}

export interface MonthlyAttendanceSummary {
  year: number;
  month: number;
  employeeId: string;
  totalWorkDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  annualLeaveDays: number;
  sickLeaveDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  totalNightHours: number;
  totalHolidayWorkHours: number;
  attendanceRate: number; // 출근율 (%)
  weeklyOvertimeSummaries: WeeklyOvertimeSummary[];
}

const NIGHT_START = 22 * 60; // 22:00 in minutes
const NIGHT_END = 6 * 60; // 06:00 in minutes
const MAX_WEEKLY_OVERTIME = 12 * 60; // 12시간 = 720분
const PRESCRIBED_DAILY_HOURS = 8 * 60; // 8시간 = 480분

/**
 * HH:mm 문자열을 분 단위로 변환
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 분을 시간:분 형식으로 변환
 */
export function minutesToHoursString(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${h}시간 ${m}분`;
}

/**
 * 실 근로시간 계산 (출근~퇴근 - 휴게시간)
 */
export function calculateWorkMinutes(
  checkIn: string,
  checkOut: string,
  breakMinutes: number,
): number {
  const inMin = timeToMinutes(checkIn);
  let outMin = timeToMinutes(checkOut);

  // 자정 넘기는 경우
  if (outMin <= inMin) outMin += 24 * 60;

  return Math.max(0, outMin - inMin - breakMinutes);
}

/**
 * 야간근로시간 계산 (22:00 ~ 06:00)
 */
export function calculateNightMinutes(
  checkIn: string,
  checkOut: string,
  breakMinutes: number,
): number {
  const inMin = timeToMinutes(checkIn);
  let outMin = timeToMinutes(checkOut);
  if (outMin <= inMin) outMin += 24 * 60;

  let nightMin = 0;

  // 22:00 ~ 24:00 (당일 야간)
  if (outMin > NIGHT_START) {
    const nightStart = Math.max(inMin, NIGHT_START);
    const nightEnd = Math.min(outMin, 24 * 60);
    nightMin += Math.max(0, nightEnd - nightStart);
  }

  // 00:00 ~ 06:00 (익일 야간)
  if (outMin > 24 * 60) {
    const nightStart = 24 * 60; // 00:00 of next day
    const nightEnd = Math.min(outMin, 24 * 60 + NIGHT_END);
    nightMin += Math.max(0, nightEnd - nightStart);
  }

  // 06:00 이전 출근인 경우
  if (inMin < NIGHT_END) {
    const earlyNight = Math.min(NIGHT_END, outMin) - inMin;
    nightMin += Math.max(0, earlyNight);
  }

  // 휴게시간 비례 공제 (야간 비율)
  const totalWork = Math.max(1, outMin - inMin);
  const nightRatio = nightMin / totalWork;
  nightMin -= Math.round(breakMinutes * nightRatio);

  return Math.max(0, nightMin);
}

/**
 * 연장근로시간 계산 (소정근로시간 초과분)
 */
export function calculateOvertimeMinutes(
  workMinutes: number,
  prescribedMinutes: number = PRESCRIBED_DAILY_HOURS,
): number {
  return Math.max(0, workMinutes - prescribedMinutes);
}

/**
 * 출퇴근 기록으로 AttendanceRecord 생성
 */
export function createAttendanceRecord(
  employeeId: string,
  date: string,
  checkIn: string,
  checkOut: string,
  breakMinutes: number,
  isHoliday: boolean = false,
  prescribedMinutes: number = PRESCRIBED_DAILY_HOURS,
): AttendanceRecord {
  const workMinutes = calculateWorkMinutes(checkIn, checkOut, breakMinutes);
  const nightMin = calculateNightMinutes(checkIn, checkOut, breakMinutes);
  const overtimeMin = calculateOvertimeMinutes(workMinutes, prescribedMinutes);

  // 지각 판단 (09:00 이후 출근, 소정 시작시간 기준)
  const checkInMin = timeToMinutes(checkIn);
  const isLate = checkInMin > 9 * 60; // 기본 09:00 기준

  let status: AttendanceStatus = "present";
  if (isHoliday) status = "holiday";
  else if (isLate) status = "late";

  return {
    employeeId,
    date,
    checkIn,
    checkOut,
    breakMinutes,
    status,
    overtimeMinutes: overtimeMin,
    nightMinutes: nightMin,
    holidayWork: isHoliday && workMinutes > 0,
    note: undefined,
  };
}

/**
 * 주간 연장근로 합산 및 한도 체크
 *
 * 근로기준법 제53조: 당사자 합의 시 1주 12시간 한도로 연장근로 가능
 */
export function calculateWeeklyOvertime(
  records: AttendanceRecord[],
  weekStartDate: string,
): WeeklyOvertimeSummary {
  const start = new Date(weekStartDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const weekEndDate = end.toISOString().split("T")[0];

  const weekRecords = records.filter(
    (r) => r.date >= weekStartDate && r.date <= weekEndDate,
  );

  const totalWorkMinutes = weekRecords.reduce((sum, r) => {
    if (!r.checkIn || !r.checkOut) return sum;
    return sum + calculateWorkMinutes(r.checkIn, r.checkOut, r.breakMinutes);
  }, 0);

  const prescribedMinutes = 40 * 60; // 주 40시간
  const overtimeMinutes = Math.max(0, totalWorkMinutes - prescribedMinutes);
  const remainingMinutes = Math.max(0, MAX_WEEKLY_OVERTIME - overtimeMinutes);
  const isOverLimit = overtimeMinutes > MAX_WEEKLY_OVERTIME;

  let warning: string | undefined;
  if (isOverLimit) {
    warning = `⚠️ 주간 연장근로 한도 초과! ${minutesToHoursString(overtimeMinutes)} / ${minutesToHoursString(MAX_WEEKLY_OVERTIME)} (초과: ${minutesToHoursString(overtimeMinutes - MAX_WEEKLY_OVERTIME)})`;
  } else if (remainingMinutes < 2 * 60) {
    warning = `⚡ 주간 연장근로 잔여: ${minutesToHoursString(remainingMinutes)} (한도 근접)`;
  }

  return {
    weekStartDate,
    weekEndDate,
    totalWorkMinutes,
    prescribedMinutes,
    overtimeMinutes,
    maxOvertimeMinutes: MAX_WEEKLY_OVERTIME,
    isOverLimit,
    remainingMinutes,
    warning,
  };
}

/**
 * 월간 근태 요약
 */
export function calculateMonthlyAttendance(
  records: AttendanceRecord[],
  year: number,
  month: number,
  employeeId: string,
): MonthlyAttendanceSummary {
  const monthRecords = records.filter(
    (r) =>
      r.employeeId === employeeId &&
      r.date.startsWith(`${year}-${String(month).padStart(2, "0")}`),
  );

  const presentDays = monthRecords.filter((r) =>
    ["present", "late", "remote"].includes(r.status),
  ).length;
  const absentDays = monthRecords.filter((r) => r.status === "absent").length;
  const lateDays = monthRecords.filter((r) => r.status === "late").length;
  const earlyLeaveDays = monthRecords.filter(
    (r) => r.status === "early_leave",
  ).length;
  const annualLeaveDays = monthRecords.filter((r) =>
    ["annual_leave", "half_day_am", "half_day_pm"].includes(r.status),
  ).length;
  const sickLeaveDays = monthRecords.filter(
    (r) => r.status === "sick_leave",
  ).length;

  const totalWorkMinutes = monthRecords.reduce((sum, r) => {
    if (!r.checkIn || !r.checkOut) return sum;
    return sum + calculateWorkMinutes(r.checkIn, r.checkOut, r.breakMinutes);
  }, 0);

  const totalOvertimeMinutes = monthRecords.reduce(
    (sum, r) => sum + r.overtimeMinutes,
    0,
  );
  const totalNightMinutes = monthRecords.reduce(
    (sum, r) => sum + r.nightMinutes,
    0,
  );
  const totalHolidayMinutes = monthRecords
    .filter((r) => r.holidayWork)
    .reduce((sum, r) => {
      if (!r.checkIn || !r.checkOut) return sum;
      return sum + calculateWorkMinutes(r.checkIn, r.checkOut, r.breakMinutes);
    }, 0);

  const totalWorkDays = presentDays + annualLeaveDays;
  const expectedDays =
    presentDays + absentDays + annualLeaveDays + sickLeaveDays;
  const attendanceRate =
    expectedDays > 0
      ? Math.round(
          ((presentDays + annualLeaveDays) / expectedDays) * 100 * 10,
        ) / 10
      : 100;

  // 주간별 연장근로 계산
  const weeklyOvertimeSummaries: WeeklyOvertimeSummary[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 해당 월의 모든 월요일 찾기
  let current = new Date(firstDay);
  // 첫 번째 월요일로 이동
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() - 1);
  }

  while (current <= lastDay) {
    const weekStart = current.toISOString().split("T")[0];
    weeklyOvertimeSummaries.push(calculateWeeklyOvertime(records, weekStart));
    current.setDate(current.getDate() + 7);
  }

  return {
    year,
    month,
    employeeId,
    totalWorkDays,
    presentDays,
    absentDays,
    lateDays,
    earlyLeaveDays,
    annualLeaveDays,
    sickLeaveDays,
    totalWorkHours: Math.round((totalWorkMinutes / 60) * 10) / 10,
    totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
    totalNightHours: Math.round((totalNightMinutes / 60) * 10) / 10,
    totalHolidayWorkHours: Math.round((totalHolidayMinutes / 60) * 10) / 10,
    attendanceRate,
    weeklyOvertimeSummaries,
  };
}

/**
 * 휴게시간 법정 최소 기준 검증
 * 근로기준법 제54조: 4시간당 30분, 8시간당 1시간
 */
export function validateBreakTime(
  workMinutes: number,
  breakMinutes: number,
): {
  isValid: boolean;
  requiredMinutes: number;
  message?: string;
} {
  let requiredMinutes = 0;
  if (workMinutes > 8 * 60) {
    requiredMinutes = 60;
  } else if (workMinutes > 4 * 60) {
    requiredMinutes = 30;
  }

  const isValid = breakMinutes >= requiredMinutes;

  return {
    isValid,
    requiredMinutes,
    message: isValid
      ? undefined
      : `⚠️ 휴게시간 부족: ${breakMinutes}분 < 법정 최소 ${requiredMinutes}분 (근기법 §54)`,
  };
}

/**
 * 출근율 계산 (연차 발생 기준: 80%)
 * 근로기준법 제60조 ①항
 */
export function calculateAttendanceRateForAnnualLeave(
  summary: MonthlyAttendanceSummary[],
): { rate: number; isEligible: boolean; message: string } {
  const totalExpected = summary.reduce(
    (sum, s) =>
      sum + s.presentDays + s.absentDays + s.annualLeaveDays + s.sickLeaveDays,
    0,
  );
  const totalPresent = summary.reduce(
    (sum, s) => sum + s.presentDays + s.annualLeaveDays,
    0,
  );

  const rate =
    totalExpected > 0
      ? Math.round((totalPresent / totalExpected) * 100 * 10) / 10
      : 0;
  const isEligible = rate >= 80;

  return {
    rate,
    isEligible,
    message: isEligible
      ? `출근율 ${rate}% — 연차 발생 요건 충족 (80% 이상)`
      : `출근율 ${rate}% — 연차 발생 요건 미충족 (80% 미만, 근기법 §60①)`,
  };
}
